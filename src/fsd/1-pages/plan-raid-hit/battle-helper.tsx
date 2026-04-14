/* eslint-disable import-x/no-internal-modules */
/* eslint-disable @typescript-eslint/no-unused-vars */

// TODO(cpunerd): Remove the ESLint warnings above. I just want to check the code in instead of stashing it constantly.

import { Rank } from '@/fsd/5-shared/model/enums/rank.enum';
import { RarityStars } from '@/fsd/5-shared/model/enums/rarity-stars.enum';
import { Rarity } from '@/fsd/5-shared/model/enums/rarity.enum';

import rawEquipment from '@/fsd/4-entities/equipment/data/new-equipment-data.json';

import rawAbilities from './data/abilities.json';
import rawUnits from './data/heroes.json';
import {
    IRaidVariableValue,
    IAttack,
    IBattleState,
    IBuff,
    IHit,
    IModifier,
    IPierceBuff,
    IRaidEvent,
    IUnitId,
    IBlockBuff,
} from './models';
import { REGISTERED_UNITS } from './registered-units';

const PIERCE_RATIOS: Record<string, number> = {
    Acid: 40,
    Bio: 30,
    Blast: 15,
    Bolter: 20,
    Chain: 20,
    DirectDamage: 100,
    Energy: 30,
    Eviscerate: 50,
    Flame: 25,
    Gauss: 60,
    HeavyRound: 55,
    Las: 10,
    Melta: 75,
    Particle: 35,
    Physical: 1,
    Piercing: 80,
    Plasma: 65,
    Power: 40,
    Projectile: 15,
    Psychic: 100,
    Pulse: 20,
    Toxic: 70,
};

export type Stat = 'health' | 'damage' | 'armor';

const STAT_COLUMNS: Record<Stat, [number, number]> = {
    health: [0, 1],
    damage: [2, 3],
    armor: [4, 5],
};

const STAR_COUNT: Record<RarityStars, number> = {
    [RarityStars.None]: 0,
    [RarityStars.OneStar]: 1,
    [RarityStars.TwoStars]: 2,
    [RarityStars.ThreeStars]: 3,
    [RarityStars.FourStars]: 4,
    [RarityStars.FiveStars]: 5,
    [RarityStars.RedOneStar]: 6,
    [RarityStars.RedTwoStars]: 7,
    [RarityStars.RedThreeStars]: 8,
    [RarityStars.RedFourStars]: 9,
    [RarityStars.RedFiveStars]: 10,
    [RarityStars.OneBlueStar]: 11,
    [RarityStars.TwoBlueStars]: 12,
    [RarityStars.ThreeBlueStars]: 13,
    [RarityStars.MythicWings]: 14,
};

export class BattleHelper {
    public static getRandomInt(state: IBattleState, minInclusive: number, maxExclusive: number): number {
        return Math.floor(Math.random() * (maxExclusive - minInclusive)) + minInclusive;
    }

    public static varAsBoolean(value: IRaidVariableValue): boolean | undefined {
        if (typeof value === 'boolean') return value;
        return undefined;
    }

    public static varAsNumber(value: IRaidVariableValue): number | undefined {
        if (typeof value === 'number') return value;
        return undefined;
    }

    public static getAdjacentUnits(state: IBattleState, unitId: IUnitId): IUnitId[] {
        return BattleHelper.getUnitsWithinHexRange(state, unitId, 1);
    }

    public static getUnitsWithinHexRange(state: IBattleState, unitId: IUnitId, range: number): IUnitId[] {
        const loc = state.locations[unitId.uuid];
        if (loc === undefined) return [];

        return Object.values(state.unitsByUuid).filter(other => {
            if (BattleHelper.unitIdEquals(unitId, other)) return false;
            const otherLoc = state.locations[other.uuid];
            return otherLoc !== undefined && BattleHelper.hexDistance(loc, otherLoc) <= range;
        });
    }

    /**
     * Hex distance between two offset-coordinate tiles.
     * Odd columns are staggered DOWN (+y). Converts to cube coordinates first.
     */
    private static hexDistance(a: { vCol: number; vRow: number }, b: { vCol: number; vRow: number }): number {
        const ac = BattleHelper.offsetToCube(a.vCol, a.vRow);
        const bc = BattleHelper.offsetToCube(b.vCol, b.vRow);
        return Math.max(Math.abs(ac.cx - bc.cx), Math.abs(ac.cy - bc.cy), Math.abs(ac.cz - bc.cz));
    }

    private static offsetToCube(col: number, row: number): { cx: number; cy: number; cz: number } {
        const cx = col;
        const cz = row - (col - (col & 1)) / 2;
        return { cx, cy: -cx - cz, cz };
    }

    public static hasTrait(state: IBattleState, unitId: IUnitId, trait: string): boolean {
        return REGISTERED_UNITS.some(u => u.id === unitId.id && u.traits.includes(trait));
    }

    private static getNormalAttack(
        state: IBattleState,
        unitId: IUnitId,
        ranged: boolean
    ): { pierce: string; hitCount: number; range?: number } {
        const unit = rawUnits.find(u => u.id === unitId.id);
        if (unit === undefined) {
            console.warn(`Unknown unit ${unitId.id}`);
            return { pierce: 'Physical', hitCount: 1 };
        }
        if (ranged) {
            return {
                pierce: unit.rangedAttack?.pierce ?? 'Physical',
                hitCount: unit.rangedAttack?.hitCount ?? 1,
                range: unit.rangedAttack?.range,
            };
        }
        return { pierce: unit.meleeAttack?.pierce ?? 'Physical', hitCount: unit.meleeAttack?.hitCount ?? 1 };
    }

    public static getNormalAttackPierce(state: IBattleState, unitId: IUnitId, ranged: boolean): number {
        const damageType = BattleHelper.getNormalAttackDamageType(state, unitId, ranged);
        const pierce = PIERCE_RATIOS[damageType];
        if (pierce === undefined) {
            console.warn(`Unknown damage type ${damageType} for unit ${unitId.id}`);
            return 0;
        }
        return pierce / 100;
    }

    public static getNormalAttackDamageType(state: IBattleState, unitId: IUnitId, ranged: boolean): string {
        return BattleHelper.getNormalAttack(state, unitId, ranged).pierce;
    }

    public static getNormalAttackHits(state: IBattleState, unitId: IUnitId, ranged: boolean): number {
        return BattleHelper.getNormalAttack(state, unitId, ranged).hitCount;
    }

    private static calculateStat(
        charId: string,
        stat: Stat,
        rank: Rank,
        stars: RarityStars,
        topUpgradeApplied: boolean,
        bottomUpgradeApplied: boolean
    ): number {
        const char = rawUnits.find(c => c.id === charId);
        if (!char) return 0;

        const multiplier = 1 + STAR_COUNT[stars] * 0.1;
        const [col1, col2] = STAT_COLUMNS[stat];
        const rankIndex = rank as number;
        const { statIncreases, initialStats } = char;

        let rawTotal = initialStats[stat];

        // Sum all upgrades from completed ranks (the ones that got us here)
        for (let index = 0; index < rankIndex; index++) {
            rawTotal += statIncreases[index][col1] + statIncreases[index][col2];
        }

        // Add partial upgrades being applied at the current rank
        if (topUpgradeApplied) rawTotal += statIncreases[rankIndex][col1];
        if (bottomUpgradeApplied) rawTotal += statIncreases[rankIndex][col2];

        return Math.floor(rawTotal * multiplier);
    }

    public static getArmorStat(state: IBattleState, unitId: IUnitId): number {
        const char = state.unitDetails[unitId.uuid];
        if (!char) return 0;
        return BattleHelper.calculateStat(
            unitId.id,
            'armor',
            char.rank,
            char.stars,
            char.appliedUpgrades[4],
            char.appliedUpgrades[5]
        );
    }

    public static getDamageStat(state: IBattleState, unitId: IUnitId): number {
        const char = state.unitDetails[unitId.uuid];
        if (!char) return 0;
        return BattleHelper.calculateStat(
            unitId.id,
            'damage',
            char.rank,
            char.stars,
            char.appliedUpgrades[2],
            char.appliedUpgrades[3]
        );
    }

    public static getHealthStat(state: IBattleState, unitId: IUnitId): number {
        const char = state.unitDetails[unitId.uuid];
        if (!char) return 0;
        return BattleHelper.calculateStat(
            unitId.id,
            'health',
            char.rank,
            char.stars,
            char.appliedUpgrades[0],
            char.appliedUpgrades[1]
        );
    }

    private static adjustCritChance(
        equipmentId: string,
        equipmentLevel: number,
        crit: { chance: number; boost: number }
    ): void {
        const equipment = rawEquipment.find(item => item.id === equipmentId);
        if (!equipment) return;
        const level = equipmentLevel - 1;
        if (equipment.levels.length <= level) return;
        if (equipment.type === 'I_Booster_Crit') {
            crit.boost += equipment.levels[level].stats.critChanceBonus;
        } else if (equipment.type === 'I_Crit') {
            const chance = equipment.levels[level].stats.critChance;
            if (crit.chance === 0) {
                crit.chance = chance;
                return;
            }
            crit.chance = 1 - (1 - crit.chance / 100) * (1 - chance / 100);
        }
    }

    public static getCritChance(state: IBattleState, unitId: IUnitId): number {
        const details = state.unitDetails[unitId.uuid];
        if (!details) return 0;
        const crit = { chance: 0, boost: 0 };
        for (let index = 0; index < 3; index++) {
            BattleHelper.adjustCritChance(details.equipment[index], details.equipmentLevel[index], crit);
        }
        return crit.chance + crit.boost;
    }

    private static adjustCritDamage(
        equipmentId: string,
        equipmentLevel: number,
        crit: { damage: number; boost: number }
    ): void {
        const equipment = rawEquipment.find(item => item.id === equipmentId);
        if (!equipment) return;
        const level = equipmentLevel - 1;
        if (equipment.levels.length <= level) return;
        if (equipment.type === 'I_Booster_Crit') {
            crit.boost += equipment.levels[level].stats.critDamageBonus;
        } else if (equipment.type === 'I_Crit') {
            crit.damage += equipment.levels[level].stats.critDamage;
        }
    }

    public static getCritDamage(state: IBattleState, unitId: IUnitId): number {
        const details = state.unitDetails[unitId.uuid];
        if (!details) return 0;
        const crit = { damage: 0, boost: 0 };
        for (let index = 0; index < 3; index++) {
            BattleHelper.adjustCritDamage(details.equipment[index], details.equipmentLevel[index], crit);
        }
        return crit.damage + crit.boost;
    }

    public static getAbilityVar(state: IBattleState, unitId: IUnitId, abilityId: string, variableName: string): number {
        const ability = rawAbilities.find(a => a.id === abilityId);
        if (ability === undefined) {
            console.warn(`Unknown ability ${abilityId}`);
            return -1;
        }
        if (ability.variables === undefined) {
            console.warn(`Ability ${abilityId} does not have any variables`);
            return -1;
        }
        const keys = Object.keys(ability.variables);
        if (!keys.includes(variableName)) {
            console.warn(`Ability ${abilityId} does not have variable ${variableName}`);
            return -1;
        }

        // This is so stupid that we have to access it this way instead of just using a nullable value.
        const variable = Object.entries(ability.variables).find(([key]) => key === variableName)?.[1];

        if (variable === undefined) {
            console.warn(`Unknown variable ${variableName} for ability ${abilityId}`);
            return -1;
        }
        const boostWithRarity = ability.variablesAffectedByRarityBonus?.includes(variableName);
        const hero = rawUnits.find(u => u.id === unitId.id);
        if (hero === undefined) {
            console.warn(`Unknown unit ${unitId.id}`);
            return -1;
        }

        const unit = state.unitDetails[unitId.uuid];
        const level = hero.activeAbilityId === abilityId ? unit.activeLevel : unit.passiveLevel;
        console.log(`variable ${variableName} for ability ${abilityId} at level ${level} is ${variable[level - 1]}`);
        let value = Number.parseInt(variable[level - 1], 10) ?? 0;
        if (boostWithRarity) {
            value *= (() => {
                switch (unit.rarity) {
                    case Rarity.Common: {
                        return 1;
                    }
                    case Rarity.Uncommon: {
                        return 1.2;
                    }
                    case Rarity.Rare: {
                        return 1.4;
                    }
                    case Rarity.Epic: {
                        return 1.6;
                    }
                    case Rarity.Legendary: {
                        return 1.8;
                    }
                    case Rarity.Mythic: {
                        return 2;
                    }
                    default: {
                        console.warn(`Unknown rarity ${unit.rarity} for unit ${unitId.id}`);
                        return 1;
                    }
                }
            })();
        }
        return Math.floor(value);
    }

    public static isFriendly(state: IBattleState, unitId: IUnitId, otherUnitId: IUnitId): boolean {
        // TODO - Take into account friendly team IDs not equal to our own.
        return unitId.teamId === otherUnitId.teamId;
    }

    public static isAdjacent(state: IBattleState, unitId: IUnitId, otherUnitId: IUnitId): boolean {
        return BattleHelper.isWithinHexRange(state, unitId, otherUnitId, 1);
    }

    public static isWithinHexRange(state: IBattleState, unitId: IUnitId, otherUnitId: IUnitId, range: number): boolean {
        return BattleHelper.getUnitsWithinHexRange(state, unitId, range).some(other =>
            BattleHelper.unitIdEquals(other, otherUnitId)
        );
    }

    public static applyParry(state: IBattleState, attack: IAttack, self: IUnitId): void {
        if (attack.ranged) return;
        if (attack.hits.length < 2) return;
        attack.hits.pop();
    }

    public static applyTerrifying(state: IBattleState, attack: IAttack, self: IUnitId): void {
        if (attack.ranged) return;
        const terrifyingModifier: IModifier = { id: 'Terrifying', percentage: 0.7 };
        for (const hit of attack.hits) {
            BattleHelper.addModifier(terrifyingModifier, hit);
        }
    }

    public static getGlobalVar(state: IBattleState, variableName: string): IRaidVariableValue {
        return state.globalVariables[variableName];
    }

    public static setGlobalVar(state: IBattleState, variableName: string, value: IRaidVariableValue): void {
        if (value === undefined) delete state.globalVariables[variableName];
        else state.globalVariables[variableName] = value;
    }

    public static getCharacterVar(state: IBattleState, unitId: IUnitId, variableName: string): IRaidVariableValue {
        if (state.characterVariables[unitId.uuid] === undefined) return undefined;
        return state.characterVariables[unitId.uuid][variableName];
    }

    public static setCharacterVar(
        state: IBattleState,
        unitId: IUnitId,
        variableName: string,
        value: IRaidVariableValue
    ): void {
        if (state.characterVariables[unitId.uuid] === undefined) {
            state.characterVariables[unitId.uuid] = {};
        }
        if (value === undefined) delete state.characterVariables[unitId.uuid][variableName];
        else state.characterVariables[unitId.uuid][variableName] = value;
    }

    public static fetchLastEvent(state: IBattleState): IRaidEvent | undefined {
        if (state.currentEventChain.length === 0) {
            return undefined;
        }
        return state.currentEventChain.at(-1);
    }

    public static unitIdEquals(a: IUnitId, b: IUnitId): boolean {
        return a.id === b.id && a.teamId === b.teamId && a.uuid === b.uuid;
    }

    /** @returns a deterministic UUID for the unit. */
    public static getUuid(id: string, team: string, instance: number): string {
        return `${id}:${team}:${instance}`;
    }

    public static addModifier(modifier: IModifier, hit: IHit): void {
        const existing = hit.modifiers.find(m => m.id === modifier.id);
        if (existing === undefined) hit.modifiers.push(modifier);
    }

    public static addBuff(buff: IBuff, hit: IHit): void {
        const existing = hit.buffs.find(m => m.id === buff.id);
        if (existing === undefined) hit.buffs.push(buff);
    }

    public static addBlockBuff(buff: IBlockBuff, hit: IHit): void {
        const existing = hit.blockBuffs.find(m => m.id === buff.id);
        if (existing === undefined) hit.blockBuffs.push(buff);
    }

    public static addPierceBuff(buff: IPierceBuff, hit: IHit): void {
        const existing = hit.pierceBuffs.find(m => m.id === buff.id);
        if (existing === undefined) hit.pierceBuffs.push(buff);
    }

    public static constructNormalMeleeAttack(
        state: IBattleState,
        attackerId: IUnitId,
        defenderId: IUnitId
    ): IRaidEvent[] {
        const hit: IHit = {
            id: `${attackerId.id}:${BattleHelper.isFriendly(state, attackerId, defenderId) ? 'Friendly' : 'Enemy'}-NormalMeleeHit`,
            damageType: BattleHelper.getNormalAttackDamageType(state, attackerId, /*ranged=*/ false),
            minDamage: BattleHelper.getDamageStat(state, attackerId) * 0.8,
            maxDamage: BattleHelper.getDamageStat(state, attackerId) * 1.2,
            critChance: BattleHelper.getCritChance(state, attackerId),
            critDamage: BattleHelper.getCritDamage(state, attackerId),
            defenderArmor: 0,
            pierceBuffs: [],
            buffs: [],
            modifiers: [],
            blocks: [],
            blockBuffs: [],
        };
        const hitsCount = BattleHelper.getNormalAttackHits(state, attackerId, false);
        return [
            {
                type: 'attack',
                attack: {
                    attackerId,
                    defenderId,
                    ranged: false,
                    normal: true,
                    hits: Array.from({ length: hitsCount }, () => ({ ...hit })),
                },
            },
        ];
    }

    public static constructNormalRangedAttack(
        state: IBattleState,
        attackerId: IUnitId,
        defenderId: IUnitId
    ): IRaidEvent[] {
        const hit: IHit = {
            id: `${attackerId.id}:${BattleHelper.isFriendly(state, attackerId, defenderId) ? 'Friendly' : 'Enemy'}-NormalRangedHit`,
            damageType: BattleHelper.getNormalAttackDamageType(state, attackerId, true),
            minDamage: BattleHelper.getDamageStat(state, attackerId) * 0.8,
            maxDamage: BattleHelper.getDamageStat(state, attackerId) * 1.2,
            critChance: BattleHelper.getCritChance(state, attackerId),
            critDamage: BattleHelper.getCritDamage(state, attackerId),
            defenderArmor: 0,
            pierceBuffs: [],
            buffs: [],
            modifiers: [],
            blocks: [],
            blockBuffs: [],
        };
        const hitsCount = BattleHelper.getNormalAttackHits(state, attackerId, true);
        return [
            {
                type: 'attack',
                attack: {
                    attackerId,
                    defenderId,
                    ranged: true,
                    normal: true,
                    hits: Array.from({ length: hitsCount }, () => ({ ...hit })),
                },
            },
        ];
    }
}
