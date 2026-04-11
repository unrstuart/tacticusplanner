import { BattleHelper } from './battle-helper';
import {
    IAttack,
    IBattleState,
    IBuff,
    IEventActiveAbility,
    IEventAttack,
    IEventFinishActive,
    IEventTriggerAttack,
    IPierceBuff,
    IRaidCharacter,
    IRaidConfigurableVariableDescriptor,
    IRaidEvent,
    IUnitId,
} from './models';

const CHAR_ID = 'templHelbrecht';
const ACTIVE_ABILITY_ID = 'CrusadeOfWrath'; // extraDmg, extraPierceRatio
const PASSIVE_ABILITY_ID = 'DestroyTheWitch'; // extraDmg, extraMovement

function respondToBuffedFriendlyAttack(state: IBattleState, self: IUnitId, attack: IAttack): void {
    if (
        attack.ranged ||
        !BattleHelper.isFriendly(state, self, attack.attackerId) ||
        !BattleHelper.varAsBoolean(BattleHelper.getCharacterVar(state, attack.attackerId, ACTIVE_ABILITY_ID))
    ) {
        return;
    }
    // If the attacker has crusade of wrath, we need to buff their melee attacks and pierce ratio.
    const buff: IBuff = {
        id: ACTIVE_ABILITY_ID + '-MeleeAttacksDealMoreDamage',
        amount: BattleHelper.getAbilityVar(state, attack.attackerId, ACTIVE_ABILITY_ID, 'extraDmg'),
    };
    const pierceBuff: IPierceBuff = {
        id: ACTIVE_ABILITY_ID + '-MeleeAttacksPierceMore',
        amount: BattleHelper.getAbilityVar(state, attack.attackerId, ACTIVE_ABILITY_ID, 'extraPierceRatio') / 100,
    };
    for (const hit of attack.hits) {
        BattleHelper.addBuff(buff, hit);
        BattleHelper.addPierceBuff(pierceBuff, hit);
    }
}

function respondToFriendlyAttackingAnyPsyker(state: IBattleState, self: IUnitId, attack: IAttack): void {
    // If the attacker is adjacent or self and hitting a psyker, buff their hits.
    if (
        attack.ranged ||
        !BattleHelper.isFriendly(state, self, attack.attackerId) ||
        !BattleHelper.hasTrait(state, attack.defenderId, 'Psyker') ||
        !(BattleHelper.isAdjacent(state, self, attack.attackerId) || BattleHelper.unitIdEquals(self, attack.attackerId))
    ) {
        return;
    }
    const buff: IBuff = {
        id: PASSIVE_ABILITY_ID + '-MeleeAttacksDealMoreDamageToPsykers',
        amount: BattleHelper.getAbilityVar(state, self, PASSIVE_ABILITY_ID, 'extraDmg'),
    };
    for (const hit of attack.hits) {
        BattleHelper.addBuff(buff, hit);
    }
}

function triggerMeleeAttackAgainstRandomAdjacentEnemy(state: IBattleState, self: IUnitId): IRaidEvent | undefined {
    // He finished his active, now trigger a melee attack against a random enemy.
    const enemies = BattleHelper.getAdjacentUnits(state, self).filter(
        unitId => !BattleHelper.isFriendly(state, self, unitId)
    );
    if (enemies.length > 0) {
        const randomIndex = BattleHelper.getRandomInt(state, 0, enemies.length);
        return {
            type: 'trigger',
            triggerType: 'attack',
            unitId: self,
            targets: [enemies[randomIndex]],
            ranged: false,
            abilityId: ACTIVE_ABILITY_ID,
        } as IEventTriggerAttack;
    }
    return undefined;
}

function performActive(state: IBattleState, self: IUnitId): void {
    // Buff friendlies within range 2.
    const adjacentUnits: IUnitId[] = BattleHelper.getUnitsWithinHexRange(state, self, 2);
    const friendlies = adjacentUnits.filter(
        unitId => BattleHelper.isFriendly(state, self, unitId) && !BattleHelper.unitIdEquals(self, unitId)
    );
    for (const friendly of friendlies) {
        BattleHelper.setCharacterVar(state, friendly, ACTIVE_ABILITY_ID, true);
    }
}

function respondToEvent(state: IBattleState, self: IUnitId): IRaidEvent | undefined {
    const event = BattleHelper.fetchLastEvent(state);
    if (event === undefined) return undefined;
    if (event.type === 'attack') {
        const attack = (event as IEventAttack).attack;
        respondToBuffedFriendlyAttack(state, self, attack);
        respondToFriendlyAttackingAnyPsyker(state, self, attack);
        return;
    }

    if (event.type === 'trigger' && event.triggerType === 'active' && BattleHelper.unitIdEquals(event.unitId, self)) {
        // He triggered his active, so we need to perform his active.
        return {
            type: 'active',
            unitId: event.unitId,
            abilityId: ACTIVE_ABILITY_ID,
            targetIds: BattleHelper.getAdjacentUnits(state, self).filter(unitId =>
                BattleHelper.isFriendly(state, self, unitId)
            ),
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
            targets: [],
            abilityId: ACTIVE_ABILITY_ID,
        } as IEventFinishActive;
    }

    if (event.type === 'finish' && event.finishType === 'active' && event.unitId === self) {
        return triggerMeleeAttackAgainstRandomAdjacentEnemy(state, self);
    }
    return undefined;
}

export function Helbrecht(): IRaidCharacter {
    return {
        id: CHAR_ID,
        traits: ['Parry', 'FinalJustice'],
        hasRangedAttack: true,
        activeAbilityIds: [ACTIVE_ABILITY_ID],
        passiveAbilityIds: [PASSIVE_ABILITY_ID],
        activeTargetType: 'AdjacentEnemy',
        activeTargetSelection: 'PlayerChoice',
        unitVariables: [
            {
                id: ACTIVE_ABILITY_ID,
                label: 'Crusade of Wrath',
                type: 'boolean',
                targets: ['self', 'friendly'],
            } as IRaidConfigurableVariableDescriptor,
        ],
        respondToEvent: respondToEvent,
    };
}
