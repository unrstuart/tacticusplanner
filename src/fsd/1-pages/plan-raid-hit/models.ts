export interface IUnitId {
    id: string;
    teamId: string;
    /**
     * Since we may have multiple of the same unit, we need a unique identifier for each instance
     * of a unit.
     */
    uuid: string;
}

/** Describes a block in terms of chance [0,1] and damage [0, inf]. */
export interface IBlock {
    chance: number;
    damage: number;
}

/* Describes a block buff that is an increase in block chance and or block damage. */
export interface IBlockBuff {
    id: string;
    chance: number;
    damage: number;
}

/** Describes a flat damage buff or debuff in terms of an id and an amount. */
export interface IBuff {
    id: string;
    amount: number;
}

/**
 * Describes a flat change to pierce. For example, 0.2 means +20%
 * pierce. -0.1 means -10% pierce.
 */
export interface IPierceBuff {
    id: string;
    amount: number;
}

/**
 * Describes a percentage damage modifier
 *   1 represents +0%
 *   2 represents +100%
 *   0.5 represents -50%
 *   0.3 represents -70%
 *   etc.
 */
export interface IModifier {
    id: string;
    percentage: number;
}

export interface IHit {
    id: string;
    damageType: string;
    minDamage: number;
    maxDamage: number;
    critChance: number;
    critDamage: number;
    defenderArmor: number;
    pierceBuffs: IPierceBuff[];
    buffs: IBuff[];
    modifiers: IModifier[];
    blocks: IBlock[];
    blockBuffs: IBlockBuff[];
}

export interface IAttack {
    attackerId: IUnitId;
    defenderId: IUnitId;
    ranged: boolean;
    normal: boolean;
    hits: IHit[];
}

/**
 * Documentation for how raid events work. This is all state-based,
 *
 * 1) Any multi-part action must be broken down into its atomic pieces. respondToEvent is then called
 *    on all characters so they can respond to each event. The order in which characters respond to
 *    events is dictated in deployment order, with the exception of the triggering character, who
 *    responds last.
 *
 * 2) Every in-game action comprises a three events, and potentially more if the action has multiple
 *    parts. The three event types are "triggerX", "performX", and "finishX". Any particular event may
 *    add multiple combinations of such events (e.g. Kharn's normal attack will trigger, perform, and
 *    finish, and then his passive procs if an adjacent enemy is still
 *    there, so it will trigger, perform, and finish).
 *
 * 3) It is possible that responding to an event cancels some phase of the event. For example, if someone
 *    performs a regular melee attack against Calandis, first the trigger event happens. Then Calandis
 *    responds with a trigger for her passive, then she performs her passive, then she trigger an attack,
 *    performs it, and finishes, then her passive finishes. If the enemy dies, the enemie's "perform"
 *    does not happen, nor does the enemy's "finish". This is important, you cannot assume that if you
 *    see a trigger, you will see the perform itself, nor the finish.
 *
 * 4) An active ability will have a trigger-perform-finish sequence for the active itself, with the
 *    individual actions of the ability interspersed. Because of the way Trajann and other buffers
 *    interact with actives, the active will finish after the first attack of the active completes, or if
 *    the active does not trigger an attack, after the first effect of the active finishes.
 *
 * 5) The framework takes care of generating trigger events for the three basic actions: move, attack,
 *    and use active. You do not generate triggers for those specific things, but you may generate trigger
 *    events for follow on actions. Using an active abilty and attacking with that active ability are
 *    two separate things. So your code *should* generate a trigger event for the attack after the
 *    framework generates the perform event for the active. Attacks from active abilities should finish
 *    before the active finishes. Furthermore, the first *attack* (not hit, attack), should finish before
 *    the active finishes.
 *
 * 6) We use specific event types for trigger and finish. You can look for them by `type`. `perform`
 *    events are specific to the type. E.g., `performAttack` uses IEventAttack.
 *
 *    For example:
 *
 *    Kharn's active:
 *      trigger active
 *      then perform active
 *      then trigger piercing attack against target
 *      then perform attack
 *      then finish attack
 *      then finish active <---- Even though the active ability isn't over, we finish here due to
 *                               the interplay with buffers.
 *      then trigger eviscerating attack against (a potentially different) target
 *      then perform attack
 *      then finish attack
 *      then trigger plasma attack against (a potentially different) target
 *      then perform attack
 *      then finish attack
 *
 *    Kariyan's active:
 *      trigger active
 *      then perform active (which grants a modifer to damage)
 *      then trigger eviscerating attack against target
 *      then perform attack
 *      then finish attack
 *      then finish active
 *      (then kariyan's passive takes over)
 *
 *    Ragnar's active:
 *      trigger active
 *      then perform active (which grants a buff to melee-only allies)
 *      then finish active
 *      (neither attacking nor moving are part of his active)
 *
 * We represent all triggers events identically, and all finish events identically. They have an
 * event type (which cannot be 'trigger'/'finish') and the unit ID.
 *
 * You do not have to write any code for movement, for normal attacks, or for the trigger of an
 * active ability. You *do* need to write code for the perform and finish of an active ability, and
 * if a normal attack or movement has an additional effect from the character's traits/passive. You
 * would write that code in respondToEvent during the appropriate phase (trigger, perform, finish).
 *
 * HOW TO PROPAGATE BUFFS AND MODIFIERS
 *
 * The answer is, as always, it depends. If a buff or modifier is granted by terrain, the framework
 * will apply the buff/modifier to the active. If a buff or modifier is granted by a trait or
 * passive that triggers on attack (such as Atlacoya's passive), you should write the logic to do so
 * in your respondToEvent handler. If a a buff/modifier is granted by e.g. an active ability and
 * applies at the time the unit used the ability, as opposed to when the affected character performs
 * an action, you should apply the buff modifier
 *
 * HOW TO HANDLE TRAITS
 *
 * The framework will handle all purely trait-related modifications. For example, things like Parry,
 * Terrifying, Blessings of Khorne, etc.
 *
 * TURN START/END
 * Turns starting and ending have a trigger and finish. If your character has an active ability that
 * lasts until the start of their next turn, you should take care to clear the ability at the
 * trigger, not at the perform. The perform is for things like Kharn's passive, where he moves and
 * attacks.
 */

export type NonTriggerNonFinishEventType =
    | 'error'
    | 'attack'
    | 'move'
    | 'startOfTurn'
    | 'endOfTurn'
    | 'active'
    | 'passive';

export type EventType = NonTriggerNonFinishEventType | 'trigger' | 'finish';

export interface IEventTriggerAttack {
    type: 'trigger';
    triggerType: 'attack';
    unitId: IUnitId;
    targets: IUnitId[];
    ranged: boolean;
    /**
     * Absent for framework-generated normal attack triggers. Present when a unit generates
     * this trigger in response to a performActive event, identifying the spawning ability.
     * Presence implies this is a non-normal attack.
     */
    abilityId?: string;
}

export interface IEventTriggerMove {
    type: 'trigger';
    triggerType: 'move';
    unitId: IUnitId;
    /** The tile the unit is moving from. We need this for some buffers (like Trajann). */
    origin: { x: number; y: number };
    /** The tile the unit is moving to. Overwatch responders use this to check range. */
    destination: { x: number; y: number };
}

export interface IEventTriggerActive {
    type: 'trigger';
    triggerType: 'active';
    unitId: IUnitId;
    targets: IUnitId[];
    abilityId: string;
}

export interface IEventTriggerPassive {
    type: 'trigger';
    triggerType: 'passive';
    unitId: IUnitId;
    targets: IUnitId[];
    abilityId: string;
}

export interface IEventTriggerStartOfTurn {
    type: 'trigger';
    triggerType: 'startOfTurn';
    teamId: string;
}

export interface IEventTriggerEndOfTurn {
    type: 'trigger';
    triggerType: 'endOfTurn';
    teamId: string;
}

export type IEventTrigger =
    | IEventTriggerAttack
    | IEventTriggerMove
    | IEventTriggerActive
    | IEventTriggerPassive
    | IEventTriggerStartOfTurn
    | IEventTriggerEndOfTurn;

export interface IEventFinishAttack {
    type: 'finish';
    finishType: 'attack';
    unitId: IUnitId;
    targets: IUnitId[];
    ranged: boolean;
    /**
     * Absent for framework-generated normal attack triggers. Present when a unit generates
     * this trigger in response to a performActive event, identifying the spawning ability.
     * Presence implies this is a non-normal attack.
     */
    abilityId?: string;
}

export interface IEventFinishMove {
    type: 'finish';
    finishType: 'move';
    unitId: IUnitId;
    /** The tile the unit is moving to. Overwatch responders use this to check range. */
    destination: { x: number; y: number };
}

export interface IEventFinishActive {
    type: 'finish';
    finishType: 'active';
    unitId: IUnitId;
    targets: IUnitId[];
    abilityId: string;
}

export interface IEventFinishPassive {
    type: 'finish';
    finishType: 'passive';
    unitId: IUnitId;
    targets: IUnitId[];
    abilityId: string;
}

export interface IEventFinishStartOfTurn {
    type: 'finish';
    finishType: 'startOfTurn';
    teamId: string;
}

export interface IEventFinishEndOfTurn {
    type: 'finish';
    finishType: 'endOfTurn';
    teamId: string;
}

export type IEventFinish =
    | IEventFinishAttack
    | IEventFinishMove
    | IEventFinishActive
    | IEventFinishPassive
    | IEventFinishStartOfTurn
    | IEventFinishEndOfTurn;

export interface IEventError {
    type: 'error';
    message: string;
}

export interface IEventAttack {
    type: 'attack';
    attack: IAttack;
    abilityId?: string; // Present if this attack is from an ability, absent if it's a normal attack.
}

export interface IEventMove {
    type: 'move';
    unitId: IUnitId;
}

export interface IEventStartOfTurn {
    type: 'startOfTurn';
    teamId: string;
}

export interface IEventEndOfTurn {
    type: 'endOfTurn';
    teamId: string;
}

export interface IEventActiveAbility {
    type: 'active';
    unitId: IUnitId;
    abilityId: string;
    targetIds: IUnitId[];
}

export interface IEventPassiveAbility {
    type: 'passive';
    unitId: IUnitId;
    targets: IUnitId[];
    abilityId: string;
}

export type IRaidEvent =
    | IEventTrigger
    | IEventFinish
    | IEventError
    | IEventAttack
    | IEventMove
    | IEventStartOfTurn
    | IEventEndOfTurn
    | IEventActiveAbility
    | IEventPassiveAbility;

export type IRaidVariableValue = undefined | boolean | number | string | string[];
export type IRaidVariableDescriptor = 'boolean' | 'number' | 'string';
export type IRaidVariableTarget = 'self' | 'friendly' | 'enemy';
export type IRaidVariableTargets = IRaidVariableTarget[];

export interface IRaidConfigurableVariableDescriptor {
    /** What the code calls it. */
    id: string;
    /** How a human reads it. */
    label: string;
    /** What type the variable accepts. This drives the UI. */
    type: IRaidVariableDescriptor;
    /** Who the variable can target. This tells the UI on whom we can apply the variable. */
    targets: IRaidVariableTargets;
}

export interface IBattleState {
    /**
     * The units on the board, keyed by snowprint ID. There could be multiple units with the same
     * snowprint ID, e.g. both sides running the same unit, or multiple friendly skittles.
     */
    units: Record<string, IUnitId[]>;

    /** The IDs of the team, set by the framework. */
    teams: string[];

    /** The same as `units` above, but keyed by UUID instead of snowprint ID. */
    unitsByUuid: Record<string, IUnitId>;

    /**
     * Unit locations on the board. Keyed by *uuid*, *not* snowprint ID. Use BattleHelper to
     * determine distance between two points, don't try to compute it yourself.
     */
    locations: Record<string, { x: number; y: number }>;

    /**
     * A list of all events that have both performed and finished. This is only populated when no
     * unit responds to a *finish* event.
     */
    finishedEventChains: IRaidEvent[];

    /**
     * A list of all events currently happening, i.e. some sequence events of starting from one
     * particular event, and not all events have finished yet. This may include finished events,
     * for example multiple attacks of an active-ability chain.
     */
    currentEventChain: IRaidEvent[];

    /**
     * All global variables that have a value in the current sim. See global_vars.ts for a list of
     * all of the variables known to the framework. You can only set a variable if you register it
     * in global_vars.ts.
     */
    globalVariables: Record<string, IRaidVariableValue>;

    /**
     * Character-specific variables, keyed by character uuid, then by variable name. You can set
     * any variable you want here, but it's recommended to prefix the variable name with the
     * character name to avoid conflicts. This is primarily for effects like High Marshall
     * Helbrecht's active, that takes effect and then lingers until the end of the next round.
     */
    characterVariables: Record<string, Record<string, IRaidVariableValue>>;
}

export type ActiveTargetType =
    | 'AdjacentEnemy'
    | 'EnemyInRangeTwo'
    | 'EnemyInRangeThree'
    | 'AnyEnemy'
    | 'AdjacentAlly'
    | 'AllyInRangeTwo'
    | 'AllyInRangeThree'
    | 'AnyAlly';

export type ActiveTargetSelection = 'Random' | 'PlayerChoice';

export interface IRaidCharacter {
    id: string; // The snowprintId of the character.
    hasRangedAttack: boolean;
    activeTargetType: ActiveTargetType | undefined;
    activeTargetSelection: ActiveTargetSelection | undefined;
    activeAbilityIds: string[];
    passiveAbilityIds: string[];
    traits: string[];
    unitVariables: IRaidConfigurableVariableDescriptor[];

    /**
     * @param state The current battle state, of particualr interest is `state.currentEventChain`.
     * The character may respond by modifying the events in currentEventChain as opposed to
     * generating new events. For example, Dante's passive will buff an attack of a nearby
     * character with rapid assault.
     *
     * @returns the next event to happen.
     */
    respondToEvent: (state: IBattleState, self: IUnitId) => IRaidEvent | undefined;
}

export interface IRaidCharacterInstance extends IRaidCharacter {
    uuid: string;
    teamId: string;
}
