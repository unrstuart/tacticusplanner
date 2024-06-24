﻿import React, { useMemo } from 'react';

import { MowLookupService } from 'src/v2/features/lookup/mow-lookup.service';
import { Alliance } from 'src/models/enums';
import { Checkbox, FormControlLabel, Popover } from '@mui/material';
import { UpgradeImage } from 'src/shared-components/upgrade-image';
import Button from '@mui/material/Button';
import { Info } from '@mui/icons-material';
import { UpgradesService } from 'src/v2/features/goals/upgrades.service';

interface Props {
    mowId: string;
    inventory: Record<string, number>;
    currPrimaryLevel: number;
    currSecondaryLevel: number;
    originalPrimaryLevel: number;
    originalSecondaryLevel: number;
    inventoryDecrement: (value: Record<string, number>) => void;
}

export const MowUpgradesUpdate: React.FC<Props> = ({
    mowId,
    inventory,
    originalSecondaryLevel,
    originalPrimaryLevel,
    currSecondaryLevel,
    currPrimaryLevel,
    inventoryDecrement,
}) => {
    const { inventoryUpgrades, inventoryUpdate } = useMemo(() => {
        const primaryLevels = Array.from(
            { length: Math.max(currPrimaryLevel - originalPrimaryLevel, 0) },
            (_, index) => originalPrimaryLevel + index + 1
        );

        const secondaryLevels = Array.from(
            { length: Math.max(currSecondaryLevel - originalSecondaryLevel, 0) },
            (_, index) => originalSecondaryLevel + index + 1
        );

        const primary = primaryLevels.length
            ? MowLookupService.getMaterialsList(mowId, mowId, Alliance.Imperial, primaryLevels)
            : [];
        const secondary = secondaryLevels.length
            ? MowLookupService.getMaterialsList(mowId, mowId, Alliance.Imperial, secondaryLevels)
            : [];

        const totalUpgrades = [
            ...primary.flatMap(x => x.primaryUpgrades),
            ...secondary.flatMap(x => x.secondaryUpgrades),
        ];
        return UpgradesService.updateInventory(inventory, totalUpgrades);
    }, [currPrimaryLevel, currSecondaryLevel]);

    const [anchorEl, setAnchorEl] = React.useState<HTMLButtonElement | null>(null);
    const [updateInventory, setUpdateInventory] = React.useState<boolean>(false);

    const handleClick = (event: React.UIEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    console.log(inventory);

    return (
        <>
            <FormControlLabel
                control={
                    <Checkbox
                        disabled={!inventoryUpgrades.length}
                        checked={updateInventory}
                        onChange={event => {
                            setUpdateInventory(event.target.checked);
                            if (event.target.checked) {
                                inventoryDecrement(inventoryUpdate);
                            } else {
                                inventoryDecrement({});
                            }
                        }}
                        inputProps={{ 'aria-label': 'controlled' }}
                    />
                }
                label={'Update inventory'}
            />
            <Button disabled={!updateInventory} onClick={handleClick} color={'primary'}>
                <Info />
            </Button>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'left',
                }}>
                <div style={{ padding: 15 }}>
                    <p>Inventory after update:</p>
                    <ul style={{ padding: 0 }}>
                        {inventoryUpgrades.map((x, index) => (
                            <li
                                key={x.id + index}
                                style={{
                                    listStyleType: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                    paddingBottom: 10,
                                }}>
                                <UpgradeImage material={x.label} rarity={x.rarity} iconPath={x.iconPath} />{' '}
                                {inventory[x.id] ?? 0} - {inventoryUpdate[x.id]} ={' '}
                                {(inventory[x.id] ?? 0) - inventoryUpdate[x.id] < 0
                                    ? 0
                                    : (inventory[x.id] ?? 0) - inventoryUpdate[x.id]}
                            </li>
                        ))}
                    </ul>
                </div>
            </Popover>
        </>
    );
};
