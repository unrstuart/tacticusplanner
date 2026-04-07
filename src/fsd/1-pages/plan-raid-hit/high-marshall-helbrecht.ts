import { BattleHelper } from './battle-helper';
import {
    IBattleState,
    IBuff,
    IEventAttack,
    IPierceBuff,
    IRaidCharacter,
    IRaidConfigurableVariableDescriptor,
    IRaidEvent,
    IUnitId,
} from './models';

const CHAR_ID = 'templHelbrecht';
const ACTIVE_ABILITY_ID = 'CrusadeOfWrath'; // extraDmg, extraPierceRatio
const PASSIVE_ABILITY_ID = 'DestroyTheWitch'; // extraDmg, extraMovement

function respondToEvent(state: IBattleState, self: IUnitId): IRaidEvent | undefined {
    const event = BattleHelper.fetchLastEvent(state);
    if (event === undefined) return undefined;
    if (event.type === 'attack') {
        const attack = (event as IEventAttack).attack;
        // If the attacker has crusade of wrath buff their melee attacks and pierce ratio.
        if (
            !attack.ranged &&
            BattleHelper.isFriendly(state, self, attack.attackerId) &&
            BattleHelper.getCharacterVar(state, attack.attackerId, ACTIVE_ABILITY_ID)
        ) {
            const buff: IBuff = {
                id: ACTIVE_ABILITY_ID + '-MeleeAttacksDealMoreDamage',
                amount: BattleHelper.getAbilityVar(state, attack.attackerId, ACTIVE_ABILITY_ID, 'extraDmg'),
            };
            const pierceBuff: IPierceBuff = {
                id: ACTIVE_ABILITY_ID + '-MeleeAttacksPierceMore',
                amount:
                    BattleHelper.getAbilityVar(state, attack.attackerId, ACTIVE_ABILITY_ID, 'extraPierceRatio') / 100,
            };
            for (const hit of attack.hits) {
                BattleHelper.addBuff(buff, hit);
                BattleHelper.addPierceBuff(pierceBuff, hit);
            }
            // Don't return, we also need to check his passive.
        }

        // If the attacker is adjacent and hitting a psyker, buff their hits.
        if (
            !attack.ranged &&
            BattleHelper.isFriendly(state, self, attack.attackerId) &&
            BattleHelper.hasTrait(state, attack.defenderId, 'Psyker') &&
            (BattleHelper.isAdjacent(state, self, attack.attackerId) ||
                BattleHelper.unitIdEquals(self, attack.attackerId)) // self buff
        ) {
            const buff: IBuff = {
                id: PASSIVE_ABILITY_ID + '-MeleeAttacksDealMoreDamageToPsykers',
                amount: BattleHelper.getAbilityVar(state, self, PASSIVE_ABILITY_ID, 'extraDmg'),
            };
            for (const hit of attack.hits) {
                BattleHelper.addBuff(buff, hit);
            }
        }
        return;
    }
}

export function HighMarshallHelbrecht(): IRaidCharacter {
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
