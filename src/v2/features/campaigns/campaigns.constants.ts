import { Campaign, Faction } from 'src/models/enums';
import { CampaignDifficulty, CampaignGroupType, CampaignReleaseType } from './campaigns.enums';
import { ICampaignModel } from './campaigns.models';
import { groupBy, mapValues } from 'lodash';

export const campaignsList: ICampaignModel[] = [
    // Indomitus Campaigns
    {
        id: Campaign.I,
        name: 'Indomitus',
        displayName: 'Indomitus',
        faction: Faction.Ultramarines,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.indomitus,
        difficulty: CampaignDifficulty.standard,
    },
    {
        id: Campaign.IE,
        name: 'Indomitus Elite',
        displayName: 'Indomitus Elite',
        faction: Faction.Ultramarines,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.indomitus,
        difficulty: CampaignDifficulty.elite,
    },
    {
        id: Campaign.IM,
        name: 'Indomitus Mirror',
        displayName: 'Indomitus Mirror',
        faction: Faction.Necrons,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.indomitus,
        difficulty: CampaignDifficulty.mirror,
    },
    {
        id: Campaign.IME,
        name: 'Indomitus Mirror Elite',
        displayName: 'Indomitus Mirror Elite',
        faction: Faction.Necrons,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.indomitus,
        difficulty: CampaignDifficulty.elite,
    },

    // Fall of Cadia Campaigns
    {
        id: Campaign.FoC,
        name: 'Fall of Cadia',
        displayName: 'Fall of Cadia',
        faction: Faction.Black_Legion,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.fallOfCadia,
        difficulty: CampaignDifficulty.standard,
    },
    {
        id: Campaign.FoCE,
        name: 'Fall of Cadia Elite',
        displayName: 'Fall of Cadia Elite',
        faction: Faction.Black_Legion,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.fallOfCadia,
        difficulty: CampaignDifficulty.elite,
    },
    {
        id: Campaign.FoCM,
        name: 'Fall of Cadia Mirror',
        displayName: 'Fall of Cadia Mirror',
        faction: Faction.Astra_militarum,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.fallOfCadia,
        difficulty: CampaignDifficulty.mirror,
    },
    {
        id: Campaign.FoCME,
        name: 'Fall of Cadia Mirror Elite',
        displayName: 'Fall of Cadia Mirror Elite',
        faction: Faction.Astra_militarum,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.fallOfCadia,
        difficulty: CampaignDifficulty.elite,
    },

    // Octarius Campaigns
    {
        id: Campaign.O,
        name: 'Octarius',
        displayName: 'Octarius',
        faction: Faction.Orks,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.octarius,
        difficulty: CampaignDifficulty.standard,
    },
    {
        id: Campaign.OE,
        name: 'Octarius Elite',
        displayName: 'Octarius Elite',
        faction: Faction.Orks,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.octarius,
        difficulty: CampaignDifficulty.elite,
    },
    {
        id: Campaign.OM,
        name: 'Octarius Mirror',
        displayName: 'Octarius Mirror',
        faction: Faction.Black_Templars,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.octarius,
        difficulty: CampaignDifficulty.mirror,
    },
    {
        id: Campaign.OME,
        name: 'Octarius Mirror Elite',
        displayName: 'Octarius Mirror Elite',
        faction: Faction.Black_Templars,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.octarius,
        difficulty: CampaignDifficulty.elite,
    },

    // Saim-Hann Campaigns
    {
        id: Campaign.SH,
        name: 'Saim-Hann',
        displayName: 'Saim-Hann',
        faction: Faction.Aeldari,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.saimHann,
        difficulty: CampaignDifficulty.standard,
    },
    {
        id: Campaign.SHE,
        name: 'Saim-Hann Elite',
        displayName: 'Saim-Hann Elite',
        faction: Faction.Aeldari,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.saimHann,
        difficulty: CampaignDifficulty.elite,
    },
    {
        id: Campaign.SHM,
        name: 'Saim-Hann Mirror',
        displayName: 'Saim-Hann Mirror',
        faction: Faction.Thousand_Sons,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.saimHann,
        difficulty: CampaignDifficulty.mirror,
    },
    {
        id: Campaign.SHME,
        name: 'Saim-Hann Mirror Elite',
        displayName: 'Saim-Hann Mirror Elite',
        faction: Faction.Thousand_Sons,
        releaseType: CampaignReleaseType.standard,
        groupType: CampaignGroupType.saimHann,
        difficulty: CampaignDifficulty.elite,
    },

    // Adeptus Mechanicus Campaign Events
    {
        id: Campaign.AMS,
        name: 'Adeptus Mechanicus Standard',
        displayName: 'AdMech Standard',
        faction: Faction.Death_Guard,
        releaseType: CampaignReleaseType.event,
        groupType: CampaignGroupType.adMechCE,
        difficulty: CampaignDifficulty.eventStandard,
    },
    {
        id: Campaign.AMSC,
        name: 'Adeptus Mechanicus Standard Challenge',
        displayName: 'AMS Challenge',
        faction: Faction.Death_Guard,
        releaseType: CampaignReleaseType.event,
        groupType: CampaignGroupType.adMechCE,
        difficulty: CampaignDifficulty.eventChallenge,
    },
    {
        id: Campaign.AME,
        name: 'Adeptus Mechanicus Extremis',
        displayName: 'AdMech Extremis',
        faction: Faction.Death_Guard,
        releaseType: CampaignReleaseType.event,
        groupType: CampaignGroupType.adMechCE,
        difficulty: CampaignDifficulty.eventExtremis,
    },
    {
        id: Campaign.AMEC,
        name: 'Adeptus Mechanicus Extremis Challenge',
        displayName: 'AME Challenge',
        faction: Faction.Death_Guard,
        releaseType: CampaignReleaseType.event,
        groupType: CampaignGroupType.adMechCE,
        difficulty: CampaignDifficulty.eventChallenge,
    },
];

export const campaignsByGroup: Record<string, Campaign[]> = mapValues(groupBy(campaignsList, 'groupType'), value =>
    value.map(x => x.id)
);

const campaignEvents: CampaignGroupType[] = [CampaignGroupType.adMechCE];

export const campaignEventsLocations: Campaign[] = campaignsList
    .filter(x => campaignEvents.includes(x.groupType))
    .map(x => x.id);
