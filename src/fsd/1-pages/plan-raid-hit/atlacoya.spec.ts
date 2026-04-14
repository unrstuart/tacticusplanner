import { describe, it, expect, vi, beforeEach } from 'vitest';

import { Atlacoya } from './atlacoya';
import { BattleHelper } from './battle-helper';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/*
function makeUnitId(id: string, teamId: string, uuid: string = id): IUnitId {
    return { id, teamId, uuid };
}

const TEAM_A = 'teamA';
const TEAM_B = 'teamB';

const atlacoyaId = makeUnitId('custoAtlacoya', TEAM_A, 'atlacoya-uuid');
const friendlyId = makeUnitId('someAlly', TEAM_A, 'ally-uuid');
const enemyId = makeUnitId('someEnemy', TEAM_B, 'enemy-uuid');
const psykerEnemyId = makeUnitId('somePsyker', TEAM_B, 'psyker-uuid');

function makeHit(damageType: string = 'Physical') {
    return {
        id: 'hit-1',
        damageType,
        minDamage: 100,
        maxDamage: 200,
        critChance: 0,
        critDamage: 1,
        defenderArmor: 0,
        pierceBuffs: [],
        buffs: [],
        modifiers: [],
        blocks: [],
        blockBuffs: [],
    };
}

function makeAttackEvent(
    attackerId: IUnitId,
    defenderId: IUnitId,
    options: { ranged?: boolean; normal?: boolean; damageType?: string } = {}
): IEventAttack {
    return {
        type: 'attack',
        attack: {
            attackerId,
            defenderId,
            ranged: options.ranged ?? false,
            normal: options.normal ?? true,
            hits: [makeHit(options.damageType ?? 'Physical')],
        },
    };
}

function makeState(lastEvent: import('./models').IRaidEvent): IBattleState {
    return {
        units: {},
        teams: [TEAM_A, TEAM_B],
        unitsByUuid: {},
        locations: {},
        finishedEventChains: [],
        currentEventChain: [lastEvent],
        globalVariables: {},
        characterVariables: {},
    };
}
*/
// ---------------------------------------------------------------------------
// Helpers: spy on BattleHelper methods that touch external state
// ---------------------------------------------------------------------------

function spyAll() {
    vi.spyOn(BattleHelper, 'hasTrait').mockReturnValue(false);
    vi.spyOn(BattleHelper, 'isWithinHexRange').mockReturnValue(true);
    vi.spyOn(BattleHelper, 'getAbilityVar').mockReturnValue(0.5);
    vi.spyOn(BattleHelper, 'getCritChance').mockReturnValue(0);
    vi.spyOn(BattleHelper, 'getCritDamage').mockReturnValue(1);
    vi.spyOn(BattleHelper, 'applyParry').mockReturnValue();
    vi.spyOn(BattleHelper, 'applyTerrifying').mockReturnValue();
    vi.spyOn(BattleHelper, 'addModifier').mockReturnValue();
    vi.spyOn(BattleHelper, 'addBuff').mockReturnValue();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Atlacoya', () => {
    let atlacoya: ReturnType<typeof Atlacoya>;

    beforeEach(() => {
        vi.restoreAllMocks();
        spyAll();
        atlacoya = Atlacoya();
    });

    it('exports expected static fields', () => {
        expect(atlacoya.id).toBe('custoAtlacoya');
        expect(atlacoya.traits).toContain('Parry');
        expect(atlacoya.traits).toContain('Terrifying');
        expect(atlacoya.hasRangedAttack).toBe(false);
        expect(atlacoya.activeAbilityIds).toContain('TalonsOfTheEmperor');
        expect(atlacoya.passiveAbilityIds).toContain('DaughterOfTheAbyss');
        expect(atlacoya.activeTargetType).toBe('AdjacentEnemy');
        expect(atlacoya.activeTargetSelection).toBe('PlayerChoice');
    });

    describe('passive – enemy psykers take more damage', () => {
        it.todo('adds damage modifier when a friendly attacks an enemy psyker');
        it.todo('does NOT add modifier when a friendly attacks a non-psyker');
        it.todo('does NOT add modifier when an enemy attacks an enemy psyker (not a friendly attack)');
        it.todo('modifier is idempotent (same id not added twice)');
    });

    describe('passive – Atlacoya takes reduced damage from psychic attacks', () => {
        it.todo('adds dmgReduction buff to psychic hits when Atlacoya is the defender');
        it.todo('does NOT add buff to non-psychic hits when Atlacoya is the defender');
        it.todo('applies Parry on melee attacks against Atlacoya');
        it.todo('applies Terrifying on melee attacks against Atlacoya');
        it.todo('does NOT apply Parry/Terrifying on ranged attacks against Atlacoya');
    });

    describe('passive – nearby friendlies take reduced psychic damage', () => {
        it.todo('adds buff to psychic hits on a friendly within 2 hexes');
        it.todo('does NOT add buff when friendly is beyond 2 hexes');
        it.todo('does NOT add buff to non-psychic hits on a nearby friendly');
        it.todo('does NOT double-apply when Atlacoya herself is the defender (handled by own branch)');
    });

    describe('active ability – TalonsOfTheEmperor', () => {
        describe('on "active" event', () => {
            it.todo('returns an attack trigger for a single valid target');
            it.todo('returns error when targetIds is empty');
            it.todo('returns error when targetIds has more than 1 element');
            it.todo('ignores active event for a different abilityId');
            it.todo('ignores active event for a different unit');
        });

        describe('on "trigger" attack event (perform the attack)', () => {
            it.todo('returns an attack event against the target');
            it.todo('uses Direct damage type when target is a psyker');
            it.todo('uses Power damage type when target is not a psyker');
            it.todo('populates minDmg and maxDmg from ability vars');
        });

        describe('on "attack" event (non-normal attack by Atlacoya)', () => {
            it.todo('returns a finishAttack event');
            it.todo('does NOT return finishAttack for normal attacks');
            it.todo('does NOT return finishAttack when Atlacoya is not the attacker');
        });

        describe('on "finish" attack event', () => {
            it.todo('returns a finishActive event');
            it.todo('propagates targets from the finishAttack event');
            it.todo('ignores finish events for other units');
        });
    });

    describe('no-op cases', () => {
        it.todo('returns undefined when the event chain is empty');
        it.todo('returns undefined for unrecognized event types');
    });
});
