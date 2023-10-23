import { AuditLogEvent, Client, GuildAuditLogsEntry, GuildChannel, Role } from 'discord.js';
import { Injectable } from '@nestjs/common';

import { ContextOf } from '../context';
import { NecordEvents } from './listener.interface';

// Oh... fuck, it looks really shitty
@Injectable()
export class ListenersService {
	public constructor(private readonly client: Client) {}

	private onApplicationBootstrap() {
		this.on('channelUpdate', this.onChannelUpdate);
		this.on('guildMemberUpdate', this.onGuildMemberUpdate);
		this.on('guildUpdate', this.onGuildUpdate);
		this.on('messageUpdate', this.onMessageUpdate);
		this.on('presenceUpdate', this.onPresenceUpdate);
		this.on('roleUpdate', this.onRoleUpdate);
		this.on('threadUpdate', this.onThreadUpdate);
		this.on('userUpdate', this.onUserUpdate);
		this.on('voiceStateUpdate', this.onVoiceStateUpdate);
		this.on('guildAuditLogEntryCreate', this.onGuildAuditLogEntryCreate);
	}

	private on<K extends keyof NecordEvents>(event: K, fn: (args: NecordEvents[K]) => void) {
		this.client.on<any>(event, (...args) => fn.call(this, args));
	}

	private emit<K extends keyof NecordEvents>(event: K, ...args: NecordEvents[K]) {
		this.client.emit<any>(event, ...args);
	}

	private onChannelUpdate([oldChannel, newChannel]: ContextOf<'channelUpdate'>) {
		if (!Object.prototype.hasOwnProperty.call(oldChannel, 'guild')) return;

		if (
			(oldChannel as GuildChannel).permissionOverwrites !==
			(newChannel as GuildChannel).permissionOverwrites
		) {
			this.emit(
				'guildChannelPermissionsUpdate',
				newChannel,
				(oldChannel as GuildChannel).permissionOverwrites,
				(newChannel as GuildChannel).permissionOverwrites
			);
		}
	}

	private onGuildMemberUpdate([oldMember, newMember]: ContextOf<'guildMemberUpdate'>) {
		if (oldMember.partial) return;

		if (!oldMember.premiumSince && newMember.premiumSince) {
			this.emit('guildMemberBoost', newMember);
		}

		if (oldMember.premiumSince && !newMember.premiumSince) {
			this.emit('guildMemberUnboost', newMember);
		}

		const addedRoles: Role[] = newMember.roles.cache.reduce(
			(acc, role) => (!oldMember.roles.cache.has(role.id) ? acc.push(role) && acc : acc),
			[]
		);

		addedRoles.forEach(role => {
			this.emit('guildMemberRoleAdd', newMember, role);
		});

		const removedRoles: Role[] = oldMember.roles.cache.reduce(
			(acc, role) => (!newMember.roles.cache.has(role.id) ? acc.push(role) && acc : acc),
			[]
		);

		removedRoles.forEach(role => {
			this.emit('guildMemberRoleRemove', newMember, role);
		});

		if (oldMember.nickname !== newMember.nickname) {
			this.emit(
				'guildMemberNicknameUpdate',
				newMember,
				oldMember.nickname,
				newMember.nickname
			);
		}

		if (oldMember.pending !== newMember.pending) {
			this.emit('guildMemberEntered', newMember);
		}

		if (!oldMember.avatar && newMember.avatar) {
			this.emit('guildMemberAvatarAdd', newMember, newMember.avatarURL());
		}

		if (oldMember.avatar !== newMember.avatar) {
			this.emit(
				'guildMemberAvatarUpdate',
				newMember,
				oldMember.avatarURL(),
				newMember.avatarURL()
			);
		}

		if (oldMember.avatar && !newMember.avatar) {
			this.emit('guildMemberAvatarRemove', newMember, oldMember.avatarURL());
		}
	}

	private onGuildUpdate([oldGuild, newGuild]: ContextOf<'guildUpdate'>) {
		if (oldGuild.premiumTier < newGuild.premiumTier) {
			this.emit('guildBoostLevelUp', newGuild, oldGuild.premiumTier, newGuild.premiumTier);
		}

		if (oldGuild.premiumTier > newGuild.premiumTier) {
			this.emit('guildBoostLevelDown', oldGuild, newGuild);
		}

		if (!oldGuild.banner && newGuild.banner) {
			this.emit('guildBannerAdd', newGuild, newGuild.bannerURL());
		}

		if (!oldGuild.afkChannel && newGuild.afkChannel) {
			this.emit('guildAfkChannelAdd', newGuild, newGuild.afkChannel);
		}

		if (!oldGuild.vanityURLCode && newGuild.vanityURLCode) {
			this.emit('guildVanityURLAdd', newGuild, newGuild.vanityURLCode);
		}

		if (oldGuild.vanityURLCode !== newGuild.vanityURLCode) {
			this.emit(
				'guildVanityURLUpdate',
				newGuild,
				oldGuild.vanityURLCode,
				newGuild.vanityURLCode
			);
		}

		if (oldGuild.vanityURLCode && !newGuild.vanityURLCode) {
			this.emit('guildVanityURLRemove', newGuild, oldGuild.vanityURLCode);
		}

		if (oldGuild.features.length !== newGuild.features.length) {
			this.emit('guildFeaturesUpdate', newGuild, oldGuild.features, newGuild.features);
		}

		if (oldGuild.nameAcronym !== newGuild.nameAcronym) {
			this.emit('guildAcronymUpdate', oldGuild, newGuild);
		}

		if (oldGuild.ownerId !== newGuild.ownerId) {
			this.emit('guildOwnerUpdate', oldGuild, newGuild);
		}

		if (!oldGuild.partnered && newGuild.partnered) {
			this.emit('guildPartnerAdd', newGuild);
		}

		if (oldGuild.partnered && !newGuild.partnered) {
			this.emit('guildPartnerRemove', newGuild);
		}

		if (!oldGuild.verified && newGuild.verified) {
			this.emit('guildVerificationAdd', newGuild);
		}

		if (oldGuild.verified && !newGuild.verified) {
			this.emit('guildVerificationRemove', newGuild);
		}
	}

	private onMessageUpdate([oldMessage, newMessage]: ContextOf<'messageUpdate'>) {
		if (oldMessage.partial || newMessage.partial) return;
		if (!oldMessage.pinned && newMessage.pinned) {
			this.emit('messagePinned', newMessage);
		}

		if (oldMessage.content !== newMessage.content) {
			this.emit('messageContentEdited', newMessage, oldMessage.content, newMessage.content);
		}
	}

	private onPresenceUpdate([oldPresence, newPresence]: ContextOf<'presenceUpdate'>) {
		if (!oldPresence) return;

		if (oldPresence.status !== 'offline' && newPresence.status === 'offline') {
			this.emit('guildMemberOffline', newPresence.member, oldPresence.status);
		}

		if (oldPresence.status === 'offline' && newPresence.status !== 'offline') {
			this.emit('guildMemberOnline', newPresence.member, newPresence.status);
		}
	}

	private onRoleUpdate([oldRole, newRole]: ContextOf<'roleUpdate'>) {
		if (oldRole.rawPosition !== newRole.rawPosition) {
			this.emit('rolePositionUpdate', newRole, oldRole.rawPosition, newRole.rawPosition);
		}

		if (oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
			this.emit('rolePermissionsUpdate', newRole, oldRole.permissions, newRole.permissions);
		}

		if (!oldRole.icon && newRole.icon) {
			this.emit('roleIconAdd', newRole, newRole.iconURL());
		}

		if (oldRole.icon !== newRole.icon) {
			this.emit('roleIconUpdate', newRole, oldRole.iconURL(), newRole.iconURL());
		}

		if (oldRole.icon && !newRole.icon) {
			this.emit('roleIconRemove', newRole, oldRole.iconURL());
		}
	}

	private onThreadUpdate([oldThread, newThread]: ContextOf<'threadUpdate'>) {
		if (!Object.prototype.hasOwnProperty.call(oldThread, 'guild')) return;

		if (oldThread.archived !== newThread.archived) {
			this.emit('threadStateUpdate', oldThread, newThread);
		}

		if (oldThread.name !== newThread.name) {
			this.emit('threadNameUpdate', newThread, oldThread.name, newThread.name);
		}

		if (oldThread.locked !== newThread.locked) {
			this.emit('threadLockStateUpdate', oldThread, newThread);
		}

		if (oldThread.rateLimitPerUser !== newThread.rateLimitPerUser) {
			this.emit(
				'threadRateLimitPerUserUpdate',
				newThread,
				oldThread.rateLimitPerUser,
				newThread.rateLimitPerUser
			);
		}

		if (oldThread.autoArchiveDuration !== newThread.autoArchiveDuration) {
			this.emit(
				'threadAutoArchiveDurationUpdate',
				newThread,
				oldThread.autoArchiveDuration,
				newThread.autoArchiveDuration
			);
		}
	}

	private onUserUpdate([oldUser, newUser]: ContextOf<'userUpdate'>) {
		if (oldUser.partial) return;

		if (oldUser.displayAvatarURL() !== newUser.displayAvatarURL()) {
			this.emit(
				'userAvatarUpdate',
				newUser,
				oldUser.displayAvatarURL(),
				newUser.displayAvatarURL()
			);
		}

		if (oldUser.username !== newUser.username) {
			this.emit('userUsernameUpdate', newUser, oldUser.username, newUser.username);
		}

		if (oldUser.discriminator !== newUser.discriminator) {
			this.emit(
				'userDiscriminatorUpdate',
				newUser,
				oldUser.discriminator,
				newUser.discriminator
			);
		}

		if (oldUser.flags !== newUser.flags) {
			this.emit('userFlagsUpdate', newUser, oldUser.flags, newUser.flags);
		}
	}

	private onVoiceStateUpdate([oldState, newState]: ContextOf<'voiceStateUpdate'>) {
		const newMember = newState.member;

		if (!oldState.channel && newState.channel) {
			this.emit('voiceChannelJoin', newMember, newState.channel);
		}

		if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
			this.emit('voiceChannelSwitch', newMember, oldState.channel, newState.channel);
		}

		if (oldState.channel && !newState.channel) {
			this.emit('voiceChannelLeave', newMember, oldState.channel);
		}

		if (!oldState.mute && newState.mute) {
			this.emit(
				'voiceChannelMute',
				newMember,
				newState.selfMute ? 'self-muted' : 'server-muted'
			);
		}

		if (oldState.mute && !newState.mute) {
			this.emit(
				'voiceChannelUnmute',
				newMember,
				oldState.selfMute ? 'self-muted' : 'server-muted'
			);
		}

		if (!oldState.deaf && newState.deaf) {
			this.emit(
				'voiceChannelDeaf',
				newMember,
				newState.selfDeaf ? 'self-deafed' : 'server-deafed'
			);
		}

		if (oldState.deaf && !newState.deaf) {
			this.emit(
				'voiceChannelUndeaf',
				newMember,
				oldState.selfDeaf ? 'self-deafed' : 'server-deafed'
			);
		}

		if (!oldState.streaming && newState.streaming) {
			this.emit('voiceStreamingStart', newMember, newState.channel);
		}

		if (oldState.streaming && !newState.streaming) {
			this.emit('voiceStreamingStop', newMember, newState.channel);
		}
	}

	private onGuildAuditLogEntryCreate([
		auditLogEntry,
		guild
	]: ContextOf<'guildAuditLogEntryCreate'>) {
		const { actionType, targetType } = auditLogEntry;

		switch (actionType) {
			case 'Create': {
				this.emit('guildAuditLogEntryAdd', auditLogEntry, guild);

				if (targetType === 'Webhook') {
					this.emit(
						'guildAuditLogEntryWebhookCreate',
						auditLogEntry as GuildAuditLogsEntry<AuditLogEvent.WebhookCreate>,
						guild
					);
				}

				break;
			}

			case 'Update': {
				this.emit('guildAuditLogEntryUpdate', auditLogEntry, guild);

				if (targetType === 'Webhook') {
					this.emit(
						'guildAuditLogEntryWebhookUpdate',
						auditLogEntry as GuildAuditLogsEntry<AuditLogEvent.WebhookUpdate>,
						guild
					);
				}

				break;
			}

			case 'Delete': {
				this.emit('guildAuditLogEntryDelete', auditLogEntry, guild);

				if (targetType === 'Webhook') {
					this.emit(
						'guildAuditLogEntryWebhookDelete',
						auditLogEntry as GuildAuditLogsEntry<AuditLogEvent.WebhookDelete>,
						guild
					);
				}

				break;
			}

			default:
				break;
		}
	}
}
