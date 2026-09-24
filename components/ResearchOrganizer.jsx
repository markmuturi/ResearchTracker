'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2, Circle, Clock, AlertCircle, Plus, Trash2,
  ExternalLink, Upload, FileText, Download, X, Save, RefreshCw,
  FolderOpen, FilePlus2, Search, Pencil, ChevronDown, ChevronUp,
  AlertTriangle, Check
} from 'lucide-react';
import Image from 'next/image';
import ResearchlyLogo from '@/assets/ResearchlyLogo.webp';
import Link from 'next/link';
import { newFileId, saveFileBlob, getFileBlob, deleteFileBlob } from '@/lib/fileStore';

const STORAGE_KEY = 'researchItems';
const PROJECTS_KEY = 'researchProjects';
const ACTIVE_PROJECT_KEY = 'activeProject';

const genId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

// This component is only ever mounted client-side (see app/ResearchOrganizer/page.js,
// which loads it with next/dynamic and ssr:false), so `window`/`localStorage` are
// always available here — no need to gate rendering behind a "mounted" flag.
const readItemsFor = (projectId) => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY}_${projectId}`);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
};

const readActiveProjectId = () => {
  if (typeof window === 'undefined') return 'default';
  return localStorage.getItem(ACTIVE_PROJECT_KEY) || 'default';
};

const TABS = [
  { key: 'priority', label: 'Priority' },
  { key: 'category', label: 'Category' },
  { key: 'pending', label: 'Pending' },
  { key: 'in-progress', label: 'In Progress' },
  { key: 'complete', label: 'Complete' },
];

const priorityDot = {
  1: 'bg-red-500',
  2: 'bg-yellow-500',
  3: 'bg-green-500'
};

const priorityLabel = {
  1: 'P1',
  2: 'P2',
  3: 'P3'
};

const statusMeta = {
  pending: { label: 'Pending', icon: Circle, classes: 'bg-black/5 text-black/60' },
  'in-progress': { label: 'In Progress', icon: Clock, classes: 'bg-blue-50 text-blue-600' },
  complete: { label: 'Complete', icon: CheckCircle2, classes: 'bg-green-50 text-green-600' },
  blocked: { label: 'Blocked', icon: AlertCircle, classes: 'bg-red-50 text-red-600' }
};

const ResearchOrganizer = () => {
  const [activeTab, setActiveTab] = useState('priority');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [toast, setToast] = useState(null);

  // Project Management
  const [projects, setProjects] = useState(() => {
    if (typeof window === 'undefined') return [];
    const saved = localStorage.getItem(PROJECTS_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        return [];
      }
    }
    return [{
      id: 'default',
      name: 'My Research Project',
      description: 'Default research project',
      createdAt: new Date().toISOString()
    }];
  });

  const [activeProject, setActiveProject] = useState(readActiveProjectId);
  const [newProject, setNewProject] = useState({ name: '', description: '' });
  const [researchItems, setResearchItems] = useState(() => readItemsFor(readActiveProjectId()));
  const [showAddForm, setShowAddForm] = useState(() => readItemsFor(readActiveProjectId()).length === 0);

  const [newItem, setNewItem] = useState({
    question: '',
    category: '',
    priority: 1,
    sources: '',
    scriptSection: ''
  });

  const notify = (message, type = 'info') => setToast({ message, type });

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  // Save projects list
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
  }, [projects]);

  // Persist which project is active
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(ACTIVE_PROJECT_KEY, activeProject);
    }
  }, [activeProject]);

  // Auto-save research items (debounced)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        localStorage.setItem(`${STORAGE_KEY}_${activeProject}`, JSON.stringify(researchItems));
        setSaveStatus('saved');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [researchItems, activeProject]);

  const askConfirm = ({ title, message, confirmLabel = 'Confirm', danger = false, onConfirm }) => {
    setConfirmDialog({ title, message, confirmLabel, danger, onConfirm });
  };

  // Project Management Functions
  const createProject = () => {
    if (!newProject.name.trim()) {
      notify('Please enter a project name', 'error');
      return;
    }

    const project = {
      id: genId(),
      name: newProject.name,
      description: newProject.description,
      createdAt: new Date().toISOString()
    };

    setProjects([...projects, project]);
    setActiveProject(project.id);
    setResearchItems([]);
    setShowAddForm(true);
    setActiveTab('priority');
    setSearchQuery('');
    setCategoryFilter('all');
    setNewProject({ name: '', description: '' });
    setShowNewProjectModal(false);
  };

  const switchProject = (projectId) => {
    const items = readItemsFor(projectId);
    setActiveProject(projectId);
    setResearchItems(items);
    setShowAddForm(items.length === 0);
    setShowProjectManager(false);
    setActiveTab('priority');
    setSearchQuery('');
    setCategoryFilter('all');
  };

  const deleteProject = (projectId) => {
    if (projects.length === 1) {
      notify('Cannot delete the last project', 'error');
      return;
    }

    askConfirm({
      title: 'Delete project',
      message: 'This deletes the project and all its research data, including attached files. This cannot be undone.',
      confirmLabel: 'Delete project',
      danger: true,
      onConfirm: async () => {
        // Clean up any attached file blobs for this project's items
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem(`${STORAGE_KEY}_${projectId}`);
          if (saved) {
            try {
              const items = JSON.parse(saved);
              for (const item of items) {
                for (const f of item.files || []) {
                  await deleteFileBlob(f.id);
                }
              }
            } catch (e) { /* ignore parse errors */ }
          }
          localStorage.removeItem(`${STORAGE_KEY}_${projectId}`);
        }

        const remaining = projects.filter(p => p.id !== projectId);
        setProjects(remaining);

        if (projectId === activeProject) {
          const nextProject = remaining[0];
          const items = readItemsFor(nextProject.id);
          setActiveProject(nextProject.id);
          setResearchItems(items);
          setShowAddForm(items.length === 0);
        }
        notify('Project deleted', 'success');
      }
    });
  };

  const duplicateProject = (projectId) => {
    const projectToDuplicate = projects.find(p => p.id === projectId);
    if (!projectToDuplicate) return;

    const newProjectId = genId();
    const duplicatedProject = {
      ...projectToDuplicate,
      id: newProjectId,
      name: `${projectToDuplicate.name} (Copy)`,
      createdAt: new Date().toISOString()
    };

    setProjects([...projects, duplicatedProject]);

    if (typeof window !== 'undefined') {
      const originalData = localStorage.getItem(`${STORAGE_KEY}_${projectId}`);
      if (originalData) {
        localStorage.setItem(`${STORAGE_KEY}_${newProjectId}`, originalData);
      }
    }

    notify('Project duplicated', 'success');
  };

  const exportProject = () => {
    const currentProject = projects.find(p => p.id === activeProject);
    const exportData = {
      project: currentProject,
      items: researchItems.map(({ files, ...rest }) => rest), // file blobs live in IndexedDB, not included
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentProject.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    notify('Exported (note: attached files are not included in JSON export)', 'info');
  };

  const importProject = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (data.project && data.items) {
          const newProjectId = genId();
          const importedProject = {
            ...data.project,
            id: newProjectId,
            name: `${data.project.name} (Imported)`,
            createdAt: new Date().toISOString()
          };

          setProjects([...projects, importedProject]);

          if (typeof window !== 'undefined') {
            localStorage.setItem(`${STORAGE_KEY}_${newProjectId}`, JSON.stringify(data.items));
          }

          setActiveProject(newProjectId);
          setResearchItems(data.items);
          setShowAddForm(data.items.length === 0);
          setActiveTab('priority');
          setSearchQuery('');
          setCategoryFilter('all');
          notify('Project imported', 'success');
        } else {
          notify('Invalid project file format', 'error');
        }
      } catch (error) {
        notify('Error importing project — check the file format', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // Research Item Functions
  const updateStatus = (id, newStatus) => {
    setResearchItems(items =>
      items.map(item =>
        item.id === id ? { ...item, status: newStatus } : item
      )
    );
  };

  const updateNotes = (id, notes) => {
    setResearchItems(items =>
      items.map(item =>
        item.id === id ? { ...item, notes } : item
      )
    );
  };

  const addResearchItem = () => {
    if (!newItem.question || !newItem.category) {
      notify('Please fill in both question and category', 'error');
      return;
    }

    const item = {
      id: genId(),
      priority: parseInt(newItem.priority),
      category: newItem.category,
      question: newItem.question,
      sources: newItem.sources.split(',').map(s => s.trim()).filter(Boolean),
      status: 'pending',
      notes: '',
      scriptSection: newItem.scriptSection,
      files: []
    };

    setResearchItems([...researchItems, item]);
    setNewItem({ question: '', category: '', priority: 1, sources: '', scriptSection: '' });
    notify('Research item added', 'success');
  };

  const deleteItem = (id) => {
    askConfirm({
      title: 'Delete research item',
      message: 'This deletes the item, its notes, and any attached files. This cannot be undone.',
      confirmLabel: 'Delete item',
      danger: true,
      onConfirm: async () => {
        const item = researchItems.find(i => i.id === id);
        for (const f of item?.files || []) {
          await deleteFileBlob(f.id);
        }
        setResearchItems(items => items.filter(item => item.id !== id));
      }
    });
  };

  // Inline edit of question/category/priority/sources
  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditDraft({
      question: item.question,
      category: item.category,
      priority: item.priority,
      sources: (item.sources || []).join(', ')
    });
  };

  const cancelEditItem = () => {
    setEditingItemId(null);
    setEditDraft(null);
  };

  const saveEditItem = (id) => {
    if (!editDraft.question.trim() || !editDraft.category.trim()) {
      notify('Question and category cannot be empty', 'error');
      return;
    }
    setResearchItems(items =>
      items.map(item =>
        item.id === id
          ? {
            ...item,
            question: editDraft.question.trim(),
            category: editDraft.category.trim(),
            priority: parseInt(editDraft.priority),
            sources: editDraft.sources.split(',').map(s => s.trim()).filter(Boolean)
          }
          : item
      )
    );
    setEditingItemId(null);
    setEditDraft(null);
  };

  const handleFileUpload = (itemId, event) => {
    const files = Array.from(event.target.files);

    files.forEach(async (file) => {
      const id = newFileId();
      try {
        await saveFileBlob(id, file);
        const fileMeta = {
          id,
          name: file.name,
          size: file.size,
          type: file.type,
          uploadDate: new Date().toISOString()
        };
        setResearchItems(items =>
          items.map(item =>
            item.id === itemId
              ? { ...item, files: [...(item.files || []), fileMeta] }
              : item
          )
        );
      } catch (err) {
        notify(`Could not save ${file.name}`, 'error');
      }
    });
    event.target.value = '';
  };

  const removeFile = async (itemId, fileIndex) => {
    const item = researchItems.find(i => i.id === itemId);
    const file = item?.files?.[fileIndex];
    if (file) {
      await deleteFileBlob(file.id);
    }
    setResearchItems(items =>
      items.map(item =>
        item.id === itemId
          ? { ...item, files: item.files.filter((_, idx) => idx !== fileIndex) }
          : item
      )
    );
  };

  const downloadFile = async (file) => {
    try {
      const blob = await getFileBlob(file.id);
      if (!blob) {
        notify('File data not found — it may have been cleared from this browser', 'error');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      notify('Could not download file', 'error');
    }
  };

  const exportByCategory = (category) => {
    const categoryItems = researchItems
      .filter(item => item.category === category)
      .map(({ files, ...rest }) => rest);
    const exportData = {
      category,
      exportDate: new Date().toISOString(),
      items: categoryItems
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${category.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const categories = [...new Set(researchItems.map(item => item.category))];

  const getFilteredItems = () => {
    let items = [...researchItems];

    if (activeTab === 'priority') {
      items = items.sort((a, b) => a.priority - b.priority);
    } else if (activeTab === 'category') {
      items = items.sort((a, b) => a.category.localeCompare(b.category));
    } else {
      items = items.filter(item => item.status === activeTab);
    }

    if (categoryFilter !== 'all') {
      items = items.filter(item => item.category === categoryFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      items = items.filter(item =>
        item.question.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.notes || '').toLowerCase().includes(q) ||
        (item.scriptSection || '').toLowerCase().includes(q)
      );
    }

    return items;
  };

  const stats = [
    { label: 'Total', value: researchItems.length, dot: 'bg-black/30' },
    { label: 'Completed', value: researchItems.filter(i => i.status === 'complete').length, dot: 'bg-green-500' },
    { label: 'In Progress', value: researchItems.filter(i => i.status === 'in-progress').length, dot: 'bg-blue-500' },
    { label: 'Pending', value: researchItems.filter(i => i.status === 'pending').length, dot: 'bg-black/20' }
  ];

  const currentProject = projects.find(p => p.id === activeProject);
  const filteredItems = getFilteredItems();

  return (
    <div className="min-h-screen bg-surface text-ink">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <button
            onClick={() => setShowProjectManager(!showProjectManager)}
            className="flex items-center gap-1.5 text-[13px] font-medium text-ink/70 hover:text-ink bg-black/[0.04] hover:bg-black/[0.07] px-3 py-1.5 rounded-full transition-colors"
          >
            <FolderOpen size={14} />
            Projects
          </button>

          <Link href="/" className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <Image
              src={ResearchlyLogo}
              alt="Researchly"
              width={22}
              priority
              className="rounded-sm"
            />
            <span className="text-[13px] font-semibold tracking-tight hidden sm:inline">Researchly</span>
          </Link>

          <span className="text-[12px] text-muted flex items-center gap-1.5">
            {saveStatus === 'saving' ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Saving
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                Saved
              </>
            )}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight">{currentProject?.name}</h1>
          {currentProject?.description && (
            <p className="text-muted text-[15px] mt-1">{currentProject.description}</p>
          )}
        </div>

        {/* Project Manager Panel */}
        {showProjectManager && (
          <div className="bg-white border border-black/5 rounded-2xl shadow-sm p-6 mb-6 animate-modal-in">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-semibold tracking-tight">Projects</h2>
              <button
                onClick={() => setShowNewProjectModal(true)}
                className="bg-ink text-white px-3.5 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 hover:bg-black transition-colors"
              >
                <Plus size={14} />
                New Project
              </button>
            </div>

            <div className="space-y-2">
              {projects.map(project => (
                <div
                  key={project.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    project.id === activeProject ? 'border-accent/30 bg-accent/5' : 'border-black/5 bg-white'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[15px]">{project.name}</h3>
                      {project.description && (
                        <p className="text-[13px] text-muted mt-0.5">{project.description}</p>
                      )}
                      <p className="text-[11px] text-muted/80 mt-1.5">
                        Created {new Date(project.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      {project.id !== activeProject && (
                        <button
                          onClick={() => switchProject(project.id)}
                          className="text-accent hover:bg-accent/10 px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors"
                        >
                          Switch
                        </button>
                      )}
                      <button
                        onClick={() => duplicateProject(project.id)}
                        className="text-ink/60 hover:bg-black/[0.06] px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors"
                      >
                        Duplicate
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={() => deleteProject(project.id)}
                          className="text-red-600 hover:bg-red-50 px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-5 border-t border-black/5 flex gap-2 flex-wrap">
              <button
                onClick={exportProject}
                className="bg-black/[0.04] hover:bg-black/[0.07] text-ink px-4 py-2 text-[13px] font-medium rounded-full flex items-center gap-2 transition-colors"
              >
                <Download size={14} />
                Export Current Project
              </button>
              <label className="bg-black/[0.04] hover:bg-black/[0.07] text-ink px-4 py-2 text-[13px] font-medium rounded-full flex items-center gap-2 cursor-pointer transition-colors">
                <Upload size={14} />
                Import Project
                <input type="file" accept=".json" onChange={importProject} className="hidden" />
              </label>
            </div>
          </div>
        )}

        {/* New Project Modal */}
        {showNewProjectModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-7 max-w-md w-full shadow-2xl shadow-black/20 animate-modal-in">
              <h2 className="text-xl font-semibold tracking-tight mb-5">Create New Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-[13px] font-medium text-ink/70 mb-1.5">Project Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Video Essay Research, Thesis Project"
                    className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-shadow"
                    value={newProject.name}
                    onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-ink/70 mb-1.5">Description (optional)</label>
                  <textarea
                    placeholder="Brief description of your research project"
                    className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-shadow"
                    rows="3"
                    value={newProject.description}
                    onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={createProject}
                    className="flex-1 bg-accent text-white px-4 py-2.5 rounded-full text-[14px] font-medium hover:bg-accent-hover transition-colors"
                  >
                    Create Project
                  </button>
                  <button
                    onClick={() => {
                      setShowNewProjectModal(false);
                      setNewProject({ name: '', description: '' });
                    }}
                    className="flex-1 bg-black/[0.05] text-ink px-4 py-2.5 rounded-full text-[14px] font-medium hover:bg-black/[0.08] transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {stats.map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-black/5 p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                <span className="text-[12px] text-muted">{s.label}</span>
              </div>
              <div className="text-2xl font-semibold tracking-tight tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        {/* Export by Category */}
        {categories.length > 0 && (
          <div className="bg-white rounded-2xl border border-black/5 p-5 mb-6">
            <h2 className="text-[13px] font-medium text-ink/70 mb-3">Export by category</h2>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => exportByCategory(category)}
                  className="bg-black/[0.04] hover:bg-black/[0.07] text-ink px-3 py-1.5 rounded-full text-[13px] flex items-center gap-1.5 transition-colors"
                >
                  <Download size={12} />
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Add New Item (collapsible) */}
        <div className="bg-white rounded-2xl border border-black/5 mb-6 overflow-hidden">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-black/[0.02] transition-colors"
          >
            <span className="text-[15px] font-medium flex items-center gap-2">
              <Plus size={17} className="text-accent" />
              Add Research Item
            </span>
            {showAddForm ? <ChevronUp size={16} className="text-muted" /> : <ChevronDown size={16} className="text-muted" />}
          </button>

          {showAddForm && (
            <div className="px-5 pb-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Research question"
                  className="border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-shadow"
                  value={newItem.question}
                  onChange={(e) => setNewItem({ ...newItem, question: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Category"
                  className="border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-shadow"
                  value={newItem.category}
                  onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Sources (comma-separated)"
                  className="border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-shadow"
                  value={newItem.sources}
                  onChange={(e) => setNewItem({ ...newItem, sources: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="Section/topic reference"
                  className="border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-shadow"
                  value={newItem.scriptSection}
                  onChange={(e) => setNewItem({ ...newItem, scriptSection: e.target.value })}
                />
                <select
                  className="border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/40 transition-shadow bg-white"
                  value={newItem.priority}
                  onChange={(e) => setNewItem({ ...newItem, priority: e.target.value })}
                >
                  <option value="1">Priority 1 — Essential</option>
                  <option value="2">Priority 2 — Important</option>
                  <option value="3">Priority 3 — Nice to have</option>
                </select>
                <button
                  onClick={addResearchItem}
                  className="bg-ink text-white rounded-xl px-4 py-2.5 flex items-center justify-center gap-2 hover:bg-black transition-colors text-[14px] font-medium"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Search + Category Filter */}
        <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              placeholder="Search questions, categories, notes"
              className="w-full bg-white border border-black/5 rounded-full pl-10 pr-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {categories.length > 0 && (
            <select
              className="bg-white border border-black/5 rounded-full px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
            >
              <option value="all">All categories</option>
              {categories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>

        {/* Tabs — segmented control */}
        <div className="inline-flex bg-black/[0.05] rounded-full p-1 mb-6 flex-wrap gap-1">
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-white text-ink shadow-sm'
                  : 'text-ink/60 hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Research Items */}
        {researchItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
            <FilePlus2 size={40} className="mx-auto text-muted/60 mb-4" strokeWidth={1.5} />
            <h3 className="text-lg font-semibold tracking-tight mb-1.5">No research items yet</h3>
            <p className="text-muted text-[14px]">Get started by adding your first research item above.</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-black/5 p-16 text-center">
            <Search size={36} className="mx-auto text-muted/60 mb-4" strokeWidth={1.5} />
            <h3 className="text-[15px] font-semibold mb-1">No matching items</h3>
            <p className="text-muted text-[14px]">Try a different search term or clear the category filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredItems.map(item => {
              const isEditing = editingItemId === item.id;
              const status = statusMeta[item.status] || statusMeta.pending;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-black/5 p-6 hover:shadow-md hover:shadow-black/5 transition-shadow duration-300"
                >
                  <div className="flex items-start justify-between mb-4 gap-3">
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
                          <input
                            type="text"
                            className="border border-black/10 rounded-lg px-3 py-2 text-[14px] md:col-span-2 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            value={editDraft.question}
                            onChange={(e) => setEditDraft({ ...editDraft, question: e.target.value })}
                            placeholder="Research question"
                          />
                          <input
                            type="text"
                            className="border border-black/10 rounded-lg px-3 py-2 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40"
                            value={editDraft.category}
                            onChange={(e) => setEditDraft({ ...editDraft, category: e.target.value })}
                            placeholder="Category"
                          />
                          <select
                            className="border border-black/10 rounded-lg px-3 py-2 text-[14px] bg-white focus:outline-none focus:ring-2 focus:ring-accent/40"
                            value={editDraft.priority}
                            onChange={(e) => setEditDraft({ ...editDraft, priority: e.target.value })}
                          >
                            <option value="1">Priority 1 — High</option>
                            <option value="2">Priority 2 — Medium</option>
                            <option value="3">Priority 3 — Low</option>
                          </select>
                          <input
                            type="text"
                            className="border border-black/10 rounded-lg px-3 py-2 text-[14px] md:col-span-2 focus:outline-none focus:ring-2 focus:ring-accent/40"
                            value={editDraft.sources}
                            onChange={(e) => setEditDraft({ ...editDraft, sources: e.target.value })}
                            placeholder="Sources (comma-separated)"
                          />
                          <div className="flex gap-2 md:col-span-2">
                            <button
                              onClick={() => saveEditItem(item.id)}
                              className="bg-ink text-white px-3.5 py-1.5 rounded-full text-[13px] font-medium flex items-center gap-1.5 hover:bg-black transition-colors"
                            >
                              <Check size={13} /> Save
                            </button>
                            <button
                              onClick={cancelEditItem}
                              className="bg-black/[0.05] text-ink px-3.5 py-1.5 rounded-full text-[13px] font-medium hover:bg-black/[0.08] transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full bg-black/[0.05] text-ink/70">
                              <span className={`w-1.5 h-1.5 rounded-full ${priorityDot[item.priority]}`} />
                              {priorityLabel[item.priority]}
                            </span>
                            <span className="text-[11px] font-medium px-2 py-1 rounded-full bg-accent/10 text-accent">
                              {item.category}
                            </span>
                            <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${status.classes}`}>
                              <status.icon size={11} />
                              {status.label}
                            </span>
                          </div>
                          <h3 className="text-[16px] font-semibold tracking-tight mb-1">{item.question}</h3>
                          {item.scriptSection && (
                            <p className="text-[13px] text-muted">Reference: {item.scriptSection}</p>
                          )}
                        </>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => startEditItem(item)}
                          className="text-muted hover:text-accent hover:bg-black/[0.05] p-1.5 rounded-full transition-colors"
                          title="Edit item"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-muted hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                          title="Delete item"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>

                  {item.sources.length > 0 && (
                    <div className="mb-4">
                      <p className="text-[12px] font-medium text-muted mb-2">Sources</p>
                      <div className="flex flex-wrap gap-1.5">
                        {item.sources.map((source, idx) => (
                          <span key={idx} className="text-[12px] bg-black/[0.04] text-ink/70 px-2.5 py-1 rounded-full flex items-center gap-1">
                            <ExternalLink size={11} />
                            {source}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-[12px] font-medium text-muted block mb-2">
                      Notes
                    </label>
                    <textarea
                      value={item.notes}
                      onChange={(e) => updateNotes(item.id, e.target.value)}
                      placeholder="Add findings, quotes, data points..."
                      className="w-full border border-black/10 rounded-xl px-3.5 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow"
                      rows="3"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="text-[12px] font-medium text-muted block mb-2">
                      Attached files
                    </label>

                    <div className="mb-2.5">
                      <label className="border-2 border-dashed border-black/10 hover:border-accent/40 hover:bg-accent/5 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                        <Upload size={15} className="text-accent" />
                        <span className="text-[13px] text-ink/70 font-medium">
                          Upload files
                        </span>
                        <input
                          type="file"
                          multiple
                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.csv,.xlsx"
                          onChange={(e) => handleFileUpload(item.id, e)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {item.files && item.files.length > 0 && (
                      <div className="space-y-1.5">
                        {item.files.map((file, idx) => (
                          <div key={idx} className="bg-black/[0.02] border border-black/5 rounded-xl px-3 py-2 flex items-center justify-between">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <FileText size={15} className="text-muted shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium text-ink truncate">{file.name}</p>
                                <p className="text-[11px] text-muted">
                                  {(file.size / 1024).toFixed(1)} KB · {new Date(file.uploadDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => downloadFile(file)}
                                className="text-accent hover:bg-accent/10 p-1.5 rounded-full transition-colors"
                                title="Download file"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                onClick={() => removeFile(item.id, idx)}
                                className="text-muted hover:text-red-600 hover:bg-red-50 p-1.5 rounded-full transition-colors"
                                title="Remove file"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Status — segmented control */}
                  <div className="inline-flex bg-black/[0.05] rounded-full p-1 gap-1 flex-wrap">
                    {Object.entries(statusMeta).map(([key, meta]) => (
                      <button
                        key={key}
                        onClick={() => updateStatus(item.id, key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition-all ${
                          item.status === key ? 'bg-white shadow-sm text-ink' : 'text-ink/50 hover:text-ink/80'
                        }`}
                      >
                        <meta.icon size={13} />
                        {meta.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl shadow-black/20 animate-modal-in">
            <div className="flex items-center gap-2.5 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${confirmDialog.danger ? 'bg-red-50' : 'bg-accent/10'}`}>
                <AlertTriangle size={16} className={confirmDialog.danger ? 'text-red-600' : 'text-accent'} />
              </div>
              <h3 className="text-[16px] font-semibold tracking-tight">{confirmDialog.title}</h3>
            </div>
            <p className="text-[14px] text-muted mb-5 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  const action = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await action();
                }}
                className={`flex-1 text-white px-4 py-2.5 rounded-full text-[14px] font-medium transition-colors ${
                  confirmDialog.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-accent hover:bg-accent-hover'
                }`}
              >
                {confirmDialog.confirmLabel}
              </button>
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 bg-black/[0.05] text-ink px-4 py-2.5 rounded-full text-[14px] font-medium hover:bg-black/[0.08] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-toast-in">
          <div className="flex items-center gap-2.5 bg-ink/95 backdrop-blur-xl text-white text-[13px] font-medium pl-3.5 pr-4 py-2.5 rounded-full shadow-xl shadow-black/20">
            <span className={`w-1.5 h-1.5 rounded-full ${
              toast.type === 'error' ? 'bg-red-500' : toast.type === 'success' ? 'bg-green-500' : 'bg-white/60'
            }`} />
            {toast.message}
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchOrganizer;
