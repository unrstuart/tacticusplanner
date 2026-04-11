import { BattleHelper } from './battle-helper';
import {
    IBattleState,
    IEventActiveAbility,
    IEventAttack,
    IEventError,
    IEventFinishActive,
    IEventFinishAttack,
    IEventTriggerAttack,
    IEventTriggerPassive,
    IHit,
    IModifier,
    IRaidCharacter,
    IRaidConfigurableVariableDescriptor,
    IRaidEvent,
    IUnitId,
} from './models';

const CHAR_ID = 'custoBladeChampion';
const ACTIVE_ABILITY_ID = 'MartialInspiration'; // minDmg, maxDmg, extraDmgPct
const PASSIVE_ABILITY_ID = 'LegacyOfCombat'; // minDmg, maxDmg, minDmg_2, maxDmg_2
const TURNS_ALREADY_ATTACKED_VAR = `${CHAR_ID}-TurnsAlreadyAttacked`;
const USED_ACTIVE_THIS_TURN_VAR = `${CHAR_ID}-UsedActiveThisTurn`;

function buffSelfAttack(state: IBattleState, self: IUnitId, event: IRaidEvent): void {
    if (event.type !== 'attack') return;
    const attack = event.attack;
    if (attack.ranged) return;
    if (!BattleHelper.unitIdEquals(self, attack.attackerId)) return;
    if (!BattleHelper.varAsBoolean(BattleHelper.getCharacterVar(state, self, USED_ACTIVE_THIS_TURN_VAR))) return;

    const turnsAlreadyAttacked =
        BattleHelper.varAsNumber(BattleHelper.getCharacterVar(state, self, TURNS_ALREADY_ATTACKED_VAR)) ?? 0;

    const modifier: IModifier = {
        id: PASSIVE_ABILITY_ID + '-ModifySelfAttack',
        percentage:
            1 +
            (BattleHelper.getAbilityVar(state, self, ACTIVE_ABILITY_ID, 'extraDmgPct') * turnsAlreadyAttacked) / 100,
    };
    for (const hit of attack.hits) {
        BattleHelper.addModifier(modifier, hit);
    }
}

function performActive(_state: IBattleState, self: IUnitId, event: IRaidEvent): IRaidEvent | undefined {
    if (event.type === 'trigger' && event.triggerType === 'active' && BattleHelper.unitIdEquals(self, event.unitId)) {
        return {
            type: 'active',
            abilityId: ACTIVE_ABILITY_ID,
            unitId: self,
            targetIds: event.targets,
        } as IEventActiveAbility;
    }
    return undefined;
}

function finishActive(_state: IBattleState, self: IUnitId, event: IRaidEvent): IRaidEvent | undefined {
    if (
        event.type === 'finish' &&
        event.finishType === 'attack' &&
        event.abilityId === ACTIVE_ABILITY_ID &&
        BattleHelper.unitIdEquals(self, event.unitId)
    ) {
        return {
            type: 'finish',
            finishType: 'active',
            unitId: self,
            targets: event.targets,
            abilityId: ACTIVE_ABILITY_ID,
        } as IEventFinishActive;
    }
    return undefined;
}

function triggerPassive(state: IBattleState, self: IUnitId, event: IRaidEvent): IRaidEvent | undefined {
    if (event.type !== 'finish') return undefined;
    if (event.finishType !== 'active') return undefined;
    if (!BattleHelper.unitIdEquals(self, event.unitId)) return undefined;
    const adjacentEnemies = BattleHelper.getAdjacentUnits(state, self).filter(
        unitId => !BattleHelper.isFriendly(state, self, unitId)
    );
    if (adjacentEnemies.length === 0) return undefined;
    const bigTargets: IUnitId[] = adjacentEnemies.filter(enemy => BattleHelper.hasTrait(state, enemy, 'BigTarget'));
    if (bigTargets.length > 0) {
        const index = BattleHelper.getRandomInt(state, 0, bigTargets.length);
        return {
            type: 'trigger',
            triggerType: 'passive',
            unitId: self,
            targets: [bigTargets[index]],
            abilityId: PASSIVE_ABILITY_ID,
        } as IEventTriggerPassive;
    }
    return {
        type: 'trigger',
        triggerType: 'passive',
        unitId: self,
        targets: adjacentEnemies,
        abilityId: PASSIVE_ABILITY_ID,
    } as IEventTriggerPassive;
}

function performPassive(_state: IBattleState, self: IUnitId, event: IRaidEvent): IRaidEvent | undefined {
    if (event.type !== 'trigger') return undefined;
    if (event.triggerType !== 'passive') return undefined;
    if (!BattleHelper.unitIdEquals(self, event.unitId)) return undefined;
    return {
        type: 'trigger',
        triggerType: 'passive',
        unitId: self,
        targets: event.targets,
        abilityId: PASSIVE_ABILITY_ID,
    } as IEventTriggerPassive;
}

function findOriginalPassiveTargets(state: IBattleState, self: IUnitId): IUnitId[] {
    for (const event of state.currentEventChain) {
        if (
            event.type === 'trigger' &&
            event.triggerType === 'passive' &&
            event.abilityId === PASSIVE_ABILITY_ID &&
            BattleHelper.unitIdEquals(self, event.unitId)
        ) {
            return event.targets;
        }
    }
    return [];
}

function triggerFirstPassiveAttack(_state: IBattleState, self: IUnitId, event: IRaidEvent): IRaidEvent | undefined {
    if (
        event.type !== 'passive' ||
        event.abilityId !== PASSIVE_ABILITY_ID ||
        event.targets.length === 0 ||
        !BattleHelper.unitIdEquals(self, event.unitId)
    ) {
        return undefined;
    }
    return {
        type: 'trigger',
        triggerType: 'attack',
        unitId: self,
        targets: [event.targets[0]],
        ranged: false,
        abilityId: PASSIVE_ABILITY_ID,
    } as IEventTriggerAttack;
}

function triggerNextPassiveAttackOrFinishPassive(
    state: IBattleState,
    self: IUnitId,
    event: IRaidEvent
): IRaidEvent | undefined {
    if (
        event.type !== 'finish' ||
        event.finishType !== 'attack' ||
        event.abilityId !== PASSIVE_ABILITY_ID ||
        !BattleHelper.unitIdEquals(self, event.unitId)
    ) {
        return undefined;
    }
    const targets = findOriginalPassiveTargets(state, self);
    const index = targets.findIndex(target => BattleHelper.unitIdEquals(target, event.targets[0]));
    if (index === -1) {
        return { type: 'error', message: 'Original passive target for Kariyan(' + self + ') not found' } as IEventError;
    }
    if (index === targets.length - 1) return undefined;
    return {
        type: 'trigger',
        triggerType: 'attack',
        unitId: self,
        targets: [targets[index + 1]],
        ranged: false,
        abilityId: PASSIVE_ABILITY_ID,
    } as IEventTriggerAttack;
}

function performPassiveAttack(state: IBattleState, self: IUnitId, event: IRaidEvent): IRaidEvent | undefined {
    if (
        event.type !== 'trigger' ||
        event.triggerType !== 'attack' ||
        event.abilityId !== PASSIVE_ABILITY_ID ||
        !BattleHelper.unitIdEquals(self, event.unitId)
    ) {
        return undefined;
    }
    const isBigTarget = BattleHelper.hasTrait(state, event.targets[0], 'BigTarget');
    const damageType = isBigTarget ? 'Piercing' : 'Power';
    const minDmg = isBigTarget
        ? BattleHelper.getAbilityVar(state, self, PASSIVE_ABILITY_ID, 'minDmg_2')
        : BattleHelper.getAbilityVar(state, self, PASSIVE_ABILITY_ID, 'minDmg');
    const maxDmg = isBigTarget
        ? BattleHelper.getAbilityVar(state, self, PASSIVE_ABILITY_ID, 'maxDmg_2')
        : BattleHelper.getAbilityVar(state, self, PASSIVE_ABILITY_ID, 'maxDmg');
    return {
        type: 'attack',
        abilityId: PASSIVE_ABILITY_ID,
        attack: {
            attackerId: self,
            defenderId: event.targets[0],
            ranged: false,
            normal: false,
            hits: [
                {
                    id: `${self.id}-PassiveAttack`,
                    damageType: damageType,
                    minDamage: minDmg,
                    maxDamage: maxDmg,
                    critChance: BattleHelper.getCritChance(state, self),
                    critDamage: BattleHelper.getCritDamage(state, self),
                    defenderArmor: 0,
                    pierceBuffs: [],
                    buffs: [],
                    modifiers: [],
                    blocks: [],
                    blockBuffs: [],
                } as IHit,
            ],
        },
    } as IEventAttack;
}

function finishPassiveAttack(_state: IBattleState, self: IUnitId, event: IRaidEvent): IRaidEvent | undefined {
    if (
        event.type !== 'attack' ||
        !BattleHelper.unitIdEquals(self, event.attack.attackerId) ||
        event.abilityId !== PASSIVE_ABILITY_ID
    ) {
        return undefined;
    }
    return {
        type: 'finish',
        finishType: 'attack',
        unitId: self,
        targets: [event.attack.defenderId],
        abilityId: PASSIVE_ABILITY_ID,
    } as IEventFinishAttack;
}

function respondToEvent(state: IBattleState, self: IUnitId): IRaidEvent | undefined {
    const event = BattleHelper.fetchLastEvent(state);
    if (event === undefined) return undefined;

    let nextEvent: IRaidEvent | undefined;
    buffSelfAttack(state, self, event);
    if ((nextEvent = performActive(state, self, event)) !== undefined) return nextEvent;
    if ((nextEvent = finishActive(state, self, event)) !== undefined) return nextEvent;
    if ((nextEvent = triggerPassive(state, self, event)) !== undefined) return nextEvent;
    if ((nextEvent = performPassive(state, self, event)) !== undefined) return nextEvent;
    if ((nextEvent = triggerFirstPassiveAttack(state, self, event)) !== undefined) return nextEvent;
    if ((nextEvent = triggerNextPassiveAttackOrFinishPassive(state, self, event)) !== undefined) return nextEvent;
    if ((nextEvent = performPassiveAttack(state, self, event)) !== undefined) return nextEvent;
    if ((nextEvent = finishPassiveAttack(state, self, event)) !== undefined) return nextEvent;
    return undefined;
}

export function Kariyan(): IRaidCharacter {
    return {
        id: CHAR_ID,
        traits: ['MartialKatah', 'BeastSnagga', 'RapidAssault', 'Parry', 'Resilient'],
        hasRangedAttack: true,
        activeAbilityIds: [ACTIVE_ABILITY_ID],
        passiveAbilityIds: [PASSIVE_ABILITY_ID],
        activeTargetType: 'AdjacentEnemy',
        activeTargetSelection: 'PlayerChoice',
        unitVariables: [
            {
                id: TURNS_ALREADY_ATTACKED_VAR,
                label: 'Turns He Attacked',
                type: 'number',
                targets: ['self'],
            } as IRaidConfigurableVariableDescriptor,
        ],
        respondToEvent: respondToEvent,
    };
}
