import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { NecordExecutionContext } from '../../context';

export const ComponentParam = createParamDecorator((data, ctx: ExecutionContext) => {
	const necordContext = NecordExecutionContext.create(ctx);
	const [interaction] = necordContext.getContext<'interactionCreate'>();
	const discovery = necordContext.getDiscovery();

	if (!discovery.isMessageComponent() || !interaction.isMessageComponent()) return null;

	const match = discovery.matcher([interaction.componentType, interaction.customId].join('_'));

	if (!match) return null;

	return data ? match.params[data] : match.params;
});
