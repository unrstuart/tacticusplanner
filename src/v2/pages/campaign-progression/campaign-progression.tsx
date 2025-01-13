import React, { useContext, useMemo } from 'react';

import { CampaignImage } from 'src/v2/components/images/campaign-image';
import { StoreContext } from 'src/reducers/store.provider';
import { CampaignData } from 'src/v2/features/campaign-progression/campaign-progression.models';
import { CampaignProgressionAscensionGoals } from 'src/v2/pages/campaign-progression/campaign-progression-ascension-goals';
import { CampaignProgressionMaterialGoals } from 'src/v2/pages/campaign-progression/campaign-progression-material-goals';
import { CampaignProgressionRankupGoals } from 'src/v2/pages/campaign-progression/campaign-progression-rankup-goals';
import { CampaignProgressionHeader } from 'src/v2/pages/campaign-progression/campaign-progression-header';
import { CampaignProgressionUnfarmableMaterials } from 'src/v2/pages/campaign-progression/campaign-progression-unfarmable-materials';
import { CampaignsProgressionService } from 'src/v2/features/campaign-progression/campaign-progression.service';

import { GoalsService } from 'src/v2/features/goals/goals.service';
import {
    ICharacterUpgradeRankGoal,
    ICharacterUpgradeMow,
    ICharacterUnlockGoal,
    ICharacterAscendGoal,
} from 'src/v2/features/goals/goals.models';

export const CampaignProgression = () => {
    const { goals, characters, mows, campaignsProgress } = useContext(StoreContext);

    const { allGoals, shardsGoals, upgradeRankOrMowGoals } = useMemo(() => {
        return GoalsService.prepareGoals(goals, [...characters, ...mows], false);
    }, [goals, characters, mows]);

    const progression = useMemo(() => {
        const allGoals: Array<
            ICharacterUpgradeMow | ICharacterUpgradeRankGoal | ICharacterUnlockGoal | ICharacterAscendGoal
        > = shardsGoals;
        for (const goal of upgradeRankOrMowGoals) {
            allGoals.push(goal);
        }
        return CampaignsProgressionService.computeCampaignsProgress(allGoals, campaignsProgress);
    }, [allGoals, campaignsProgress]);

    const campaignDataArray = useMemo(() => {
        const result: CampaignData[] = [];
        for (const [campaign, data] of progression.data.entries()) {
            result.push([campaign, data]);
        }
        return result;
    }, [progression]);

    /** @returns the goal with the given ID. */
    function getGoal(
        goalId: string
    ): ICharacterAscendGoal | ICharacterUnlockGoal | ICharacterUpgradeRankGoal | ICharacterUpgradeMow | undefined {
        let filtered: Array<
            ICharacterAscendGoal | ICharacterUnlockGoal | ICharacterUpgradeRankGoal | ICharacterUpgradeMow
        > = upgradeRankOrMowGoals.filter(goal => goal.goalId == goalId);
        if (filtered.length == 0) {
            filtered = shardsGoals.filter(goal => goal.goalId == goalId);
        }
        if (filtered.length == 0) {
            console.warn('goalId not found { ' + goalId + ' ' + upgradeRankOrMowGoals.length + ' }');
            return undefined;
        }
        if (filtered.length > 1) {
            console.warn('multiple goals with ID ' + goalId + ' found.');
        }
        return filtered[0];
    }

    /**
     * @returns the rankup goal with the given ID, or undefined if it either
     *          doesn't exist, or isn't a rankup goal.
     */
    function getRankUpGoal(goalId: string): ICharacterUpgradeRankGoal | undefined {
        const goal = getGoal(goalId);
        if (goal && 'rankStart' in goal) return goal as ICharacterUpgradeRankGoal;
        return undefined;
    }

    /**
     * @returns the row data for the grid that holds the ascend-character
     *          goals related to the campaign.
     */
    function getRankUpGoalData(campaignData: CampaignData): any[] {
        const rowData: any[] = [];
        for (const [goalId, cost] of campaignData[1].goalCost) {
            const goal = getRankUpGoal(goalId);
            if (goal) rowData.push({ goalData: [{ goalId: goalId, goalCost: cost }] });
        }
        return rowData;
    }

    /**
     * @returns the ascension goal with the given ID, or undefined if it either
     *          doesn't exist, or isn't an ascension goal.
     */
    function getAscensionGoal(goalId: string): ICharacterAscendGoal | undefined {
        const goal = getGoal(goalId);
        if (goal && 'rarityStart' in goal && 'starsStart' in goal) return goal as ICharacterAscendGoal;
        return undefined;
    }

    /**
     * @returns the row data for the grid that holds the ascend-character
     *          goals related to the campaign.
     */
    function getAscendGoalData(campaignData: CampaignData): any[] {
        const rowData: any[] = [];
        for (const [goalId, cost] of campaignData[1].goalCost) {
            const goal = getAscensionGoal(goalId);
            if (goal) {
                rowData.push({ goalData: [{ goalId: goalId, goalCost: cost }] });
            }
        }
        return rowData;
    }

    /**
     * @returns the row data for the grid that holds the material
     * requirements related to the campaign.
     */
    function getCampaignMaterialData(campaignData: CampaignData): any[] {
        const rowData: any[] = [];
        for (const savings of campaignData[1].savings) {
            rowData.push({ savingsData: [{ savings: savings }] });
        }
        return rowData;
    }

    return (
        <div key="root">
            <CampaignProgressionHeader />
            <CampaignProgressionUnfarmableMaterials progression={progression} campaignDataArray={campaignDataArray} />
            <h1>Campaign Progression</h1>
            {campaignDataArray.map((entry, ignored) => {
                return (
                    <div key={'grid_' + entry[0]}>
                        <p />
                        <p />
                        <table>
                            <tbody>
                                <tr>
                                    <td>
                                        <CampaignImage campaign={entry[0]} />
                                    </td>
                                    <td>{entry[0]}</td>
                                </tr>
                            </tbody>
                        </table>
                        <p />
                        <p />
                        {getAscendGoalData(entry).length > 0 && (
                            <CampaignProgressionAscensionGoals campaignData={entry} goals={shardsGoals} />
                        )}
                        {getRankUpGoalData(entry).length > 0 && (
                            <CampaignProgressionRankupGoals campaignData={entry} goals={upgradeRankOrMowGoals} />
                        )}
                        {getCampaignMaterialData(entry).length > 0 && (
                            <CampaignProgressionMaterialGoals campaignData={entry} progression={progression} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};
