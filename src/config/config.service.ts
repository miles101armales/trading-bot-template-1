import { config,  DotenvParseOutput } from 'dotenv';
import { IConfigService } from './config.interface';
import 'reflect-metadata';

export class ConfigService implements IConfigService {
	private config: DotenvParseOutput;
	constructor() {
		const { error, parsed } = config();
		if (error) {
			throw new Error('Не найден файл .env');
		}
		if (!parsed) {
			throw new Error('Пустой файл .env');
		}
		this.config = parsed;
	}
	get(key: string): string {
		try {
			return this.config[key];
		} catch (error) {
			throw new Error('Нет такого ключа');
		}
	}
}