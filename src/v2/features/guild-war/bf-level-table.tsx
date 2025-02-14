﻿import React, { useState } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ColDef, ICellRendererParams, ValueGetterParams, themeBalham } from 'ag-grid-community';
import { IGWZone } from './guild-war.models';

import './bf-level-table.css';
import { GuildWarService } from 'src/v2/features/guild-war/guild-war.service';
import { RarityImage } from 'src/v2/components/images/rarity-image';
import { FlexBox } from 'src/v2/components/flex-box';
import { sum } from 'lodash';
import { Rarity } from 'src/models/enums';
import { Badge } from '@mui/material';
export const BfLevelTable = ({ rows }: { rows: IGWZone[] }) => {
    const [columnDefs] = useState<Array<ColDef>>([
        {
            field: 'name',
            headerName: 'Section',
            width: 140,
        },
        {
            field: 'warScore',
            headerName: 'Score',
            width: 80,
        },
        {
            field: 'count',
            headerName: 'Count',
            width: 70,
        },
        ...GuildWarService.gwData.bfLevels.map(level => ({
            headerName: level + '',
            width: 150,
            valueGetter: (params: ValueGetterParams<IGWZone>) => {
                const data = params.data!;

                const rarityCaps = GuildWarService.getRarityCaps(level, data.id);

                return sum(rarityCaps);
            },
            cellRenderer: (params: ICellRendererParams<IGWZone>) => {
                const data = params.data!;

                const rarityCaps = GuildWarService.getRarityCaps(level, data.id);
                const slots = GuildWarService.getTotalRarityCaps(level);

                return data.id !== 'total' ? (
                    <FlexBox gap={5}>
                        {rarityCaps.map((rarity, index) => (
                            <RarityImage key={index} rarity={rarity} />
                        ))}
                    </FlexBox>
                ) : (
                    <FlexBox gap={10} style={{ height: '100%' }}>
                        {[Rarity.Legendary, Rarity.Epic, Rarity.Rare, Rarity.Uncommon].map(rarity => {
                            const slotsCount = slots[rarity];
                            if (slotsCount) {
                                return (
                                    <Badge key={rarity} badgeContent={slotsCount}>
                                        <RarityImage rarity={rarity} />
                                    </Badge>
                                );
                            }
                        })}
                    </FlexBox>
                );
            },
        })),
    ]);

    const totalRow: IGWZone = {
        id: 'total',
        name: 'Total',
        count: sum(rows.map(row => row.count)),
        warScore: sum(rows.map(row => row.count * row.warScore)),
        rarityCaps: {},
    };

    return (
        <div className="ag-theme-material bf-table">
            <AgGridReact
                modules={[AllCommunityModule]}
                theme={themeBalham}
                suppressCellFocus={true}
                columnDefs={columnDefs}
                pinnedBottomRowData={[totalRow]}
                rowHeight={40}
                rowData={rows}></AgGridReact>
        </div>
    );
};
