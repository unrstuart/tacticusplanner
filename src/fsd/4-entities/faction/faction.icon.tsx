import React from 'react';

import { getImageUrl } from '@/fsd/5-shared/ui';

export const FactionImage = ({ faction, icon }: { faction: string; icon?: string }) => {
    // Use the provided icon filename or fallback to faction name
    const iconFilename = icon || `${faction}.png`;

    const imageUrl = getImageUrl(`factions/${iconFilename}`);

    return (
        <img
            loading={'lazy'}
            style={{ pointerEvents: 'none', contentVisibility: 'auto' }}
            src={imageUrl}
            width={25}
            alt={faction}
        />
    );
};
