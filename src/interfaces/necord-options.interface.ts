import { ModuleMetadata, Type } from '@nestjs/common';
import { ClientOptions as DiscordClientOptions } from 'discord.js';

export interface NecordModuleOptions extends DiscordClientOptions {
	token: string;
	prefix?: string | Function;
}

export interface NecordOptionsFactory {
	createNecordOptions(): Promise<NecordModuleOptions> | NecordModuleOptions;
}

export interface NecordModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
	useExisting?: Type<NecordOptionsFactory>;
	useClass?: Type<NecordOptionsFactory>;
	useFactory?: (...args: any[]) => Promise<NecordModuleOptions> | NecordModuleOptions;
	inject?: any[];
}
