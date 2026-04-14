/* eslint-disable import-x/no-internal-modules */
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { StoreContext } from '@/reducers/store.provider';
import { getImageUrl } from '@/shared-logic/functions';

import { FactionId, Rank, Rarity, RarityStars, rankToString } from '@/fsd/5-shared/model';
import { RankIcon, RarityIcon, StarsIcon } from '@/fsd/5-shared/ui/icons';

import { CharactersService, ICharacter2 } from '@/fsd/4-entities/character';

import raidHitData from '@/fsd/1-pages/plan-raid-hit/data/raid-hit.json';

import { BattleHelper } from './battle-helper';
import {
    classify,
    ConfigVisualJson,
    DEPLOY_FILL,
    DEPLOY_STROKE,
    deriveMetrics,
    EDGE_COLOR,
    EDGE_WIDTH,
    HEX_DRAW_SCALE,
    HexMetrics,
    hexVerts,
    HIGHLIGHT_WIDTH,
    LevelJson,
    SPAWN_FILL,
    SPAWN_STROKE,
    tileCenter,
} from './hex-map-core';
import { IBattleState, IUnitId } from './models';
import { REGISTERED_UNITS } from './registered-units';

interface Boss {
    id: string;
    name: string;
    faction: FactionId;
    map_prefix: string;
    image_name: string;
    tiles: 1 | 3 | 7;
}
interface Prime {
    id: string;
    name: string;
    bossId: string;
}

const ALLOWED_CHARS = new Set<string>(REGISTERED_UNITS.map(unit => unit.id));

const BOSS_INFO: Boss[] = [
    {
        id: 'boss_death_guard',
        name: 'Mortarion',
        faction: 'Death Guard',
        map_prefix: 'GB_Mortarion',
        image_name: 'GuildBoss5Boss1DeathMortarion_GameModeHead',
        tiles: 7,
    },
    {
        id: 'boss_thousand_sons',
        name: 'Magnus the Red',
        faction: 'Thousand Sons',
        map_prefix: 'GB_Magnus',
        image_name: 'GuildBoss9Boss1ThousMagnus_GameModeHead',
        tiles: 7,
    },
    {
        id: 'boss_necrons',
        name: 'The Silent King',
        faction: 'Necrons',
        map_prefix: 'GB_SK',
        image_name: 'GuildBoss3Boss1NecroSilentKing_GameModeHead',
        tiles: 1,
    },
    {
        id: 'boss_orks',
        name: 'Ghazghkull Thraka',
        faction: 'Orks',
        map_prefix: 'GB_Dakka',
        image_name: 'GuildBoss4Boss1OrksGhazghkull_GameModeHead',
        tiles: 3,
    },
];

const DUMMY_PRIMES: Prime[] = [
    // Lord of Change
    {
        id: 'prime_loc_alpha',
        name: 'Lord of Change Alpha',
        bossId: 'boss_chaos_daemon',
    },
    {
        id: 'prime_loc_beta',
        name: 'Lord of Change Beta',
        bossId: 'boss_chaos_daemon',
    },
    // Mortarion
    {
        id: 'prime_mort_alpha',
        name: 'Mortarion Alpha',
        bossId: 'boss_death_guard',
    },
    { id: 'prime_mort_beta', name: 'Mortarion Beta', bossId: 'boss_death_guard' },
    // Magnus
    { id: 'prime_mag_alpha', name: 'Magnus Alpha', bossId: 'boss_thousand_sons' },
    { id: 'prime_mag_beta', name: 'Magnus Beta', bossId: 'boss_thousand_sons' },
    // Hive Tyrant
    { id: 'prime_ht_alpha', name: 'Hive Tyrant Alpha', bossId: 'boss_tyranids' },
    { id: 'prime_ht_beta', name: 'Hive Tyrant Beta', bossId: 'boss_tyranids' },
    // Silent King
    { id: 'prime_sk_alpha', name: 'Silent King Alpha', bossId: 'boss_necrons' },
    { id: 'prime_sk_beta', name: 'Silent King Beta', bossId: 'boss_necrons' },
    // Ghazghkull
    { id: 'prime_ghaz_alpha', name: 'Ghazghkull Alpha', bossId: 'boss_orks' },
    { id: 'prime_ghaz_beta', name: 'Ghazghkull Beta', bossId: 'boss_orks' },
];

// ─────────────────────────────────────────────────────────────────────────────
// SELECT COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

interface SelectProps<T extends string> {
    label: string;
    value: T | '';
    onChange: (value: T | '') => void;
    options: Array<{ value: T; label: string; sub?: string; imageUrl?: string }>;
    placeholder: string;
    disabled?: boolean;
}

const CHEVRON_SVG = (
    <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-[#c8a84b]">
        <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
            <path
                d="M1 1L6 7L11 1"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    </span>
);

function Select<T extends string>({ label, value, onChange, options, placeholder, disabled }: SelectProps<T>) {
    const hasImages = options.some(o => o.imageUrl);
    const [isOpen, setIsOpen] = useState(false);
    const selectedOption = options.find(o => o.value === value);

    if (!hasImages) {
        return (
            <div className="flex min-w-[200px] flex-1 flex-col gap-[6px]">
                <label className="font-[Rajdhani] text-[10px] font-semibold tracking-[0.18em] text-[#c8a84b] uppercase">
                    {label}
                </label>
                <div className={`relative${disabled ? 'pointer-events-none opacity-40' : ''}`}>
                    <select
                        value={value}
                        onChange={event => onChange((event.target.value || '') as T | '')}
                        disabled={disabled}
                        className="w-full cursor-pointer appearance-none rounded-[6px] border border-[#2e3352] bg-[#0b0c10] py-[9px] pr-9 pl-3 font-[Nunito] text-[13px] font-medium text-[#d4d8e8] transition-[border-color,box-shadow] duration-150 outline-none hover:border-[#c8a84b] focus:border-[#c8a84b] focus:shadow-[0_0_0_2px_rgba(200,168,75,0.12)]">
                        <option value="">{placeholder}</option>
                        {options.map(o => (
                            <option key={o.value} value={o.value}>
                                {o.label}
                                {o.sub ? ` — ${o.sub}` : ''}
                            </option>
                        ))}
                    </select>
                    {CHEVRON_SVG}
                </div>
            </div>
        );
    }

    // Custom image-capable dropdown
    return (
        <div className="flex min-w-[200px] flex-1 flex-col gap-[6px]">
            <label className="font-[Rajdhani] text-[10px] font-semibold tracking-[0.18em] text-[#c8a84b] uppercase">
                {label}
            </label>
            <div className={`relative${disabled ? 'pointer-events-none opacity-40' : ''}`}>
                <button
                    type="button"
                    onClick={() => setIsOpen(previous => !previous)}
                    onBlur={() => setIsOpen(false)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-[6px] border border-[#2e3352] bg-[#0b0c10] py-[7px] pr-9 pl-3 font-[Nunito] text-[13px] font-medium transition-[border-color,box-shadow] duration-150 outline-none hover:border-[#c8a84b] focus:border-[#c8a84b] focus:shadow-[0_0_0_2px_rgba(200,168,75,0.12)]">
                    {selectedOption?.imageUrl && (
                        <img
                            src={selectedOption.imageUrl}
                            alt=""
                            className="h-[22px] w-[44px] shrink-0 rounded-sm object-cover"
                        />
                    )}
                    <span className={selectedOption ? 'text-[#d4d8e8]' : 'text-[#5c6280]'}>
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </button>
                {CHEVRON_SVG}
                {isOpen && (
                    <div className="absolute top-full right-0 left-0 z-50 mt-1 overflow-hidden rounded-[6px] border border-[#2e3352] bg-[#0d0f1a] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                        <div
                            role="option"
                            aria-selected={!value}
                            onMouseDown={event => event.preventDefault()}
                            onClick={() => {
                                onChange('' as T | '');
                                setIsOpen(false);
                            }}
                            className="cursor-pointer px-3 py-2 text-[13px] text-[#5c6280] hover:bg-[#1a1e30]">
                            {placeholder}
                        </div>
                        {options.map(o => (
                            <div
                                key={o.value}
                                role="option"
                                aria-selected={o.value === value}
                                onMouseDown={event => event.preventDefault()}
                                onClick={() => {
                                    onChange(o.value);
                                    setIsOpen(false);
                                }}
                                className={`flex cursor-pointer items-center gap-2 px-3 py-[7px] text-[13px] font-medium transition-colors ${
                                    o.value === value
                                        ? 'bg-[#1a1e30] text-[#c8a84b]'
                                        : 'text-[#d4d8e8] hover:bg-[#1a1e30]'
                                }`}>
                                {o.imageUrl && (
                                    <img
                                        src={o.imageUrl}
                                        alt=""
                                        className="h-[24px] w-[48px] shrink-0 rounded-sm object-cover"
                                    />
                                )}
                                <span>{o.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// HEX TILE DATA
// ─────────────────────────────────────────────────────────────────────────────

interface HexTile {
    vCol: number;
    vRow: number;
    logicalCol: number;
    logicalRow: number;
    elevation: number;
    isSpawn: boolean;
    isDeploy: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// BOSS PLACEMENT TYPES & HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/** Canonical boss position stored in logical (gameplay) coords.
 *  - 1-tile: center tile logical col/row
 *  - 7-tile: center tile logical col/row
 *  - 3-tile: center tile logical col/row + rotation (0-5) indicating which
 *            consecutive pair of visual neighbors forms the triangle
 *            (rotation r → neighbors[r] and neighbors[(r+1)%6])
 */
interface BossPosition {
    logicalCol: number;
    logicalRow: number;
    rotation: number; // only meaningful for 3-tile; 0 for 1/7
}

/**
 * Flat-top hex neighbor offsets in VISUAL (vCol/vRow) space.
 * Odd columns stagger DOWN (+y), so neighbor offsets depend on col parity.
 * Direction indices: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE
 */
function vHexNeighbors(vCol: number, _vRow: number): Array<[number, number]> {
    const isOdd = vCol % 2 === 1;
    // [dCol, dRow] for each of 6 directions
    return isOdd
        ? [
              [1, 1], // 0: E  (odd col, stagger down → row+1)
              [1, 0], // 1: NE
              [0, -1], // 2: NW
              [-1, 0], // 3: W
              [-1, 1], // 4: SW
              [0, 1], // 5: SE
          ]
        : [
              [1, 0], // 0: E
              [1, -1], // 1: NE
              [0, -1], // 2: NW
              [-1, -1], // 3: W  (even col → row-1)
              [-1, 0], // 4: SW
              [0, 1], // 5: SE
          ];
}

/**
 * Given a center visual tile and a rotation (0-5), return the set of
 * [vCol, vRow] pairs the boss occupies for a 3-tile boss.
 * Triangle = center + neighbor[rotation] + neighbor[(rotation+1)%6]
 */
function bossFootprint3(center: HexTile, rotation: number, tileMap: Map<string, HexTile>): HexTile[] | undefined {
    const neighbors = vHexNeighbors(center.vCol, center.vRow);
    const r0 = rotation % 6;
    const r1 = (rotation + 1) % 6;
    const [dc0, dr0] = neighbors[r0];
    const [dc1, dr1] = neighbors[r1];
    const t0 = tileMap.get(`${center.vCol + dc0},${center.vRow + dr0}`);
    const t1 = tileMap.get(`${center.vCol + dc1},${center.vRow + dr1}`);
    if (!t0 || !t1) return undefined;
    return [center, t0, t1];
}

/**
 * Given a center visual tile, return all 7 HexTile it occupies (center + 6 neighbors).
 */
function bossFootprint7(center: HexTile, tileMap: Map<string, HexTile>): HexTile[] | undefined {
    const neighbors = vHexNeighbors(center.vCol, center.vRow);
    const result: HexTile[] = [center];
    for (const [dc, dr] of neighbors) {
        const t = tileMap.get(`${center.vCol + dc},${center.vRow + dr}`);
        if (!t) return undefined;
        result.push(t);
    }
    return result;
}

/** All tiles share the same elevation. */
function allSameElevation(tiles: HexTile[]): boolean {
    const elev = tiles[0].elevation;
    return tiles.every(t => t.elevation === elev);
}

/**
 * Try to find a valid random placement for the boss.
 * For 3-tile: tries all rotations for each candidate center.
 */
function findRandomValidPlacement(
    tiles: HexTile[],
    tileMap: Map<string, HexTile>,
    bossSize: 1 | 3 | 7
): { center: HexTile; rotation: number } | undefined {
    const shuffled = tiles.toSorted(() => Math.random() - 0.5);
    for (const candidate of shuffled) {
        if (bossSize === 1) {
            return { center: candidate, rotation: 0 };
        } else if (bossSize === 7) {
            const footprint = bossFootprint7(candidate, tileMap);
            if (footprint && allSameElevation(footprint)) {
                return { center: candidate, rotation: 0 };
            }
        } else {
            const rotations = [0, 1, 2, 3, 4, 5].toSorted(() => Math.random() - 0.5);
            for (const rotation of rotations) {
                const footprint = bossFootprint3(candidate, rotation, tileMap);
                if (footprint && allSameElevation(footprint)) {
                    return { center: candidate, rotation };
                }
            }
        }
    }
    return undefined;
}

/** Get the footprint tiles for a given placement, or undefined if off-grid. */
function getFootprint(
    center: HexTile,
    rotation: number,
    tileMap: Map<string, HexTile>,
    bossSize: 1 | 3 | 7
): HexTile[] | undefined {
    if (bossSize === 1) return [center];
    if (bossSize === 7) return bossFootprint7(center, tileMap);
    return bossFootprint3(center, rotation, tileMap);
}

/** Check if a footprint is valid (all tiles exist, same elevation). */
function isValidFootprint(footprint: HexTile[] | undefined): boolean {
    if (!footprint) return false;
    return allSameElevation(footprint);
}

/**
 * Given an SVG point (in 2048×2048 space) from a pointer event,
 * find the nearest tile center using euclidean distance.
 */
function nearestTile(svgX: number, svgY: number, tiles: HexTile[], metrics: HexMetrics): HexTile {
    let best = tiles[0];
    let bestDistance = Infinity;
    for (const tile of tiles) {
        const { x, y } = tileCenter(metrics, tile.vCol, tile.vRow, tile.elevation);
        const d = (x - svgX) ** 2 + (y - svgY) ** 2;
        if (d < bestDistance) {
            bestDistance = d;
            best = tile;
        }
    }
    return best;
}

/** Pixel centroid (average center) of a footprint in 2048×2048 SVG space. */
function tileCentroid(footprint: HexTile[], metrics: HexMetrics): { x: number; y: number } {
    let sumX = 0;
    let sumY = 0;
    for (const t of footprint) {
        const { x, y } = tileCenter(metrics, t.vCol, t.vRow, t.elevation);
        sumX += x;
        sumY += y;
    }
    return { x: sumX / footprint.length, y: sumY / footprint.length };
}

/**
 * For a 3-tile boss, find the (center, rotation) whose tile centroid is closest
 * to `projected` in SVG space.  Searches the anchor tile AND its 6 visual
 * neighbours as candidate center tiles (7 × 6 = 42 checks).
 *
 * Returns the closest config overall so the user always sees a preview;
 * `isValid` flags whether all three tiles share the same elevation.
 */
function bestPlacement3(
    projected: { x: number; y: number },
    anchorTile: HexTile,
    tileMap: Map<string, HexTile>,
    metrics: HexMetrics
): { center: HexTile; rotation: number; footprint: HexTile[] | undefined; isValid: boolean } {
    const offsets = vHexNeighbors(anchorTile.vCol, anchorTile.vRow);
    const candidates: HexTile[] = [anchorTile];
    for (const [dc, dr] of offsets) {
        const neighbour = tileMap.get(`${anchorTile.vCol + dc},${anchorTile.vRow + dr}`);
        if (neighbour) candidates.push(neighbour);
    }

    let bestCenter = anchorTile;
    let bestRotation = 0;
    let bestFootprint: HexTile[] | undefined;
    let bestIsValid = false;
    let bestDistance = Infinity;

    for (const candidate of candidates) {
        for (let r = 0; r < 6; r++) {
            const fp = bossFootprint3(candidate, r, tileMap);
            if (!fp) continue; // some neighbour is off the playable grid
            const c = tileCentroid(fp, metrics);
            const d = (c.x - projected.x) ** 2 + (c.y - projected.y) ** 2;
            if (d < bestDistance) {
                bestDistance = d;
                bestCenter = candidate;
                bestRotation = r;
                bestFootprint = fp;
                bestIsValid = allSameElevation(fp);
            }
        }
    }

    return { center: bestCenter, rotation: bestRotation, footprint: bestFootprint, isValid: bestIsValid };
}

/** Boss colors */
const BOSS_PLACED_FILL = 'rgba(20, 60, 200, 0.75)';
const BOSS_PLACED_STROKE = 'rgba(60, 120, 255, 0.95)';
const BOSS_DRAG_VALID_FILL = 'rgba(20, 60, 200, 0.30)';
const BOSS_DRAG_VALID_STROKE = 'rgba(60, 120, 255, 0.60)';
const BOSS_DRAG_INVALID_FILL = 'rgba(255, 60, 60, 0.18)';
const BOSS_DRAG_INVALID_STROKE = 'rgba(255, 80, 80, 0.50)';

/** Character tile colors */
const CHAR_PLACED_FILL = 'rgba(30, 180, 60, 0.65)';
const CHAR_PLACED_STROKE = 'rgba(80, 255, 100, 0.90)';
const CHAR_DRAG_VALID_FILL = 'rgba(30, 180, 60, 0.25)';
const CHAR_DRAG_VALID_STROKE = 'rgba(80, 255, 100, 0.55)';

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER PLACEMENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** One character slot in the raid planner. */
interface PlacedCharacter {
    slotId: number;
    charId: string; // snowprintId from ALLOWED_CHARS
    roundIcon: string; // for SVG portrait rendering
    tile: HexTile;
    rank: Rank;
    rarity: Rarity;
    stars: RarityStars;
    activeAbilityLevel: number;
    passiveAbilityLevel: number;
    unitId: IUnitId;
}

interface CharDragState {
    slotId: number;
    offsetX: number;
    offsetY: number;
    candidateTile: HexTile;
    isValid: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT SELECT OPTIONS  (reused in character slot rows in RaidHit)
// ─────────────────────────────────────────────────────────────────────────────

const RANK_OPTIONS = [
    Rank.Stone1,
    Rank.Stone2,
    Rank.Stone3,
    Rank.Iron1,
    Rank.Iron2,
    Rank.Iron3,
    Rank.Bronze1,
    Rank.Bronze2,
    Rank.Bronze3,
    Rank.Silver1,
    Rank.Silver2,
    Rank.Silver3,
    Rank.Gold1,
    Rank.Gold2,
    Rank.Gold3,
    Rank.Diamond1,
    Rank.Diamond2,
    Rank.Diamond3,
    Rank.Adamantine1,
    Rank.Adamantine2,
    // Rank.Adamantine3,
].map(r => ({ value: String(r), label: rankToString(r) }));

const RARITY_OPTIONS = [
    { value: String(Rarity.Common), label: 'Common' },
    { value: String(Rarity.Uncommon), label: 'Uncommon' },
    { value: String(Rarity.Rare), label: 'Rare' },
    { value: String(Rarity.Epic), label: 'Epic' },
    { value: String(Rarity.Legendary), label: 'Legendary' },
    { value: String(Rarity.Mythic), label: 'Mythic' },
];

const STARS_LABELS: Record<number, string> = {
    0: '0★',
    1: '1★',
    2: '2★',
    3: '3★',
    4: '4★',
    5: '5★',
    6: 'R1★',
    7: 'R2★',
    8: 'R3★',
    9: 'R4★',
    10: 'R5★',
    11: 'B1★',
    12: 'B2★',
    13: 'B3★',
    14: '🌟',
};
const STARS_OPTIONS = Array.from({ length: 15 }, (_, index) => ({
    value: String(index),
    label: STARS_LABELS[index] ?? String(index),
}));

// ─────────────────────────────────────────────────────────────────────────────
// MAP PREVIEW
// ─────────────────────────────────────────────────────────────────────────────

interface HexMapPreviewProps {
    mapId: string;
    bossSize: 1 | 3 | 7;
    bossImageName?: string;
    placedCharacters?: PlacedCharacter[];
    onCharacterMoved?: (slotId: number, tile: HexTile) => void;
    onMapReady?: (tiles: HexTile[], metrics: HexMetrics) => void;
    onHexClick?: (logicalCol: number, logicalRow: number) => void;
    onBossPlaced?: (position: BossPosition) => void;
}

interface DragState {
    /** The visual-space offset from the pointer to the boss center tile center (in SVG units). */
    offsetX: number;
    offsetY: number;
    /** The current candidate center tile (nearest tile to adjusted pointer). */
    candidateCenter: HexTile;
    /** Best rotation for the candidate (for 3-tile). */
    candidateRotation: number;
    /** Whether the current candidate position is valid. */
    isValid: boolean;
    /** Footprint tiles at the candidate position (undefined if off-grid). */
    footprint: HexTile[] | undefined;
}

/**
 * Compute clip-polygon strings and image placement bounds for rendering a boss
 * image inside an SVG, clipped to the hex footprint.
 *
 * Image aspect ratio is assumed 2:1 (W:H).  The image is scaled to cover the
 * bounding box of the footprint ("slice" / cover behaviour) so the tile area
 * is fully filled; the clip path prevents overflow beyond the hex boundaries.
 */
function footprintImageLayout(
    footprint: HexTile[],
    metrics: HexMetrics,
    imgAspect = 1
): { clipPolygons: string[]; imgX: number; imgY: number; imgW: number; imgH: number } {
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;
    const clipPolygons: string[] = [];
    for (const tile of footprint) {
        const { x, y } = tileCenter(metrics, tile.vCol, tile.vRow, tile.elevation);
        const verts = hexVerts(metrics, x, y, HEX_DRAW_SCALE);
        clipPolygons.push(verts.map(([px, py]) => `${px},${py}`).join(' '));
        for (const [px, py] of verts) {
            if (px < minX) minX = px;
            if (px > maxX) maxX = px;
            if (py < minY) minY = py;
            if (py > maxY) maxY = py;
        }
    }
    const bboxW = maxX - minX;
    const bboxH = maxY - minY;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    // Cover: scale so the image fully fills the bounding box on the dominant axis.
    const bboxAspect = bboxW / bboxH;
    let imgW: number, imgH: number;
    if (bboxAspect >= imgAspect) {
        // bbox is wider than image — fit height, overflow horizontally (clipped)
        imgH = bboxH;
        imgW = bboxH * imgAspect;
    } else {
        // bbox is taller than image — fit width, overflow vertically (clipped)
        imgW = bboxW;
        imgH = bboxW / imgAspect;
    }
    return { clipPolygons, imgX: cx - imgW / 2, imgY: cy - imgH / 2, imgW, imgH };
}

/**
 * Return the tile that is most south-west among playable tiles not in `excludeKeys`.
 * Sort key: highest pixel Y (most south) first, then lowest pixel X (most west).
 */
function findSwTile(tiles: HexTile[], metrics: HexMetrics, excludeKeys: Set<string>): HexTile | undefined {
    const available = tiles.filter(t => !excludeKeys.has(`${t.vCol},${t.vRow}`));
    if (available.length === 0) return undefined;
    return available.toSorted((a, b) => {
        const pa = tileCenter(metrics, a.vCol, a.vRow, a.elevation);
        const pb = tileCenter(metrics, b.vCol, b.vRow, b.elevation);
        return pb.y - pa.y || pa.x - pb.x;
    })[0];
}

function getBossImageUrl(name: string) {
    return getImageUrl(`snowprint_assets/guild_boss/${name}.png`);
}

function HexMapPreview({
    mapId,
    bossSize,
    bossImageName,
    placedCharacters,
    onCharacterMoved,
    onMapReady,
    onHexClick,
    onBossPlaced,
}: HexMapPreviewProps) {
    const [tiles, setTiles] = useState<HexTile[]>([]);
    const [metrics, setMetrics] = useState<HexMetrics>();
    const [isLoading, setIsLoading] = useState(false);
    const [hoveredKey, setHoveredKey] = useState<string>();

    // Boss placement
    const [bossPlacement, setBossPlacement] = useState<{ center: HexTile; rotation: number } | undefined>();
    const [dragState, setDragState] = useState<DragState | undefined>();
    const [charDragState, setCharDragState] = useState<CharDragState | undefined>();
    const svgReference = useRef<SVGSVGElement>(null);

    // tileMap: vCol,vRow → HexTile
    const tileMap = useMemo(() => {
        const m = new Map<string, HexTile>();
        for (const t of tiles) m.set(`${t.vCol},${t.vRow}`, t);
        return m;
    }, [tiles]);

    // Placed boss footprint tiles (Set of keys for fast lookup)
    const placedFootprint = useMemo(
        () =>
            bossPlacement ? getFootprint(bossPlacement.center, bossPlacement.rotation, tileMap, bossSize) : undefined,
        [bossPlacement, tileMap, bossSize]
    );
    const placedFootprintKeys = useMemo(
        () => new Set((placedFootprint ?? []).map(t => `${t.vCol},${t.vRow}`)),
        [placedFootprint]
    );

    // Image layout for placed boss
    const placedImageLayout = useMemo(
        () => (placedFootprint && metrics && !dragState ? footprintImageLayout(placedFootprint, metrics) : undefined),
        [placedFootprint, metrics, dragState]
    );

    // Drag footprint keys
    const dragFootprintKeys = useMemo(() => {
        if (!dragState) return new Set<string>();
        return new Set((dragState.footprint ?? []).map(t => `${t.vCol},${t.vRow}`));
    }, [dragState]);

    // Image layout for drag preview (only when valid)
    const dragImageLayout = useMemo(
        () =>
            dragState?.isValid && dragState.footprint && metrics
                ? footprintImageLayout(dragState.footprint, metrics)
                : undefined,
        [dragState, metrics]
    );

    // Keys of placed characters — excluding any char currently being dragged
    const charTileKeySet = useMemo(
        () =>
            new Set(
                (placedCharacters ?? [])
                    .filter(c => c.slotId !== charDragState?.slotId)
                    .map(c => `${c.tile.vCol},${c.tile.vRow}`)
            ),
        [placedCharacters, charDragState]
    );

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        setTiles([]);
        setMetrics(undefined);
        setBossPlacement(undefined);
        setDragState(undefined);

        const run = async () => {
            try {
                const [levelModule, configModule] = await Promise.all([
                    import(`./data/${mapId}.json`) as Promise<{ default: LevelJson }>,
                    import(`./data/${mapId}_Config_Visual.json`) as Promise<{ default: ConfigVisualJson }>,
                ]);
                if (cancelled) return;

                const level = levelModule.default;
                const config = configModule.default;
                const m = deriveMetrics(level.Width, level.Height);

                const deploySet = new Set<string>();
                const spawnSet = new Set<string>();
                for (const group of level.SpawnPointSets[0].SpawnPointGroups) {
                    const target = group.TeamWithPlayerIndex === 0 ? deploySet : spawnSet;
                    for (const sp of group.SpawnPoints) target.add(`${sp.Column},${sp.Row}`);
                }

                const result: HexTile[] = [];
                for (let vCol = 0; vCol < config.VisualTiles.length; vCol++) {
                    for (let vRow = 0; vRow < config.VisualTiles[vCol].Tile.length; vRow++) {
                        const visTile = config.VisualTiles[vCol].Tile[vRow];
                        if (!visTile.IsPlayable) continue;
                        const lvlTile = level.Tiles[visTile.LogicalColumn]?.Tile[visTile.LogicalRow];
                        if (!lvlTile) continue;
                        const classification = classify(visTile, lvlTile);
                        if (!classification.draw) continue;
                        const spawnKey = `${visTile.LogicalColumn},${visTile.LogicalRow}`;
                        result.push({
                            vCol,
                            vRow,
                            logicalCol: visTile.LogicalColumn,
                            logicalRow: visTile.LogicalRow,
                            elevation: classification.elevation,
                            isSpawn: spawnSet.has(spawnKey),
                            isDeploy: deploySet.has(spawnKey),
                        });
                    }
                }

                if (!cancelled) {
                    setMetrics(m);
                    setTiles(result);
                    setIsLoading(false);

                    // Build tileMap locally for initial placement
                    const localTileMap = new Map<string, HexTile>();
                    for (const t of result) localTileMap.set(`${t.vCol},${t.vRow}`, t);
                    const placement = findRandomValidPlacement(result, localTileMap, bossSize) ?? undefined;
                    setBossPlacement(placement);
                    if (placement) {
                        onBossPlaced?.({
                            logicalCol: placement.center.logicalCol,
                            logicalRow: placement.center.logicalRow,
                            rotation: placement.rotation,
                        });
                    }
                    onMapReady?.(result, m);
                }
            } catch {
                if (!cancelled) setIsLoading(false);
            }
        };

        run();
        return () => {
            cancelled = true;
        };
    }, [mapId, bossSize]);

    /** Convert a DOM PointerEvent to SVG viewBox coordinates (0–2048). */
    const toSvgPoint = useCallback((clientX: number, clientY: number): { x: number; y: number } | undefined => {
        const svg = svgReference.current;
        if (!svg) return undefined;
        const rect = svg.getBoundingClientRect();
        const scaleX = 2048 / rect.width;
        const scaleY = 2048 / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY,
        };
    }, []);

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<SVGPolygonElement>, tile: HexTile) => {
            if (!metrics) return;
            const tileKey = `${tile.vCol},${tile.vRow}`;

            // Boss drag — takes priority over character drag
            if (bossPlacement && placedFootprintKeys.has(tileKey)) {
                event.currentTarget.setPointerCapture(event.pointerId);
                event.stopPropagation();
                const svgPt = toSvgPoint(event.clientX, event.clientY);
                if (!svgPt) return;
                const fp = getFootprint(bossPlacement.center, bossPlacement.rotation, tileMap, bossSize);
                const referencePx =
                    bossSize === 3 && fp
                        ? tileCentroid(fp, metrics)
                        : tileCenter(
                              metrics,
                              bossPlacement.center.vCol,
                              bossPlacement.center.vRow,
                              bossPlacement.center.elevation
                          );
                setDragState({
                    offsetX: referencePx.x - svgPt.x,
                    offsetY: referencePx.y - svgPt.y,
                    candidateCenter: bossPlacement.center,
                    candidateRotation: bossPlacement.rotation,
                    isValid: isValidFootprint(fp),
                    footprint: fp,
                });
                return;
            }

            // Character drag
            const charEntry = (placedCharacters ?? []).find(c => `${c.tile.vCol},${c.tile.vRow}` === tileKey);
            if (charEntry) {
                event.currentTarget.setPointerCapture(event.pointerId);
                event.stopPropagation();
                const svgPt = toSvgPoint(event.clientX, event.clientY);
                if (!svgPt) return;
                const { x, y } = tileCenter(metrics, tile.vCol, tile.vRow, tile.elevation);
                setCharDragState({
                    slotId: charEntry.slotId,
                    offsetX: x - svgPt.x,
                    offsetY: y - svgPt.y,
                    candidateTile: tile,
                    isValid: true,
                });
            }
        },
        [bossPlacement, metrics, placedFootprintKeys, toSvgPoint, tileMap, bossSize, placedCharacters]
    );

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<SVGSVGElement>) => {
            if (!metrics || tiles.length === 0) return;

            // Boss drag
            if (dragState) {
                const svgPt = toSvgPoint(event.clientX, event.clientY);
                if (!svgPt) return;
                const projected = { x: svgPt.x + dragState.offsetX, y: svgPt.y + dragState.offsetY };
                const anchorTile = nearestTile(projected.x, projected.y, tiles, metrics);
                let candidateCenter: HexTile;
                let rotation: number;
                let footprint: HexTile[] | undefined;
                let isValid: boolean;
                if (bossSize === 3) {
                    const result = bestPlacement3(projected, anchorTile, tileMap, metrics);
                    candidateCenter = result.center;
                    rotation = result.rotation;
                    footprint = result.footprint;
                    isValid = result.isValid;
                } else {
                    candidateCenter = anchorTile;
                    rotation = dragState.candidateRotation;
                    footprint = getFootprint(candidateCenter, rotation, tileMap, bossSize);
                    isValid = isValidFootprint(footprint);
                }
                setDragState(previous =>
                    previous
                        ? { ...previous, candidateCenter, candidateRotation: rotation, footprint, isValid }
                        : undefined
                );
                return;
            }

            // Character drag
            if (charDragState) {
                const svgPt = toSvgPoint(event.clientX, event.clientY);
                if (!svgPt) return;
                const projected = {
                    x: svgPt.x + charDragState.offsetX,
                    y: svgPt.y + charDragState.offsetY,
                };
                const candidateTile = nearestTile(projected.x, projected.y, tiles, metrics);
                const candidateKey = `${candidateTile.vCol},${candidateTile.vRow}`;
                const isBossTile = placedFootprintKeys.has(candidateKey);
                const isOtherCharTile = (placedCharacters ?? []).some(
                    c => c.slotId !== charDragState.slotId && `${c.tile.vCol},${c.tile.vRow}` === candidateKey
                );
                const isValid = !isBossTile && !isOtherCharTile;
                setCharDragState(previous => (previous ? { ...previous, candidateTile, isValid } : undefined));
            }
        },
        [dragState, charDragState, metrics, tiles, toSvgPoint, bossSize, tileMap, placedCharacters, placedFootprintKeys]
    );

    const handlePointerUp = useCallback(
        (event: React.PointerEvent<SVGSVGElement>) => {
            if (!dragState && !charDragState) return;
            event.stopPropagation();

            if (dragState) {
                if (dragState.isValid && dragState.footprint) {
                    const newPlacement = {
                        center: dragState.candidateCenter,
                        rotation: dragState.candidateRotation,
                    };
                    setBossPlacement(newPlacement);
                    onBossPlaced?.({
                        logicalCol: newPlacement.center.logicalCol,
                        logicalRow: newPlacement.center.logicalRow,
                        rotation: newPlacement.rotation,
                    });
                }
                setDragState(undefined);
            }

            if (charDragState) {
                if (charDragState.isValid) {
                    onCharacterMoved?.(charDragState.slotId, charDragState.candidateTile);
                }
                setCharDragState(undefined);
            }
        },
        [dragState, charDragState, onBossPlaced, onCharacterMoved]
    );

    const imageSource = getImageUrl(`snowprint_assets/maps/${mapId}_Visual.png`);

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-3">
                <span className="font-[Rajdhani] text-[20px] font-semibold tracking-[0.05em] text-[#d4d8e8]">
                    {mapId}
                </span>
            </div>
            <div className="relative overflow-hidden rounded-[6px] border border-[#2e3352] bg-[#13151e] leading-none">
                {isLoading ? (
                    <div className="flex min-h-[420px] items-center justify-center">
                        <div className="flex flex-col items-center gap-3 text-[13px] tracking-[0.08em] text-[#5c6280]">
                            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" opacity="0.3">
                                <path d="M20 4L36 12V28L20 36L4 28V12L20 4Z" stroke="currentColor" strokeWidth="1.5" />
                                <path
                                    d="M20 4V36M4 12L36 12M4 28L36 28"
                                    stroke="currentColor"
                                    strokeWidth="1"
                                    strokeDasharray="3 3"
                                />
                            </svg>
                            <span>Loading map…</span>
                        </div>
                    </div>
                ) : (
                    <>
                        <img src={imageSource} alt={mapId} className="block h-auto w-full" />
                        {metrics && (
                            <svg
                                ref={svgReference}
                                viewBox="0 0 2048 2048"
                                style={{
                                    position: 'absolute',
                                    inset: 0,
                                    width: '100%',
                                    height: '100%',
                                    cursor: dragState || charDragState ? 'grabbing' : 'default',
                                    userSelect: 'none',
                                    touchAction: 'none',
                                }}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}>
                                {/* Clip-path definitions for boss images and character portraits */}
                                <defs>
                                    {metrics &&
                                        (placedCharacters ?? []).map(char => {
                                            const isDragging = charDragState?.slotId === char.slotId;
                                            const displayTile = isDragging ? charDragState!.candidateTile : char.tile;
                                            const { x, y } = tileCenter(
                                                metrics,
                                                displayTile.vCol,
                                                displayTile.vRow,
                                                displayTile.elevation
                                            );
                                            const r = metrics.hexHeight * HEX_DRAW_SCALE * 0.42;
                                            return (
                                                <clipPath key={char.slotId} id={`char-portrait-clip-${char.slotId}`}>
                                                    <circle cx={x} cy={y} r={r} />
                                                </clipPath>
                                            );
                                        })}
                                </defs>
                                {tiles.map(tile => {
                                    const { x, y } = tileCenter(metrics, tile.vCol, tile.vRow, tile.elevation);
                                    const verts = hexVerts(metrics, x, y, HEX_DRAW_SCALE);
                                    const points = verts.map(([px, py]) => `${px},${py}`).join(' ');
                                    const tileKey = `${tile.vCol},${tile.vRow}`;
                                    const isHovered = hoveredKey === tileKey;
                                    const isPlacedBoss = placedFootprintKeys.has(tileKey) && !dragState;
                                    const isDragBoss = dragState && dragFootprintKeys.has(tileKey);
                                    const isPlacedChar = charTileKeySet.has(tileKey);
                                    const isDragChar =
                                        charDragState &&
                                        `${charDragState.candidateTile.vCol},${charDragState.candidateTile.vRow}` ===
                                            tileKey;

                                    let fill: string;
                                    let stroke: string;
                                    let strokeWidth: number;
                                    let cursor = 'default';

                                    if (isPlacedBoss) {
                                        fill = BOSS_PLACED_FILL;
                                        stroke = BOSS_PLACED_STROKE;
                                        strokeWidth = HIGHLIGHT_WIDTH;
                                        cursor = 'grab';
                                    } else if (isDragBoss) {
                                        fill = dragState.isValid ? BOSS_DRAG_VALID_FILL : BOSS_DRAG_INVALID_FILL;
                                        stroke = dragState.isValid ? BOSS_DRAG_VALID_STROKE : BOSS_DRAG_INVALID_STROKE;
                                        strokeWidth = HIGHLIGHT_WIDTH;
                                    } else if (isPlacedChar) {
                                        fill = CHAR_PLACED_FILL;
                                        stroke = CHAR_PLACED_STROKE;
                                        strokeWidth = HIGHLIGHT_WIDTH;
                                        cursor = 'grab';
                                    } else if (isDragChar) {
                                        fill = charDragState.isValid ? CHAR_DRAG_VALID_FILL : BOSS_DRAG_INVALID_FILL;
                                        stroke = charDragState.isValid
                                            ? CHAR_DRAG_VALID_STROKE
                                            : BOSS_DRAG_INVALID_STROKE;
                                        strokeWidth = HIGHLIGHT_WIDTH;
                                    } else if (isHovered) {
                                        fill = 'rgba(255, 220, 0, 0.55)';
                                        stroke = EDGE_COLOR;
                                        strokeWidth = EDGE_WIDTH;
                                    } else {
                                        fill = tile.isSpawn ? SPAWN_FILL : tile.isDeploy ? DEPLOY_FILL : 'transparent';
                                        stroke = tile.isSpawn
                                            ? SPAWN_STROKE
                                            : tile.isDeploy
                                              ? DEPLOY_STROKE
                                              : EDGE_COLOR;
                                        strokeWidth = tile.isSpawn || tile.isDeploy ? HIGHLIGHT_WIDTH : EDGE_WIDTH;
                                    }

                                    return (
                                        <polygon
                                            key={tileKey}
                                            points={points}
                                            fill={fill}
                                            stroke={stroke}
                                            strokeWidth={strokeWidth}
                                            style={{ cursor }}
                                            onMouseEnter={() => !dragState && !charDragState && setHoveredKey(tileKey)}
                                            onMouseLeave={() => setHoveredKey(undefined)}
                                            onPointerDown={event => handlePointerDown(event, tile)}
                                            onClick={() =>
                                                !dragState &&
                                                !charDragState &&
                                                onHexClick?.(tile.logicalCol, tile.logicalRow)
                                            }
                                        />
                                    );
                                })}

                                {/* Boss image — placed position */}
                                {bossImageName && placedImageLayout && (
                                    <image
                                        href={getBossImageUrl(bossImageName)}
                                        x={placedImageLayout.imgX}
                                        y={placedImageLayout.imgY}
                                        width={placedImageLayout.imgW}
                                        height={placedImageLayout.imgH}
                                        preserveAspectRatio="none"
                                        style={{ pointerEvents: 'none' }}
                                    />
                                )}

                                {/* Boss image — drag preview (valid positions only) */}
                                {bossImageName && dragImageLayout && (
                                    <image
                                        href={getBossImageUrl(bossImageName)}
                                        x={dragImageLayout.imgX}
                                        y={dragImageLayout.imgY}
                                        width={dragImageLayout.imgW}
                                        height={dragImageLayout.imgH}
                                        preserveAspectRatio="none"
                                        opacity={0.45}
                                        style={{ pointerEvents: 'none' }}
                                    />
                                )}

                                {/* Character portraits */}
                                {metrics &&
                                    (placedCharacters ?? []).map(char => {
                                        const isDragging = charDragState?.slotId === char.slotId;
                                        const displayTile = isDragging ? charDragState!.candidateTile : char.tile;
                                        const { x, y } = tileCenter(
                                            metrics,
                                            displayTile.vCol,
                                            displayTile.vRow,
                                            displayTile.elevation
                                        );
                                        const r = metrics.hexHeight * HEX_DRAW_SCALE * 0.42;
                                        return (
                                            <image
                                                key={char.slotId}
                                                href={getImageUrl(char.roundIcon)}
                                                x={x - r}
                                                y={y - r}
                                                width={r * 2}
                                                height={r * 2}
                                                preserveAspectRatio="xMidYMid slice"
                                                clipPath={`url(#char-portrait-clip-${char.slotId})`}
                                                opacity={isDragging ? (charDragState!.isValid ? 0.6 : 0.25) : 1}
                                                style={{ pointerEvents: 'none' }}
                                            />
                                        );
                                    })}
                            </svg>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// CHARACTER SLOT CONTROLS
// ─────────────────────────────────────────────────────────────────────────────

interface CharOptionItem {
    value: string;
    label: string;
    imageUrl: string;
}

function CharacterSelect({
    value,
    options,
    onChange,
}: {
    value: string;
    options: CharOptionItem[];
    onChange: (v: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);
    const selected = options.find(o => o.value === value);
    return (
        <div className="relative min-w-[150px] flex-1">
            <button
                type="button"
                onClick={() => setIsOpen(p => !p)}
                onBlur={() => setIsOpen(false)}
                className="flex w-full cursor-pointer items-center gap-2 rounded-[4px] border border-[#2e3352] bg-[#0b0c10] py-[5px] pr-7 pl-2 font-[Nunito] text-[12px] text-[#d4d8e8] outline-none hover:border-[#c8a84b] focus:border-[#c8a84b]">
                {selected && (
                    <img
                        src={selected.imageUrl}
                        alt=""
                        className="h-[20px] w-[20px] shrink-0 rounded-full object-cover"
                    />
                )}
                <span className="truncate">{selected?.label ?? 'Select…'}</span>
            </button>
            <div className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-[#5c6280]">
                <svg width="10" height="6" viewBox="0 0 10 6" fill="currentColor">
                    <path d="M0 0.5L5 5.5L10 0.5H0Z" />
                </svg>
            </div>
            {isOpen && (
                <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[200px] overflow-y-auto rounded-[4px] border border-[#2e3352] bg-[#0d0f1a] shadow-xl">
                    {options.map(o => (
                        <div
                            key={o.value}
                            role="option"
                            aria-selected={o.value === value}
                            onMouseDown={event_ => event_.preventDefault()}
                            onClick={() => {
                                onChange(o.value);
                                setIsOpen(false);
                            }}
                            className={`flex cursor-pointer items-center gap-2 px-2 py-[5px] text-[12px] hover:bg-[#1a1e30] ${
                                o.value === value ? 'text-[#c8a84b]' : 'text-[#d4d8e8]'
                            }`}>
                            <img
                                src={o.imageUrl}
                                alt=""
                                className="h-[18px] w-[18px] shrink-0 rounded-full object-cover"
                            />
                            <span>{o.label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function StarsCompactSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const selected = STARS_OPTIONS.find(o => o.value === value);
    return (
        <div className="flex flex-col gap-[3px]">
            <span className="font-[Rajdhani] text-[9px] font-semibold tracking-[0.1em] text-[#7a8099] uppercase">
                Stars
            </span>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(p => !p)}
                    onBlur={() => setIsOpen(false)}
                    className="flex cursor-pointer items-center gap-1 rounded-[4px] border border-[#2e3352] bg-[#0b0c10] py-[5px] pr-6 pl-2 outline-none hover:border-[#c8a84b] focus:border-[#c8a84b]">
                    {selected && <StarsIcon stars={Number(selected.value) as RarityStars} />}
                </button>
                <div className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[#5c6280]">
                    <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
                        <path d="M0 0L4 5L8 0H0Z" />
                    </svg>
                </div>
                {isOpen && (
                    <div className="absolute top-full left-0 z-50 mt-1 max-h-[200px] overflow-y-auto rounded-[4px] border border-[#2e3352] bg-[#0d0f1a] shadow-xl">
                        {STARS_OPTIONS.map(o => (
                            <div
                                key={o.value}
                                role="option"
                                aria-selected={o.value === value}
                                onMouseDown={event_ => event_.preventDefault()}
                                onClick={() => {
                                    onChange(o.value);
                                    setIsOpen(false);
                                }}
                                className={`flex cursor-pointer items-center gap-2 px-2 py-[5px] hover:bg-[#1a1e30] ${
                                    o.value === value ? 'text-[#c8a84b]' : 'text-[#d4d8e8]'
                                }`}>
                                <StarsIcon stars={Number(o.value) as RarityStars} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function RankCompactSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const selected = RANK_OPTIONS.find(o => o.value === value);
    return (
        <div className="flex flex-col gap-[3px]">
            <span className="font-[Rajdhani] text-[9px] font-semibold tracking-[0.1em] text-[#7a8099] uppercase">
                Rank
            </span>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(p => !p)}
                    onBlur={() => setIsOpen(false)}
                    className="flex cursor-pointer items-center gap-1 rounded-[4px] border border-[#2e3352] bg-[#0b0c10] py-[5px] pr-6 pl-2 outline-none hover:border-[#c8a84b] focus:border-[#c8a84b]">
                    {selected && <RankIcon rank={Number(selected.value) as Rank} size={18} />}
                </button>
                <div className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[#5c6280]">
                    <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
                        <path d="M0 0L4 5L8 0H0Z" />
                    </svg>
                </div>
                {isOpen && (
                    <div className="absolute top-full left-0 z-50 mt-1 max-h-[200px] overflow-y-auto rounded-[4px] border border-[#2e3352] bg-[#0d0f1a] shadow-xl">
                        {RANK_OPTIONS.map(o => (
                            <div
                                key={o.value}
                                role="option"
                                aria-selected={o.value === value}
                                onMouseDown={event_ => event_.preventDefault()}
                                onClick={() => {
                                    onChange(o.value);
                                    setIsOpen(false);
                                }}
                                className={`flex cursor-pointer items-center gap-2 px-2 py-[5px] hover:bg-[#1a1e30] ${
                                    o.value === value ? 'text-[#c8a84b]' : 'text-[#d4d8e8]'
                                }`}>
                                <RankIcon rank={Number(o.value) as Rank} size={18} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function RarityCompactSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
    const [isOpen, setIsOpen] = useState(false);
    const selected = RARITY_OPTIONS.find(o => o.value === value);
    return (
        <div className="flex flex-col gap-[3px]">
            <span className="font-[Rajdhani] text-[9px] font-semibold tracking-[0.1em] text-[#7a8099] uppercase">
                Rarity
            </span>
            <div className="relative">
                <button
                    type="button"
                    onClick={() => setIsOpen(p => !p)}
                    onBlur={() => setIsOpen(false)}
                    className="flex cursor-pointer items-center gap-1 rounded-[4px] border border-[#2e3352] bg-[#0b0c10] py-[5px] pr-6 pl-2 outline-none hover:border-[#c8a84b] focus:border-[#c8a84b]">
                    {selected && <RarityIcon rarity={Number(selected.value) as Rarity} />}
                </button>
                <div className="pointer-events-none absolute top-1/2 right-1 -translate-y-1/2 text-[#5c6280]">
                    <svg width="8" height="5" viewBox="0 0 8 5" fill="currentColor">
                        <path d="M0 0L4 5L8 0H0Z" />
                    </svg>
                </div>
                {isOpen && (
                    <div className="absolute top-full left-0 z-50 mt-1 rounded-[4px] border border-[#2e3352] bg-[#0d0f1a] shadow-xl">
                        {RARITY_OPTIONS.map(o => (
                            <div
                                key={o.value}
                                role="option"
                                aria-selected={o.value === value}
                                onMouseDown={event_ => event_.preventDefault()}
                                onClick={() => {
                                    onChange(o.value);
                                    setIsOpen(false);
                                }}
                                className={`flex cursor-pointer items-center gap-2 px-2 py-[5px] hover:bg-[#1a1e30] ${
                                    o.value === value ? 'text-[#c8a84b]' : 'text-[#d4d8e8]'
                                }`}>
                                <RarityIcon rarity={Number(o.value) as Rarity} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

export const RaidHit = () => {
    const { characters: unresolvedCharacters } = useContext(StoreContext);
    const [selectedBossId, setSelectedBossId] = useState<string>('');
    const [selectedPrimeId, setSelectedPrimeId] = useState<string>('');
    const [selectedMapId, setSelectedMapId] = useState<string>('');
    const [mapOptions, setMapOptions] = useState<string[]>(raidHitData.Maps);
    const [battleState, setBattleState] = useState<IBattleState>({
        units: {},
        unitDetails: {},
        teams: ['player', 'boss'],
        unitsByUuid: {},
        locations: {},
        finishedEventChains: [],
        currentEventChain: [],
        globalVariables: {},
        characterVariables: {},
    });

    const chars = useMemo(
        () => CharactersService.resolveStoredCharacters(unresolvedCharacters),
        [unresolvedCharacters]
    );

    const allowedChars = chars.filter(c => ALLOWED_CHARS.has(c.snowprintId));

    // ── Character placement state ────────────────────────────────────────────
    const [placedCharacters, setPlacedCharacters] = useState<PlacedCharacter[]>([]);
    const [mapTiles, setMapTiles] = useState<HexTile[]>([]);
    const [mapMetrics, setMapMetrics] = useState<HexMetrics>();
    const nextSlotId = useRef(0);

    // Clear character placements when the map changes
    useEffect(() => {
        setPlacedCharacters([]);
        setMapTiles([]);
        setMapMetrics(undefined);
    }, [selectedMapId]);

    const handleMapReady = useCallback((tiles: HexTile[], metrics: HexMetrics) => {
        setMapTiles(tiles);
        setMapMetrics(metrics);
    }, []);

    const handleCharacterMoved = useCallback((slotId: number, tile: HexTile) => {
        setPlacedCharacters(previous => previous.map(c => (c.slotId === slotId ? { ...c, tile } : c)));
    }, []);

    const updateState = (char: ICharacter2, tile: HexTile) => {
        const uuid = BattleHelper.getUuid(char.snowprintId, 'player', 0);
        const unitId = { id: char.snowprintId, teamId: 'player', uuid };
        const loc = { vCol: tile.vCol, vRow: tile.vRow };
        const newState = { ...battleState };
        newState.units[unitId.uuid] = unitId;
        newState.unitDetails[unitId.uuid] = {
            rank: char.rank,
            rarity: char.rarity,
            stars: char.stars,
            activeLevel: char.activeAbilityLevel,
            passiveLevel: char.passiveAbilityLevel,
            equipment: [char.equipment[0].id, char.equipment[1].id, char.equipment[2].id],
            equipmentLevel: [char.equipment[0].level, char.equipment[1].level, char.equipment[2].level],
            appliedUpgrades: [false, false, false, false, false, false],
        };
        newState.locations[unitId.uuid] = loc;
        setBattleState(newState);
        return { unitId, newState };
    };

    const handleAddChar = () => {
        if (!mapMetrics || mapTiles.length === 0 || placedCharacters.length >= 5) return;
        const usedIds = new Set(placedCharacters.map(c => c.charId));
        const available = allowedChars.filter(c => !usedIds.has(c.snowprintId));
        if (available.length === 0) return;
        const char = available[0];
        const excludeKeys = new Set(placedCharacters.map(c => `${c.tile.vCol},${c.tile.vRow}`));
        const tile = findSwTile(mapTiles, mapMetrics, excludeKeys);
        if (!tile) return;
        const { unitId, newState } = updateState(char, tile);
        console.log('newState', newState);
        setPlacedCharacters(previous => [
            ...previous,
            {
                slotId: nextSlotId.current++,
                charId: char.snowprintId,
                roundIcon: char.roundIcon,
                tile,
                rank: char.rank,
                rarity: char.rarity,
                stars: char.stars,
                activeAbilityLevel: char.activeAbilityLevel,
                passiveAbilityLevel: char.passiveAbilityLevel,
                unitId,
            },
        ]);
    };

    const handleCharChange = (slotId: number, oldCharId: string, newCharId: string) => {
        const oldChar = allowedChars.find(c => c.snowprintId === oldCharId);
        const newChar = allowedChars.find(c => c.snowprintId === newCharId);
        if (!oldChar || !newChar) return;
        const char = allowedChars.find(c => c.snowprintId === newCharId);
        if (!char) return;
        const oldUnitId = {
            id: oldChar.snowprintId,
            teamId: 'player',
            uuid: BattleHelper.getUuid(oldChar.snowprintId, 'player', 0),
        };
        const newUnitId = {
            id: newChar.snowprintId,
            teamId: 'player',
            uuid: BattleHelper.getUuid(newChar.snowprintId, 'player', 0),
        };
        const newState = { ...battleState };
        delete newState.units[oldUnitId.uuid];
        delete newState.unitDetails[oldUnitId.uuid];
        delete newState.locations[oldUnitId.uuid];
        newState.units[newUnitId.uuid] = newUnitId;
        newState.unitDetails[newUnitId.uuid] = {
            rank: newChar.rank,
            rarity: newChar.rarity,
            stars: newChar.stars,
            activeLevel: newChar.activeAbilityLevel,
            passiveLevel: newChar.passiveAbilityLevel,
            equipment: ['', '', ''],
            equipmentLevel: [-1, -1, -1],
            appliedUpgrades: [false, false, false, false, false, false],
        };
        newState.locations[newUnitId.uuid] = newState.locations[oldUnitId.uuid];
        setBattleState(newState);
        setPlacedCharacters(previous =>
            previous.map(c =>
                c.slotId === slotId
                    ? {
                          ...c,
                          charId: char.snowprintId,
                          roundIcon: char.roundIcon,
                          rank: char.rank,
                          rarity: char.rarity,
                          stars: char.stars,
                          activeAbilityLevel: char.activeAbilityLevel,
                          passiveAbilityLevel: char.passiveAbilityLevel,
                          unitId: newUnitId,
                      }
                    : c
            )
        );
    };

    const handleSlotUpdate = (slotId: number, updates: Partial<PlacedCharacter>) => {
        const char = placedCharacters.find(c => c.slotId === slotId);
        if (!char) return;
        const newState = { ...battleState };
        newState.locations[char.unitId.uuid] = {
            vCol: updates.tile ? updates.tile.vCol : newState.locations[char.unitId.uuid].vCol,
            vRow: updates.tile ? updates.tile.vRow : newState.locations[char.unitId.uuid].vRow,
        };
        newState.unitDetails[char.unitId.uuid] = {
            rank: updates.rank ?? char.rank,
            rarity: updates.rarity ?? char.rarity,
            stars: updates.stars ?? char.stars,
            activeLevel: updates.activeAbilityLevel ?? char.activeAbilityLevel,
            passiveLevel: updates.passiveAbilityLevel ?? char.passiveAbilityLevel,
            equipment: ['', '', ''],
            equipmentLevel: [-1, -1, -1],
            appliedUpgrades: [false, false, false, false, false, false],
        };
        setBattleState(newState);
        setPlacedCharacters(previous => previous.map(c => (c.slotId === slotId ? { ...c, ...updates } : c)));
    };

    const bossOptions = BOSS_INFO.map(b => ({
        value: b.id,
        label: b.name,
        imageUrl: getBossImageUrl(b.image_name),
    }));

    const primeOptions = useMemo(() => {
        const pool = selectedBossId ? DUMMY_PRIMES.filter(p => p.bossId === selectedBossId) : DUMMY_PRIMES;

        const bossEntry = selectedBossId ? BOSS_INFO.find(b => b.id === selectedBossId) : undefined;

        return [
            // The boss itself as a selectable "prime"
            ...(bossEntry ? [{ value: bossEntry.id, label: bossEntry.name, sub: 'Boss' }] : []),
            ...pool.map(p => ({ value: p.id, label: p.name, sub: 'Prime' })),
        ];
    }, [selectedBossId]);

    // Reset prime when boss changes
    const handleBossChange = (id: string) => {
        setSelectedBossId(id);
        setSelectedPrimeId('');
        setMapOptions(
            raidHitData.Maps.filter(mapId => {
                const boss = BOSS_INFO.find(b => b.id === id);
                return boss ? mapId.startsWith(boss.map_prefix) : true;
            })
        );
    };

    return (
        <div className="min-h-screen bg-[#0b0c10] px-6 pt-8 pb-16 font-[Nunito] text-[#d4d8e8]">
            <header className="mb-8 flex items-baseline gap-[14px]">
                <h1 className="m-0 font-[Rajdhani] text-[28px] leading-none font-bold tracking-[0.06em] text-[#c8a84b] uppercase">
                    Raid Planner
                </h1>
                <span className="text-xs font-light tracking-[0.12em] text-[#5c6280] uppercase">
                    Tacticus Guild Raid
                </span>
            </header>

            <div className="relative mb-7 flex flex-wrap gap-4 rounded-[6px] border border-[#1f2232] bg-[#13151e] px-[22px] py-5">
                <div className="pointer-events-none absolute inset-0 rounded-[6px] bg-gradient-to-br from-[rgba(200,168,75,0.04)] to-transparent" />
                <Select
                    label="Guild Boss"
                    value={selectedBossId}
                    onChange={handleBossChange}
                    options={bossOptions}
                    placeholder="Select a boss…"
                />

                <Select
                    label="Boss / Prime"
                    value={selectedPrimeId}
                    onChange={setSelectedPrimeId}
                    options={primeOptions}
                    placeholder={selectedBossId ? 'Select boss or prime…' : 'Select a boss first…'}
                    disabled={!selectedBossId}
                />

                <Select
                    label="Map"
                    value={selectedMapId}
                    onChange={setSelectedMapId}
                    options={mapOptions.map((mapId: string) => ({ value: mapId, label: mapId }))}
                    placeholder="Select a map…"
                />
            </div>

            {/* ── Characters ─────────────────────────────────────────────── */}
            <div className="relative mt-2 flex flex-col gap-3 rounded-[6px] border border-[#1f2232] bg-[#13151e] px-[22px] py-5">
                <div className="pointer-events-none absolute inset-0 rounded-[6px] bg-gradient-to-br from-[rgba(80,255,100,0.03)] to-transparent" />
                <div className="flex items-center justify-between">
                    <span className="font-[Rajdhani] text-[10px] font-semibold tracking-[0.18em] text-[#c8a84b] uppercase">
                        Characters ({placedCharacters.length}/5)
                    </span>
                    <button
                        type="button"
                        onClick={handleAddChar}
                        disabled={placedCharacters.length >= 5 || !mapMetrics}
                        className="flex items-center gap-1 rounded-[4px] border border-[#2e3352] bg-[#0b0c10] px-3 py-[5px] text-[12px] text-[#d4d8e8] transition-colors hover:border-[#c8a84b] hover:text-[#c8a84b] disabled:pointer-events-none disabled:opacity-30">
                        + Add
                    </button>
                </div>
                {placedCharacters.length === 0 && (
                    <p className="text-[12px] text-[#5c6280]">
                        {mapMetrics ? 'Add characters to place them on the map.' : 'Select a map first.'}
                    </p>
                )}
                {placedCharacters.map(slot => {
                    const usedIds = new Set(placedCharacters.filter(c => c.slotId !== slot.slotId).map(c => c.charId));
                    const charOptions = allowedChars
                        .filter(c => !usedIds.has(c.snowprintId))
                        .map(c => ({ value: c.snowprintId, label: c.name, imageUrl: getImageUrl(c.roundIcon) }));
                    return (
                        <div
                            key={slot.slotId}
                            className="flex flex-wrap items-center gap-3 rounded-[4px] border border-[#1a1e30] bg-[#0d0f1a] px-3 py-2">
                            <button
                                type="button"
                                onClick={() =>
                                    setPlacedCharacters(previous => previous.filter(c => c.slotId !== slot.slotId))
                                }
                                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#3a2020] bg-[#1a0f0f] text-[11px] text-[#cc5555] hover:border-[#cc5555]">
                                ×
                            </button>
                            <CharacterSelect
                                value={slot.charId}
                                options={charOptions}
                                onChange={newId => handleCharChange(slot.slotId, slot.charId, newId)}
                            />
                            <RankCompactSelect
                                value={String(slot.rank)}
                                onChange={v => handleSlotUpdate(slot.slotId, { rank: Number(v) as Rank })}
                            />
                            <RarityCompactSelect
                                value={String(slot.rarity)}
                                onChange={v => handleSlotUpdate(slot.slotId, { rarity: Number(v) as Rarity })}
                            />
                            <StarsCompactSelect
                                value={String(slot.stars)}
                                onChange={v => handleSlotUpdate(slot.slotId, { stars: Number(v) as RarityStars })}
                            />
                            <div className="flex flex-col gap-[3px]">
                                <span className="font-[Rajdhani] text-[9px] font-semibold tracking-[0.1em] text-[#7a8099] uppercase">
                                    Active
                                </span>
                                <input
                                    type="number"
                                    min={1}
                                    max={65}
                                    value={slot.activeAbilityLevel}
                                    onChange={event_ =>
                                        handleSlotUpdate(slot.slotId, {
                                            activeAbilityLevel: Math.min(65, Math.max(1, Number(event_.target.value))),
                                        })
                                    }
                                    className="w-[52px] rounded-[4px] border border-[#2e3352] bg-[#0b0c10] px-2 py-[5px] text-center text-[12px] text-[#d4d8e8] outline-none focus:border-[#c8a84b]"
                                />
                            </div>
                            <div className="flex flex-col gap-[3px]">
                                <span className="font-[Rajdhani] text-[9px] font-semibold tracking-[0.1em] text-[#7a8099] uppercase">
                                    Passive
                                </span>
                                <input
                                    type="number"
                                    min={1}
                                    max={65}
                                    value={slot.passiveAbilityLevel}
                                    onChange={event_ =>
                                        handleSlotUpdate(slot.slotId, {
                                            passiveAbilityLevel: Math.min(65, Math.max(1, Number(event_.target.value))),
                                        })
                                    }
                                    className="w-[52px] rounded-[4px] border border-[#2e3352] bg-[#0b0c10] px-2 py-[5px] text-center text-[12px] text-[#d4d8e8] outline-none focus:border-[#c8a84b]"
                                />
                            </div>
                            <div className="flex min-w-[90px] flex-col gap-[2px]">
                                <span className="font-[Rajdhani] text-[9px] font-semibold tracking-[0.1em] text-[#7a8099] uppercase">
                                    Stats
                                </span>
                                <div className="flex gap-2 text-[12px] text-[#d4d8e8]">
                                    <span>Health: {BattleHelper.getHealthStat(battleState, slot.unitId)}</span>
                                    <span>Damage: {BattleHelper.getDamageStat(battleState, slot.unitId)}</span>
                                    <span>Armor: {BattleHelper.getArmorStat(battleState, slot.unitId)}</span>
                                    <span>Crit Chance: {BattleHelper.getCritChance(battleState, slot.unitId)}</span>
                                    <span>Crit Damage: {BattleHelper.getCritDamage(battleState, slot.unitId)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="my-6 h-px bg-gradient-to-r from-transparent via-[#2e3352] to-transparent" />
            {selectedMapId ? (
                <HexMapPreview
                    mapId={selectedMapId}
                    bossSize={BOSS_INFO.find(b => b.id === selectedBossId)?.tiles ?? 7}
                    bossImageName={BOSS_INFO.find(b => b.id === selectedBossId)?.image_name}
                    placedCharacters={placedCharacters}
                    onCharacterMoved={handleCharacterMoved}
                    onMapReady={handleMapReady}
                />
            ) : (
                <div className="flex min-h-[340px] flex-col items-center justify-center gap-4 rounded-[6px] border border-dashed border-[#2e3352] text-[#5c6280]">
                    <div className="opacity-20">
                        <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                            <path d="M28 6L50 18V38L28 50L6 38V18L28 6Z" stroke="currentColor" strokeWidth="1.5" />
                            <path
                                d="M28 6V50M6 18L50 18M6 38L50 38"
                                stroke="currentColor"
                                strokeWidth="1"
                                strokeDasharray="4 4"
                            />
                            <circle cx="28" cy="28" r="4" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                    </div>
                    <span className="font-[Rajdhani] text-[13px] tracking-[0.14em] text-[#5c6280] uppercase">
                        Select a map to begin planning
                    </span>
                </div>
            )}
        </div>
    );
};
