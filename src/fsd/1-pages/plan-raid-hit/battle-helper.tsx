/* eslint-disable @typescript-eslint/no-unused-vars */

// TODO(cpunerd): Remove the ESLint warnings above. I just want to check the code in instead of stashing it constantly.

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
} from './models';

export class BattleHelper {
    public static hasTrait(state: IBattleState, unitId: IUnitId, trait: string): boolean {
        return false;
    }

    public static getNormalAttackPierce(state: IBattleState, unitId: IUnitId, ranged: boolean): number {
        return 0.01;
    }

    public static getNormalAttackDamageType(state: IBattleState, unitId: IUnitId, ranged: boolean): string {
        return 'Physical';
    }

    public static getNormalAttackHits(state: IBattleState, unitId: IUnitId, ranged: boolean): number {
        return 1;
    }

    public static getDamageStat(state: IBattleState, unitId: IUnitId): number {
        return 1;
    }

    public static getCritChance(state: IBattleState, unitId: IUnitId): number {
        return 0;
    }

    public static getCritDamage(state: IBattleState, unitId: IUnitId): number {
        return 1;
    }

    public static getAbilityVar(state: IBattleState, unitId: IUnitId, abilityId: string, variableName: string): number {
        return 0;
    }

    public static isFriendly(state: IBattleState, unitId: IUnitId, otherUnitId: IUnitId): boolean {
        // TODO - Take into account friendly team IDs not equal to our own.
        return unitId.teamId === otherUnitId.teamId;
    }

    public static isAdjacent(state: IBattleState, unitId: IUnitId, otherUnitId: IUnitId): boolean {
        return BattleHelper.isWithinHexRange(state, unitId, otherUnitId, 1);
    }

    public static isWithinHexRange(state: IBattleState, unitId: IUnitId, otherUnitId: IUnitId, range: number): boolean {
        return true;
    }

    public static applyParry(state: IBattleState, attack: IAttack, self: IUnitId): void {
        return;
    }

    public static applyTerrifying(state: IBattleState, attack: IAttack, self: IUnitId): void {
        return;
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

    public static addModifier(modifier: IModifier, hit: IHit): void {
        const existing = hit.modifiers.find(m => m.id === modifier.id);
        if (existing === undefined) hit.modifiers.push(modifier);
    }

    public static addBuff(buff: IBuff, hit: IHit): void {
        const existing = hit.buffs.find(m => m.id === buff.id);
        if (existing === undefined) hit.buffs.push(buff);
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
