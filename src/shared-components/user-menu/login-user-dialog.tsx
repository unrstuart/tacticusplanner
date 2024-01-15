﻿import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import {
    Backdrop,
    CircularProgress,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    Input,
} from '@mui/material';
import Button from '@mui/material/Button';
import { loginUser } from '../../api/api-functions';
import { useAuth } from '../../contexts/auth';
import { AxiosError } from 'axios';
import { IErrorResponse } from '../../api/api-interfaces';
import { enqueueSnackbar } from 'notistack';
import Box from '@mui/material/Box';
import InputLabel from '@mui/material/InputLabel';

export const LoginUserDialog = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
    const [loginForm, setLoginForm] = useState({
        username: '',
        password: '',
    });
    const [open, setOpen] = React.useState(false);

    const { login } = useAuth();

    return (
        <Dialog open={isOpen} onClose={onClose}>
            <DialogTitle>Login</DialogTitle>
            <DialogContent>
                <Box component="form" id="login-form" onSubmit={event => event.preventDefault()}>
                    <FormControl required fullWidth variant={'standard'}>
                        <InputLabel htmlFor="username-input">Username</InputLabel>
                        <Input
                            id="username-input"
                            onChange={event => setLoginForm(curr => ({ ...curr, username: event.target.value }))}
                        />
                    </FormControl>
                    <FormControl required fullWidth variant={'standard'}>
                        <InputLabel htmlFor="password-input">Password</InputLabel>
                        <Input
                            id="password-input"
                            type="password"
                            onChange={event => setLoginForm(curr => ({ ...curr, password: event.target.value }))}
                        />
                    </FormControl>
                </Box>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button
                    form="login-form"
                    type="submit"
                    disabled={!loginForm.username || !loginForm.password}
                    onClick={() => {
                        setOpen(true);
                        loginUser(loginForm.username, loginForm.password)
                            .then(data => {
                                login(data.data.accessToken);
                                onClose();
                            })
                            .catch((err: AxiosError<IErrorResponse>) => {
                                if (err.response?.status === 401) {
                                    enqueueSnackbar('Session expired. Please re-login.', { variant: 'error' });
                                } else if (err.response?.status === 400) {
                                    alert(err.response.data.message);
                                } else {
                                    enqueueSnackbar('Something went wrong. Try again later', { variant: 'error' });
                                }
                            })
                            .finally(() => setOpen(false));
                    }}>
                    Submit
                </Button>
            </DialogActions>
            <Backdrop sx={{ color: '#fff', zIndex: theme => theme.zIndex.drawer + 1 }} open={open}>
                <CircularProgress color="inherit" />
            </Backdrop>
        </Dialog>
    );
};
