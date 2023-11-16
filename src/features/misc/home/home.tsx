﻿import { Thanks } from '../../../shared-components/thanks';
import React, { useContext } from 'react';
import { StoreContext } from '../../../reducers/store.provider';
import { Card, CardContent, CardHeader } from '@mui/material';
import { menuItemById } from '../../../models/menu-items';
import { useNavigate } from 'react-router-dom';
import { isMobile } from 'react-device-detect';
import { GoalCard } from '../../../routes/goals/goals';

export const Home = () => {
    const navigate = useNavigate();
    const { goals, dailyRaids } = useContext(StoreContext);
    const nextLeMenuItem = menuItemById['ragnar'];
    const goalsMenuItem = menuItemById['goals'];
    const dailyRaidsMenuItem = menuItemById['dailyRaids'];
    const topPriorityGoal = goals[0];

    function timeLeftToFutureDate(futureDate: string): string {
        const currentDate = new Date();
        const targetDate = new Date(futureDate);
        const timeDifference = targetDate.getTime() - currentDate.getTime();

        // Calculate days, hours, and minutes
        const days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        // Format the result
        const result = days === 1 ? `${days} Day ${hours} h` : `${days} Days ${hours} h`;

        return timeDifference >= 0 ? result : 'Started';
    }

    return (
        <div>
            <Thanks sliderMode={true} />
            <div
                style={{
                    display: 'flex',
                    gap: 10,
                    flexWrap: 'wrap',
                    alignItems: 'flex-start',
                    justifyContent: 'center',
                }}>
                <div>
                    <h3 style={{ textAlign: 'center' }}>Upcoming Legendary Event</h3>
                    <Card
                        onClick={() => navigate(isMobile ? nextLeMenuItem.routeMobile : nextLeMenuItem.routeWeb)}
                        sx={{
                            width: 350,
                            minHeight: 200,
                            cursor: 'pointer',
                        }}>
                        <CardHeader
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {nextLeMenuItem.icon} {nextLeMenuItem.label}
                                </div>
                            }
                            subheader={'November 19'}
                        />
                        <CardContent style={{ display: 'flex', flexDirection: 'column' }}>
                            {timeLeftToFutureDate('2023-11-19')}
                        </CardContent>
                    </Card>
                </div>

                {topPriorityGoal ? (
                    <div>
                        <h3 style={{ textAlign: 'center' }}>Top Priority Goal</h3>
                        <GoalCard
                            goal={topPriorityGoal}
                            higherPriorityGoals={[]}
                            onClick={() => navigate(isMobile ? goalsMenuItem.routeMobile : goalsMenuItem.routeWeb)}
                        />
                    </div>
                ) : undefined}

                <div>
                    <h3 style={{ textAlign: 'center' }}>Daily Raids</h3>
                    <Card
                        onClick={() =>
                            navigate(isMobile ? dailyRaidsMenuItem.routeMobile : dailyRaidsMenuItem.routeWeb)
                        }
                        sx={{
                            width: 350,
                            minHeight: 200,
                            cursor: 'pointer',
                        }}>
                        <CardHeader
                            title={
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {dailyRaidsMenuItem.icon}{' '}
                                    {dailyRaids.completedBattles.length + ' locations completed today'}
                                </div>
                            }
                        />
                        <CardContent>
                            <ul>
                                {dailyRaids.completedBattles.map(x => (
                                    <li key={x}>{x}</li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};
