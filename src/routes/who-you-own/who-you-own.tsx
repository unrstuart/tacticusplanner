﻿import React, { useContext, useMemo, useState } from 'react';

import { TextField } from '@mui/material';

import { groupBy, orderBy, sum } from 'lodash';
import Box from '@mui/material/Box';
import { CharacterItem } from '../../shared-components/character-item';
import { StoreContext } from '../../reducers/store.provider';
import { Rank } from '../../models/enums';
import { isMobile } from 'react-device-detect';

import background from '../../assets/images/background.png';
import { UtilsService } from '../../services/utils.service';
import { MiscIcon } from '../../shared-components/misc-icon';

export const WhoYouOwn = () => {
    const { characters } = useContext(StoreContext);
    const [filter, setFilter] = useState('');
    const [totalPower, setTotalPower] = useState(0);

    const factionsOrder = useMemo(() => {
        const charactersByFaction = groupBy(characters, 'faction');
        const factions = Object.keys(charactersByFaction);
        return orderBy(
            factions.map(x => ({
                faction: x,
                unlockedCount: charactersByFaction[x].filter(x => x.rank > Rank.Locked).length,
            })),
            ['unlockedCount'],
            ['desc']
        ).map(x => x.faction);
    }, []);

    const charactersByFaction = useMemo(() => {
        const filteredCharacters = filter
            ? characters.filter(x => x.name.toLowerCase().includes(filter.toLowerCase()))
            : characters;

        const charactersByFaction = groupBy(filteredCharacters, 'faction');
        const factionsOrdered = factionsOrder
            .filter(x => charactersByFaction[x])
            .map(x => ({
                faction: x,
                chars: charactersByFaction[x],
                factionPower: sum(charactersByFaction[x].map(UtilsService.getCharacterPower)),
                factionMaxPower: charactersByFaction[x].length * UtilsService.maxCharacterPower,
                unlockedCount: charactersByFaction[x].filter(x => x.rank > Rank.Locked).length,
            }));

        setTotalPower(sum(factionsOrdered.map(x => x.factionPower)));

        return factionsOrdered.map(x => (
            <div key={x.faction} style={{ minWidth: 375, maxWidth: 375 }}>
                <h4 style={{ background: x.chars[0].factionColor, marginBottom: 0, marginTop: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>{x.faction.toUpperCase()}</span>
                        <div style={{ display: 'flex' }}>
                            <MiscIcon icon={'power'} height={20} width={15} /> {x.factionPower}
                        </div>
                    </div>
                </h4>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: x.chars.length === 5 ? 'space-evenly' : 'flex-start',
                        paddingLeft: x.chars.length === 5 ? 0 : 5,
                    }}>
                    {x.chars.map(item => {
                        return <CharacterItem key={item.name} character={item} />;
                    })}
                </div>
            </div>
        ));
    }, [filter, characters]);

    return (
        <Box
            sx={{
                padding: isMobile ? 0 : 2,
                // backgroundImage: `url(${background})`,
            }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <TextField
                    sx={{ margin: '10px', width: '300px' }}
                    label="Quick Filter"
                    variant="outlined"
                    onChange={event => setFilter(event.target.value)}
                />
                <div style={{ display: 'flex', fontSize: 20, alignItems: 'center', fontWeight: 'bold' }}>
                    <MiscIcon icon={'power'} height={40} width={30} /> {totalPower}
                </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', columnGap: 25 }}>{charactersByFaction}</div>
        </Box>
    );
};
