import { RouteObject } from 'react-router-dom';

export const raidHitRoute: RouteObject = {
    path: 'plan/raid-hit',
    async lazy() {
        const { RaidHit } = await import('./raid-hit');
        return { Component: RaidHit };
    },
};
