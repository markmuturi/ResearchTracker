'use client';


import { useEffect, useState } from 'react';
import { FolderArchive, FileArchive, DownloadIcon, ChevronRight } from 'lucide-react';
import Image from 'next/image';
import ResearchlyLogo from '@/assets/ResearchlyLogo.webp';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

const HomePage = () => {
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 8);
        onScroll();
        window.addEventListener('scroll', onScroll, { passive: true });
        return () => window.removeEventListener('scroll', onScroll);
    }, []);

    const features = [
        {
            icon: FolderArchive,
            title: 'Every project, in its place',
            body: 'Keep unrelated research separate. Switch between projects instantly, without losing your place in either.'
        },
        {
            icon: FileArchive,
            title: 'Sources, notes, and files together',
            body: 'Attach PDFs, images, and documents directly to the question they support — nothing left scattered across tabs.'
        },
        {
            icon: DownloadIcon,
            title: 'Yours to take with you',
            body: 'Export a project, a category, or everything at once as plain JSON. No account, no lock-in.'
        }
    ];

    return (
        <div className="bg-white text-ink">
            {/* Nav */}
            <nav className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${scrolled ? 'bg-white/80 backdrop-blur-xl border-b border-black/5' : 'bg-transparent border-b border-transparent'}`}>
                <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 hover:scale-110 transition-all duration-100">
                        <Image
                            src={ResearchlyLogo}
                            alt="Researchly"
                            width={20}
                            priority
                            className="rounded-sm"
                        />
                        <span className="text-[13px] font-semibold tracking-tight">Researchly</span>
                    </Link>

                    <div className="hidden sm:flex items-center gap-8 text-[13px] text-ink/80">
                        <a href="#features" className="hover:text-accent font-bold hover:scale-105 transition-all duration-100">Features</a>
                        <a href="#about" className="hover:text-accent font-bold hover:scale-105 transition-all duration-100">About</a>
                    </div>

                    <Link
                        href="/ResearchOrganizer"
                        className="
                            text-[13px] font-bold bg-accent text-white px-6 py-2.5 backdrop-blur-xl
                            shadow-lg shadow-accent/50
                            rounded-full hover:bg-white/80 hover:translate-y-2 hover:text-accent transition-all duration-300"
                    >
                        <p>Get Started</p>
                    </Link>
                </div>
            </nav>

            {/* Hero */}
            <section className="pt-44 pb-28 px-6 text-center max-w-3xl mx-auto">
                <Reveal>
                    <h1 className="text-5xl sm:text-6xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
                        Research, organized.
                    </h1>
                </Reveal>
                <Reveal delay={120}>
                    <p className="mt-6 text-xl sm:text-2xl text-muted max-w-xl mx-auto leading-snug">
                        A focused workspace for every question, source, and finding — built to keep up with how you actually work.
                    </p>
                </Reveal>
                <Reveal delay={240}>
                    <div className="mt-10 flex items-center justify-center gap-7">
                        <Link
                            href="/ResearchOrganizer"
                            className="
                                text-[13px] font-bold bg-accent text-white px-6 py-2.5 backdrop-blur-xl
                                shadow-lg shadow-accent/50
                                rounded-full hover:bg-white/80 hover:translate-y-2 hover:text-accent transition-all duration-300"
                    >
                            Get Started
                        </Link>
                        <a
                            href="#features"
                            className="
                                text-accent text-[13px] bg-white font-medium
                                backdrop-blur-xl shadow-lg shadow-accent/50 rounded-full 
                                flex items-center gap-1 px-6 py-2.5
                                hover:gap-2 hover:bg-accent hover:text-white hover:translate-y-2 transition-all duration-300"
                        >
                            Learn more <ChevronRight size={15} />
                        </a>
                    </div>
                </Reveal>
            </section>

            {/* Features */}
            <section id="features" className="bg-surface border-y border-black/5">
                <div className="max-w-5xl mx-auto px-6 py-28">
                    <div className="grid md:grid-cols-3 gap-10">
                        {features.map((f, i) => (
                            <Reveal key={f.title} delay={i * 100}>
                                <div className="bg-white rounded-2xl border border-black/5 p-8 h-full hover:shadow-lg hover:shadow-black/5 hover:-translate-y-0.5 transition-all duration-300">
                                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center mb-6">
                                        <f.icon size={20} className="text-accent" strokeWidth={1.75} />
                                    </div>
                                    <h3 className="text-lg font-semibold tracking-tight mb-2">{f.title}</h3>
                                    <p className="text-[15px] text-muted leading-relaxed">{f.body}</p>
                                </div>
                            </Reveal>
                        ))}
                    </div>
                </div>
            </section>

            {/* Closing CTA */}
            <section id="about" className="max-w-3xl mx-auto px-6 py-28 text-center">
                <Reveal>
                    <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight mb-4">
                        Start your next research project in seconds.
                    </h2>
                </Reveal>
                <Reveal delay={100}>
                    <p className="text-muted text-lg mb-8">No sign-up. No sync required. Your research stays on your device.</p>
                </Reveal>
                <Reveal delay={200}>
                    <Link
                        href="/ResearchOrganizer"
                        className="inline-block btext-accent text-[20px] bg-white font-bold
                                backdrop-blur-xl shadow-lg shadow-accent/50 rounded-full 
                                items-center gap-1 px-10 py-3
                                hover:gap-2 hover:bg-accent hover:text-white hover:translate-y-2 transition-all duration-300"
                    >
                        OPEN RESEARCHLY
                    </Link>
                </Reveal>
            </section>

            {/* Footer */}
            <footer className="border-t border-black/5">
                <div className="max-w-6xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-muted">© {new Date().getFullYear()} Researchly. All research stays local to your device.</p>
                    <p className="text-xs text-muted">
                        Built by{' '}
                        <a
                            href="https://personal-portfolio-sand-mu.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:text-accent transition-colors"
                        >
                            Mark Muturi
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    );
};

export default HomePage;
