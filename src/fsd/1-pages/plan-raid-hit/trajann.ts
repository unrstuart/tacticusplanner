import { cloneDeep } from 'lodash';

import { BattleHelper } from './battle-helper';
import {
    IAttack,
    IBattleState,
    IBlockBuff,
    IBuff,
    IEventActiveAbility,
    IEventAttack,
    IEventFinishActive,
    IEventTriggerAttack,
    IHit,
    IRaidCharacter,
    IRaidEvent,
    IUnitId,
} from './models';

const CHAR_ID = 'custoTrajann';
const ACTIVE_ABILITY_ID = 'MomentShackle'; // hpToHeal, blockChance, blockDmg, minDmg, maxDmg
const PASSIVE_ABILITY_ID = 'LegendaryCommander'; // extraDmg, nrOfHits
const RECEIVED_EXTRA_HITS_VAR = `${PASSIVE_ABILITY_ID}-ReceivedExtraHits`;

function isAdjacentToFriendlyThatHasUsedActive(state: IBattleState, self: IUnitId, defender: IUnitId): boolean {
    const adjacentUnits = new Map<string, IUnitId>(
        BattleHelper.getAdjacentUnits(state, defender)
            .filter(unit => BattleHelper.isFriendly(state, self, unit))
            .map(unit => [unit.uuid, unit])
    );
    for (const event of [state.finishedEventChains, state.currentEventChain].flat()) {
        if (event.type === 'finish' && event.finishType === 'active' && adjacentUnits.has(event.unitId.uuid)) {
            return true;
        }
    }
    return false;
}

function buffAttack(state: IBattleState, self: IUnitId, attack: IAttack): void {
    // Only buffs friendly units.
    if (!BattleHelper.isFriendly(state, self, attack.attackerId)) return;
    if (attack.hits.length === 0) return;

    // Trajann only buffs attacks when an adjacent unit has finished their active.
    if (!isAdjacentToFriendlyThatHasUsedActive(state, self, attack.defenderId)) return;
    const canReceiveExtraHits =
        BattleHelper.isAdjacent(state, self, attack.defenderId) &&
        !attack.normal &&
        !BattleHelper.varAsBoolean(BattleHelper.getCharacterVar(state, attack.defenderId, RECEIVED_EXTRA_HITS_VAR));

    if (canReceiveExtraHits) {
        const hit: IHit = attack.hits.at(-1)!;
        attack.hits.push(
            { ...hit, id: `${PASSIVE_ABILITY_ID}-ExtraHit1` },
            { ...hit, id: `${PASSIVE_ABILITY_ID}-ExtraHit2` }
        );
    }

    const extraDmgBuff: IBuff = {
        id: PASSIVE_ABILITY_ID + '-BuffedAttacksDealMoreDamage',
        amount: BattleHelper.getAbilityVar(state, self, PASSIVE_ABILITY_ID, 'extraDmg'),
    };

    for (const hit of attack.hits) {
        BattleHelper.addBuff(extraDmgBuff, hit);
    }
}

function buffDefense(state: IBattleState, self: IUnitId, attack: IAttack): void {
    if (!BattleHelper.unitIdEquals(self, attack.defenderId)) return;
    if (!BattleHelper.varAsBoolean(BattleHelper.getCharacterVar(state, self, ACTIVE_ABILITY_ID))) return;
    for (const hit of attack.hits) {
        if (hit.damageType === 'Psychic') continue; // Can't block psychic hits, so doesn't matter.
        const blockBuff: IBlockBuff = {
            id: ACTIVE_ABILITY_ID + '-ExtraBlock',
            chance: BattleHelper.getAbilityVar(state, self, ACTIVE_ABILITY_ID, 'blockChance'),
            damage: BattleHelper.getAbilityVar(state, self, ACTIVE_ABILITY_ID, 'blockDmg'),
        };
        BattleHelper.addBlockBuff(blockBuff, hit);
    }
}

function performActive(state: IBattleState, self: IUnitId): void {
    BattleHelper.setCharacterVar(state, self, ACTIVE_ABILITY_ID, true);
}

function performActiveAttack(state: IBattleState, self: IUnitId, event: IEventTriggerAttack): IEventAttack {
    const hit: IHit = {
        id: `${self.id}-ActiveAttack-Hit1`,
        damageType: 'Bolter',
        minDamage: BattleHelper.getAbilityVar(state, self, ACTIVE_ABILITY_ID, 'minDmg'),
        maxDamage: BattleHelper.getAbilityVar(state, self, ACTIVE_ABILITY_ID, 'maxDmg'),
        critChance: BattleHelper.getCritChance(state, self),
        critDamage: BattleHelper.getCritDamage(state, self),
        defenderArmor: 0,
        pierceBuffs: [],
        buffs: [],
        modifiers: [],
        blocks: [],
        blockBuffs: [],
    };
    return {
        type: 'attack',
        abilityId: ACTIVE_ABILITY_ID,
        attack: {
            id: `${self.id}-BolterDamage`,
            attackerId: self,
            defenderId: event.targets[0],
            ranged: false,
            normal: false,
            hits: [cloneDeep(hit), cloneDeep(hit)],
        },
    } as IEventAttack;
}

function respondToEvent(state: IBattleState, self: IUnitId): IRaidEvent | undefined {
    const event = BattleHelper.fetchLastEvent(state);
    if (event === undefined) return undefined;

    if (event.type === 'startOfTurn' && event.teamId === self.teamId) {
        // Clear the active usage and extra hits received at the start of the turn.
        BattleHelper.setCharacterVar(state, self, ACTIVE_ABILITY_ID, undefined);
        return;
    }

    if (
        event.type === 'trigger' &&
        event.triggerType === 'attack' &&
        BattleHelper.unitIdEquals(event.targets[0], self) &&
        event.abilityId === ACTIVE_ABILITY_ID
    ) {
        return performActiveAttack(state, self, event);
    }

    if (event.type === 'attack') {
        const attack = (event as IEventAttack).attack;
        buffAttack(state, self, attack);
        buffDefense(state, self, attack);
        if (BattleHelper.unitIdEquals(self, attack.attackerId) && !attack.normal) {
            // Finish the active.
            return {
                type: 'finish',
                finishType: 'active',
                unitId: self,
                targets: [attack.defenderId],
                abilityId: ACTIVE_ABILITY_ID,
            } as IEventFinishActive;
        }

        return;
    }

    if (event.type === 'trigger' && event.triggerType === 'active' && BattleHelper.unitIdEquals(event.unitId, self)) {
        // He triggered his active, so we need to perform his active.
        return {
            type: 'active',
            unitId: event.unitId,
            abilityId: ACTIVE_ABILITY_ID,
            targetIds: [self],
        } as IEventActiveAbility;
    }

    if (
        event.type === 'active' &&
        event.abilityId === ACTIVE_ABILITY_ID &&
        BattleHelper.unitIdEquals(event.unitId, self)
    ) {
        performActive(state, self);
        return {
            type: 'finish',
            finishType: 'active',
            unitId: self,
            targets: [self],
            abilityId: ACTIVE_ABILITY_ID,
        } as IEventFinishActive;
    }

    if (
        event.type === 'move' &&
        !BattleHelper.isFriendly(state, self, event.unitId) &&
        BattleHelper.isAdjacent(state, self, event.unitId)
    ) {
        return {
            type: 'trigger',
            triggerType: 'attack',
            unitId: self,
            targets: [event.unitId],
            ranged: false,
            abilityId: ACTIVE_ABILITY_ID,
        } as IEventTriggerAttack;
    }

    return undefined;
}

export function Trajann(): IRaidCharacter {
    return {
        id: CHAR_ID,
        traits: ['MartialKatah', 'CrushingStrike', 'Resilient'],
        hasRangedAttack: true,
        activeAbilityIds: [ACTIVE_ABILITY_ID],
        passiveAbilityIds: [PASSIVE_ABILITY_ID],
        activeTargetType: 'AdjacentEnemy',
        activeTargetSelection: 'PlayerChoice',
        unitVariables: [],
        respondToEvent: respondToEvent,
    };
}
