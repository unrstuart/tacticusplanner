﻿import React from 'react';

import {
    RouteObject,
} from 'react-router-dom';

import App from '../app';
import { About } from './root/about';
import { WhoYouOwn } from './who-you-own/who-you-own';
import { Characters } from './characters/characters';
import { DirtyDozen } from './dirty-dozen/dirty-dozen';
import { LegendaryEventPage } from './legendary-events/legendary-events-page';
import { Contacts } from './contacts/contacts';
import { Progression } from './progression/progression';

export const appRoutes : RouteObject[] =[
    {
        path: '',
        element: <App/>,
        children: [
            {
                path: '/',
                element: <About/>,
            },
            {
                path: 'wyo',
                element: <WhoYouOwn/>,
            },
            {
                path: 'characters',
                element: <Characters/>,
            },
            {
                path: 'progression',
                element: <Progression/>,
            },
            {
                path: 'dirtyDozen',
                element: <DirtyDozen/>,
            },
            {
                path: 'le',
                element: <LegendaryEventPage/>,
            },
            {
                path: 'contacts',
                element: <Contacts/>,
            },
        ],
    },
];