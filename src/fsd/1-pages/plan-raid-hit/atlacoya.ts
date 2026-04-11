import { BattleHelper } from './battle-helper';
import {
    IAttack,
    IBattleState,
    IBuff,
    IEventActiveAbility,
    IEventAttack,
    IEventError,
    IEventFinishActive,
    IEventFinishAttack,
    IEventTriggerAttack,
    IHit,
    IModifier,
    IRaidCharacter,
    IRaidEvent,
    IUnitId,
} from './models';

const CHAR_ID = 'custoAtlacoya';
const ACTIVE_ABILITY_ID = 'TalonsOfTheEmperor';
const PASSIVE_ABILITY_ID = 'DaughterOfTheAbyss';

function respondToEvent(state: IBattleState, self: IUnitId): IRaidEvent | undefined {
    const event = BattleHelper.fetchLastEvent(state);
    if (event === undefined) return undefined;
    if (event.type === 'attack') {
        const attack = (event as IEventAttack).attack;

        // Buff friendly units attacking psykers.
        if (
            !BattleHelper.isFriendly(state, self, attack.defenderId) &&
            BattleHelper.hasTrait(state, attack.defenderId, 'Psyker')
        ) {
            const modifier = { id: PASSIVE_ABILITY_ID + '-EnemyPsykersTakeMoreDamage', percentage: 1.2 } as IModifier;
            for (const hit of attack.hits) {
                BattleHelper.addModifier(modifier, hit);
            }
            return;
        }

        // Atlacoya takes reduced damage from psychic attacks.
        if (BattleHelper.unitIdEquals(self, attack.defenderId)) {
            const buff: IBuff = {
                id: PASSIVE_ABILITY_ID + '-SelfTakesReducedPsychicDamage',
                amount: BattleHelper.getAbilityVar(state, self, PASSIVE_ABILITY_ID, 'dmgReduction'),
            };
            for (const hit of attack.hits) {
                if (hit.damageType === 'Psychic') {
                    BattleHelper.addBuff(buff, hit);
                }
            }

            if (!attack.ranged) {
                BattleHelper.applyParry(state, attack, self);
                BattleHelper.applyTerrifying(state, attack, self);
            }

            return;
        }

        // Friendlies within two hexes take reduced damage from psychic attacks.
        if (
            !BattleHelper.unitIdEquals(self, attack.defenderId) &&
            BattleHelper.isFriendly(state, self, attack.defenderId) &&
            BattleHelper.isWithinHexRange(state, self, attack.defenderId, 2)
        ) {
            const buff: IBuff = {
                id: PASSIVE_ABILITY_ID + '-SelfTakesReducedPsychicDamage',
                amount: BattleHelper.getAbilityVar(state, self, PASSIVE_ABILITY_ID, 'dmgReduction'),
            };
            for (const hit of attack.hits) {
                if (hit.damageType === 'Psychic') {
                    BattleHelper.addBuff(buff, hit);
                }
            }

            return;
        }

        // She performed her active attack, finish the attack.
        if (BattleHelper.unitIdEquals(self, attack.attackerId) && !attack.normal) {
            return {
                type: 'finish',
                finishType: 'attack',
                unitId: self,
                targets: [attack.defenderId],
                ranged: false,
                abilityId: ACTIVE_ABILITY_ID,
            } as IEventFinishAttack;
        }

        return;
    }

    // Performing her active, generate an attack trigger.
    if (
        event.type === 'active' &&
        event.abilityId === ACTIVE_ABILITY_ID &&
        BattleHelper.unitIdEquals(self, event.unitId)
    ) {
        const active = event as IEventActiveAbility;
        if (active.targetIds.length !== 1) {
            return { type: 'error', message: "Invalid number of targets for Atlacoya's active ability" } as IEventError;
        }
        return {
            type: 'trigger',
            triggerType: 'attack',
            unitId: self,
            targets: active.targetIds,
            ranged: false,
            abilityId: ACTIVE_ABILITY_ID,
        } as IEventTriggerAttack;
    }

    // Her active attack has triggered, perform the attack.
    if (event.type === 'trigger' && event.triggerType === 'attack' && BattleHelper.unitIdEquals(self, event.unitId)) {
        const targetIsPsyker = BattleHelper.hasTrait(state, event.targets[0], 'Psyker');
        return {
            type: 'attack',
            abilityId: ACTIVE_ABILITY_ID,
            attack: {
                attackerId: self,
                defenderId: event.targets[0],
                ranged: false,
                normal: false,
                hits: [
                    {
                        id: `${self.id}-TalonsOfTheEmperor-Attack`,
                        damageType: targetIsPsyker ? 'Direct' : 'Power',
                        minDamage: BattleHelper.getAbilityVar(state, self, ACTIVE_ABILITY_ID, 'minDmg'),
                        maxDamage: BattleHelper.getAbilityVar(state, self, ACTIVE_ABILITY_ID, 'maxDmg'),
                        critDamage: BattleHelper.getCritDamage(state, self),
                        critChance: BattleHelper.getCritChance(state, self),
                        defenderArmor: 0,
                        pierceBuffs: [],
                        buffs: [],
                        modifiers: [],
                        blocks: [],
                        blockBuffs: [],
                    } as IHit,
                ],
            } as IAttack,
        } as IEventAttack;
    }

    // Her active attack has finished, finish her active.
    if (event.type === 'finish' && event.finishType === 'attack' && BattleHelper.unitIdEquals(self, event.unitId)) {
        return {
            type: 'finish',
            finishType: 'active',
            unitId: self,
            targets: event.targets,
            abilityId: ACTIVE_ABILITY_ID,
        } as IEventFinishActive;
    }
}

export function Atlacoya(): IRaidCharacter {
    return {
        id: CHAR_ID,
        traits: ['Parry', 'Terrifying'],
        hasRangedAttack: false,
        unitVariables: [],
        activeAbilityIds: [ACTIVE_ABILITY_ID],
        passiveAbilityIds: [PASSIVE_ABILITY_ID],
        activeTargetType: 'AdjacentEnemy',
        activeTargetSelection: 'PlayerChoice',
        respondToEvent: respondToEvent,
    };
}
