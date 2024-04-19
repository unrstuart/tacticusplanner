﻿import React, { useContext } from 'react';
import { FlexBox } from 'src/v2/components/flex-box';
import { DispatchContext, StoreContext } from 'src/reducers/store.provider';
import { GuildMemberInput } from 'src/v2/features/guild/guild-member-input';
import { Tooltip } from '@mui/material';
import Button from '@mui/material/Button';
import { Conditional } from 'src/v2/components/conditional';
import { GuildMemberView } from 'src/v2/features/guild/guild-member-view';
import IconButton from '@mui/material/IconButton';
import SavedSearchIcon from '@mui/icons-material/SavedSearch';
import { Link } from 'react-router-dom';
import { isMobile } from 'react-device-detect';
import { AccessibleTooltip } from 'src/v2/components/tooltip';
import { ImportGuildExcel } from 'src/v2/features/guild/read-guild-from-excel';
import { IGuildMember } from 'src/models/interfaces';
import { useValidateGuildMembers } from 'src/v2/features/guild/guild.endpoint';
import { Loader } from 'src/v2/components/loader';
import Typography from '@mui/material/Typography';
import { ImportUserLink } from 'src/v2/features/guild/read-user-from-link';

export const Guild: React.FC = () => {
    const guildMembersLimit = 30;

    const { guild } = useContext(StoreContext);
    const dispatch = useContext(DispatchContext);

    const { data, loading } = useValidateGuildMembers({ members: guild.members });

    const [editMode, setEditMode] = React.useState(false);
    const [editedMembers, setEditedMembers] = React.useState(guild.members);

    const updateUsername = (value: string, index: number) => {
        const user = editedMembers.find(x => x.index === index);
        if (user) {
            user.username = value;
            setEditedMembers([...editedMembers]);
        } else {
            setEditedMembers([...editedMembers, { username: value, shareToken: '', index }]);
        }
    };

    const updateShareToken = (value: string, index: number) => {
        const user = editedMembers.find(x => x.index === index);
        if (user) {
            user.shareToken = value;
            setEditedMembers([...editedMembers]);
        } else {
            setEditedMembers([...editedMembers, { username: '', shareToken: value, index }]);
        }
    };

    const saveGuildMembers = (members: IGuildMember[]) => {
        dispatch.guild({ type: 'SaveGuildMembers', members });
    };

    const importViaLink = (member: IGuildMember) => {
        if (editedMembers.length >= 30) {
            return;
        }
        const user = editedMembers.find(x => x.username === member.username);
        if (user) {
            user.shareToken = member.shareToken;
            setEditedMembers([...editedMembers]);
            saveGuildMembers([...editedMembers]);
        } else {
            setEditedMembers([...editedMembers, { ...member, index: editedMembers.length }]);
            saveGuildMembers([...editedMembers, { ...member, index: editedMembers.length }]);
        }
    };

    return (
        <FlexBox style={{ flexDirection: 'column' }} gap={10}>
            {loading && <Loader loading={true} />}
            <FlexBox justifyContent={'center'} gap={10} style={{ marginTop: 10 }}>
                <ImportGuildExcel onImport={saveGuildMembers} />
                <ImportUserLink onImport={importViaLink} />
                <Tooltip
                    title={'Populate Usernames and share tokens from the planner app'}
                    open={editMode}
                    placement={'top'}>
                    <Button
                        variant={'contained'}
                        onClick={() => {
                            if (editMode) {
                                saveGuildMembers(editedMembers);
                            }
                            setEditMode(value => !value);
                        }}
                        color={editMode ? 'success' : 'primary'}>
                        {editMode ? 'Save changes' : 'Edit guild'}
                    </Button>
                </Tooltip>
                <AccessibleTooltip title={'Go to Guild Insights'}>
                    <IconButton component={Link} to={isMobile ? '/mobile/learn/guildInsights' : '/learn/guildInsights'}>
                        <SavedSearchIcon />
                    </IconButton>
                </AccessibleTooltip>
            </FlexBox>
            {!!data && !data.isValid && (
                <div className="flex-box column">
                    <Typography color="error">Some users data is not valid:</Typography>
                    <ul>
                        {data.invalidUsers.map(x => (
                            <li key={x.username}>
                                <b>{x.username}</b> - {x.reason}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <Conditional condition={!editMode}>
                <FlexBox gap={10} wrap justifyContent={'center'}>
                    {...Array.from({ length: guildMembersLimit }, (_, i) => {
                        const guildMember = guild.members.find(x => x.index === i) ?? {
                            username: '',
                            shareToken: '',
                            index: i,
                        };
                        return <GuildMemberView key={i} index={i} member={guildMember} />;
                    })}
                </FlexBox>
            </Conditional>
            <Conditional condition={editMode}>
                <FlexBox gap={10} wrap justifyContent={'center'}>
                    {...Array.from({ length: guildMembersLimit }, (_, i) => {
                        const guildMember = editedMembers.find(x => x.index === i) ?? {
                            username: '',
                            shareToken: '',
                            index: i,
                        };
                        return (
                            <GuildMemberInput
                                key={i}
                                index={i}
                                member={guildMember}
                                onUsernameChange={value => updateUsername(value, i)}
                                onShareTokenChange={value => updateShareToken(value, i)}
                            />
                        );
                    })}
                </FlexBox>
            </Conditional>
        </FlexBox>
    );
};
