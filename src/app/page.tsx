'use client';

import dynamic from 'next/dynamic';

// Dynamically import the Game component with no SSR
const Game = dynamic(() => import('@/components/Game'), {
    ssr: false
});

export default function Home() {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'black'
            }}
        >
            <Game />
        </div>
    );
}