﻿import React, { useMemo } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Checkbox, FormControlLabel } from '@mui/material';
import {
    ILegendaryEvent,
    ILegendaryEventBattle,
    ILegendaryEventProgress,
    ILegendaryEventProgressTrack,
    ILegendaryEventTrackRequirement
} from '../models/interfaces';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getCompletionRateColor } from '../shared-logic/functions';

export const LeProgressOverview = ({ progress, legendaryEvent }: { progress: ILegendaryEventProgress, legendaryEvent: ILegendaryEvent }) => {
    const [accordionExpanded, setAccordionExpanded] = React.useState<string | false>(false);
    
    const [regularMissionsProgress, setRegularMissionsProgress] = React.useState<number>(progress.regularMissions);
    const [premiumMissionsProgress, setPremiumMissionsProgress] = React.useState<number>(progress.premiumMissions);

    const handleAccordionChange =
        (section: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
            setAccordionExpanded(isExpanded ? section : false);
        };
    
    return (
        <div>
            <Accordion TransitionProps={{ unmountOnExit: true }}  expanded={accordionExpanded === 'alpha'} onChange={handleAccordionChange('alpha')}>
                <AccordionSummary expandIcon={
                    <ExpandMoreIcon/>}>
                    <TrackSummary title={'Alpha'} trackProgress={progress.alpha}/>
                </AccordionSummary>
                <AccordionDetails>
                    <TrackDetails trackProgress={progress.alpha}/>
                </AccordionDetails>
            </Accordion>

            <Accordion TransitionProps={{ unmountOnExit: true }}  expanded={accordionExpanded === 'beta'} onChange={handleAccordionChange('beta')}>
                <AccordionSummary expandIcon={
                    <ExpandMoreIcon/>}>
                    <TrackSummary title={'Beta'} trackProgress={progress.beta}/>
                </AccordionSummary>
                <AccordionDetails>
                    <TrackDetails trackProgress={progress.beta}/>
                </AccordionDetails>
            </Accordion>

            <Accordion TransitionProps={{ unmountOnExit: true }}  expanded={accordionExpanded === 'gamma'} onChange={handleAccordionChange('gamma')}>
                <AccordionSummary expandIcon={
                    <ExpandMoreIcon/>}>
                    <TrackSummary title={'Gamma'} trackProgress={progress.gamma}/>
                </AccordionSummary>
                <AccordionDetails>
                    <TrackDetails trackProgress={progress.gamma}/>
                </AccordionDetails>
            </Accordion>

            { 
                legendaryEvent.regularMission.length
                    ? (
                        <Accordion TransitionProps={{ unmountOnExit: true }} expanded={accordionExpanded === 'regularMissions'}
                            onChange={handleAccordionChange('regularMissions')}>
                            <AccordionSummary expandIcon={
                                <ExpandMoreIcon/>}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span>Regular Missions</span>
                                    <span style={{ fontWeight: 700 }}>{progress.regularMissions}/{10}</span>
                                </div>
                            </AccordionSummary>
                            <AccordionDetails>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {legendaryEvent.regularMission.map((mission, index) =>
                                        <FormControlLabel key={mission} control={<Checkbox
                                            checked={ index < regularMissionsProgress}
                                            onChange={(_, checked) => setRegularMissionsProgress(checked ? index + 1 : index)}
                                            inputProps={{ 'aria-label': 'controlled' }}
                                        />} label={index + 1 + '. ' + mission}/>
                                    )}
                                </div>
                            </AccordionDetails>
                        </Accordion>
                    ) 
                    : undefined 
            }

            {
                legendaryEvent.premiumMissions.length
                    ? (
                        <Accordion TransitionProps={{ unmountOnExit: true }}  expanded={accordionExpanded === 'premiumMissions'} onChange={handleAccordionChange('premiumMissions')} >
                            <AccordionSummary expandIcon={
                                <ExpandMoreIcon/>}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <span>Premium Missions</span>
                                    <span style={{ fontWeight: 700 }}>{progress.premiumMissions}/{10}</span>
                                </div>
                            </AccordionSummary>
                            <AccordionDetails>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    {legendaryEvent.premiumMissions.map((mission, index) =>
                                        <FormControlLabel key={mission} control={<Checkbox
                                            checked={ index < premiumMissionsProgress}
                                            onChange={(_, checked) => setPremiumMissionsProgress(checked ? index + 1 : index)}
                                            inputProps={{ 'aria-label': 'controlled' }}
                                        />} label={index + 1 + '. ' + mission}/>
                                    )}
                                </div>
                            </AccordionDetails>
                        </Accordion>
                    )
                    : undefined
            }
        </div>
    );
};

const TrackSummary = ({ title, trackProgress }: { title: string, trackProgress: ILegendaryEventProgressTrack}) => {
    const totalBattles = useMemo(() => trackProgress.requirements.length * trackProgress.battles.length, []) ;
    const currentBattles = useMemo(() => trackProgress.battles.flatMap(x => x.state).filter(x => x).length, []);

    const totalPoints = useMemo(() =>  trackProgress.requirements.map(x => x.points).reduce((accumulator, currentValue) => accumulator + currentValue, 0) * trackProgress.battles.length, []);
    const currentPoints = useMemo(() => {
        let total = 0;

        trackProgress.battles.forEach(battle => {
            battle.state.forEach((value, index) => {
                if(value) {
                    total += trackProgress.requirements[index].points;
                }
            });
        });

        return total;
    }, []);


    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ marginInlineEnd: 10 }}>{title}</span>
            <span style={{ marginInlineEnd: 10, fontWeight: 700 }}>{currentBattles}/{totalBattles}</span>
            <span style={{ marginInlineEnd: 10, fontWeight: 700 }}>{currentPoints}/{totalPoints}</span>
        </div>
    );
};

const TrackDetails = ({ trackProgress }: { trackProgress: ILegendaryEventProgressTrack}) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
            {trackProgress.requirements.map((req, index) =>
                <RequirementDetails key={req.name} req={req} battles={trackProgress.battles} reqIndex={index}/>
            )}
        </div>
    );
};

const RequirementDetails = ({ req, battles, reqIndex }: {req: ILegendaryEventTrackRequirement, battles: ILegendaryEventBattle[], reqIndex: number}) => {
    const completedBattles = useMemo(() => {
        let total = 0;
        
        battles.forEach(battle => {
            if(battle.state[reqIndex]) {
                total ++;
            }
        });

        return total;
    }, [reqIndex]);

    const scoredPoints = useMemo(() => {
        let total = 0;

        battles.forEach(battle => {
            if(battle.state[reqIndex]) {
                total += req.points;
            }
        });

        return total;
    },[]);
    
    return (
        <div key={req.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>{req.name}</span>
            <span style={{ fontWeight: 700 }}>{completedBattles}/{battles.length}</span>
            <span style={{ fontWeight: 700 }}>{scoredPoints}/{req.points * battles.length}</span>
            <div style={{
                width: 15,
                height: 15,
                backgroundColor: getCompletionRateColor(completedBattles, battles.length),
                borderRadius: 50
            }}></div>
        </div>
    );
};