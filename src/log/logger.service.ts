import { ILogObj, Logger } from 'tslog';
import { ILogger } from './logger.interface';

export class LoggerService implements ILogger {
	public logger: Logger<ILogObj>;

	constructor() {
		this.logger = new Logger<any>({
			type: 'pretty',
			hideLogPositionForProduction: true,
		});
	}

	log(...args: unknown[]): void {
		this.logger.info(...args);
	}

	error(...args: unknown[]): void {
		// отправка в sentry / rollbar
		this.logger.error(...args);
	}

	warn(...args: unknown[]): void {
		this.logger.warn(...args);
	}
}
