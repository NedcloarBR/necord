import { NecordBaseDiscovery } from '../context';
import { ModalSubmitInteraction } from 'discord.js';
import { match } from 'path-to-regexp';

export interface ModalMeta {
	customId: string;
}

export class ModalDiscovery extends NecordBaseDiscovery<ModalMeta> {
	public readonly matcher = match(this.meta.customId);

	public getCustomId() {
		return this.meta.customId;
	}

	public execute(interaction: ModalSubmitInteraction) {
		return super.execute([interaction]);
	}

	public isModal(): this is ModalDiscovery {
		return true;
	}

	public override toJSON(): Record<string, any> {
		return this.meta;
	}
}
