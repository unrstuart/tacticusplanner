﻿import React, { useCallback, useContext, useMemo, useState } from 'react';

import { Accordion, AccordionDetails, AccordionSummary } from '@mui/material';
import { StaticDataService } from '../services';
import { Rarity } from '../models/enums';
import { DispatchContext, StoreContext } from '../reducers/store.provider';
import { groupBy, map, orderBy } from 'lodash';

import { RarityImage } from 'src/v2/components/images/rarity-image';

import { IInventoryUpgrade, IUpgradesGroup } from './inventory-models';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { isMobile } from 'react-device-detect';
import { UpgradesGroup } from 'src/routes/upgrades-group';
import { InventoryControls } from 'src/routes/inventory-controls';

interface Props {
    itemsFilter?: string[];
    onUpdate?: () => void;
}

export const Inventory: React.FC<Props> = ({ itemsFilter = [], onUpdate }) => {
    const dispatch = useContext(DispatchContext);
    const { inventory, viewPreferences } = useContext(StoreContext);

    const [nameFilter, setNameFilter] = useState<string>('');

    const itemsList = useMemo<IInventoryUpgrade[]>(() => {
        return orderBy(
            Object.values(StaticDataService.recipeData)
                .filter(item => item.stat !== 'Shard' && (!itemsFilter.length || itemsFilter.includes(item.material)))
                .map(x => ({
                    material: x.material,
                    label: x.label ?? x.material,
                    rarity: Rarity[x.rarity as unknown as number] as unknown as Rarity,
                    craftable: x.craftable,
                    stat: x.stat,
                    quantity: inventory.upgrades[x.material] ?? 0,
                    iconPath: x.icon ?? '',
                    faction: x.faction ?? '',
                    visible: true,
                    alphabet: (x.label ?? x.material)[0].toUpperCase(),
                })),
            viewPreferences.inventoryShowAlphabet
                ? ['rarity', 'material', 'faction']
                : ['rarity', 'faction', 'material'],
            ['desc', 'asc', 'asc']
        );
    }, [viewPreferences.inventoryShowAlphabet]);

    const filterItem = useCallback(
        (item: IInventoryUpgrade) =>
            (item.material.toLowerCase().includes(nameFilter.toLowerCase()) ||
                item.label.toLowerCase().includes(nameFilter.toLowerCase())) &&
            (viewPreferences.craftableItemsInInventory || !item.craftable),
        [nameFilter, viewPreferences.craftableItemsInInventory]
    );

    const itemsGrouped = useMemo(() => {
        return map(
            groupBy(itemsList.filter(filterItem), 'rarity'),
            (items, rarity): IUpgradesGroup => ({
                label: Rarity[+rarity],
                rarity: +rarity,
                items: map(
                    groupBy(
                        items.filter(x => !x.craftable),
                        'alphabet'
                    ),
                    (subItems, letter) => ({
                        letter,
                        subItems,
                    })
                ),
                itemsCrafted: map(
                    groupBy(
                        items.filter(x => x.craftable),
                        'alphabet'
                    ),
                    (subItems, letter) => ({
                        letter,
                        subItems,
                    })
                ),
                itemsAll: items.filter(x => !x.craftable),
                itemsAllCrafted: items.filter(x => x.craftable),
            })
        ).reverse();
    }, [itemsList, filterItem]);

    const update = useCallback((upgradeId: string, value: number) => {
        dispatch.inventory({
            type: 'UpdateUpgradeQuantity',
            upgrade: upgradeId,
            value: value,
        });
        if (onUpdate) {
            onUpdate();
        }
    }, []);

    const resetUpgrades = useCallback((): void => {
        const result = confirm('All items quantity will be set to zero (0)');
        if (result) {
            dispatch.inventory({
                type: 'ResetUpgrades',
            });
            itemsList.forEach(row => {
                row.quantity = 0;
            });
        }
    }, [itemsList]);

    return (
        <>
            <InventoryControls nameFilter={nameFilter} setNameFilter={setNameFilter} resetUpgrades={resetUpgrades} />

            {itemsGrouped.map(group => (
                <Accordion key={group.rarity} defaultExpanded={!isMobile && !viewPreferences.craftableItemsInInventory}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <h4 className="flex-box gap5">
                            <RarityImage rarity={group.rarity} /> <span>{group.label}</span>
                        </h4>
                    </AccordionSummary>
                    <AccordionDetails>
                        <UpgradesGroup
                            group={group}
                            showAlphabet={viewPreferences.inventoryShowAlphabet}
                            showPlusMinus={viewPreferences.inventoryShowPlusMinus}
                            dataUpdate={update}
                        />
                    </AccordionDetails>
                </Accordion>
            ))}
        </>
    );
};
