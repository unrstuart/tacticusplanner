﻿import React from 'react';
import { Card, CardHeader } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import TargetIcon from '@mui/icons-material/TrackChanges';
import { inputSubMenu } from '../../models/menu-items';

export const InputRoutes = () => {
    const navigate = useNavigate();

    return (
        <div style={{ display: 'flex', gap: 10, flexDirection: 'column', alignItems: 'center' }}>
            {inputSubMenu.map(item => (
                <Card
                    key={item.label}
                    onClick={() => navigate(item.routeMobile)}
                    sx={{
                        width: 350,
                        minHeight: 200,
                    }}>
                    <CardHeader
                        title={
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                {item.icon} {item.label}
                            </div>
                        }
                    />
                </Card>
            ))}
        </div>
    );
};
