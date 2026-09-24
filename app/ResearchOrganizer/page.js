'use client';

import dynamic from 'next/dynamic';

const ResearchOrganizer = dynamic(
    () => import('@/components/ResearchOrganizer'),
    { ssr: false }
);

export default function ResearchOrganizerPage() {
    return <ResearchOrganizer />;
}
