import { ConfigService } from './config/config.service';
import ccxt, { Balance, Balances, binance } from 'ccxt';
import axios, { AxiosInstance, AxiosStatic } from 'axios';
import RateLimit, { RateLimitedAxiosInstance } from 'axios-rate-limit'
import * as ntpClient from 'ntp-client'
import { LoggerService } from './log/logger.service';
import { IConfigService } from './config/config.interface';
import 'reflect-metadata';

	export class TradeBot {
		binanceClient: binance;
		config: {
			asset: string,
			base: string,
			allocation: number,
			spread: number,
			tickInterval: number
		}
		constructor(
			private readonly configService: IConfigService,
			private readonly loggerService: LoggerService
		) {}

		async run(): Promise<void> {
			// Получаем время с NTP-сервера
			// Ваш существующий код
			this.config = {
				asset: 'BTC',
				base: 'USDT',
				allocation: 0.1,
				spread: 0.2,
				tickInterval: 2000,
			};

			 // Создание экземпляра RateLimit с ограничением в 2 запроса в секунду
			 const axiosWithRateLimit = RateLimit(axios.create(), { maxRequests: 2, perMilliseconds: 1000 });
		
			this.binanceClient = new ccxt.binance({
				apiKey: this.configService.get('BINANCE_API_KEY'),
				secret: this.configService.get('BINANCE_API_SECRET'),
			});
			
		
			this.loggerService.log('Трейд-бот запущен');
			this.tick(this.config, this.binanceClient, axiosWithRateLimit);
			setInterval(() => this.tick(this.config, this.binanceClient, axiosWithRateLimit), this.config.tickInterval);
		}
		

		async tick(
			config: {
			asset: string,
			base: string,
			allocation: number,
			spread: number,
			tickInterval: number
			},
			binanceClient: binance,
			AxiosInstance: RateLimitedAxiosInstance
		): Promise<void> {
			const { asset, base, spread, allocation } = config;
			const market = `${asset}/${base}`;

			const orders = await binanceClient.fetchOpenOrders(market);
			orders.forEach(async order => {
				await binanceClient.cancelOrder(order.id);
			});

			const results = await Promise.all([
				AxiosInstance.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd'),
				AxiosInstance.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=usd')
			]);

			const marketPrice = results[0].data.bitcoin.usd / results[1].data.tether.usd;

			const sellPrice = marketPrice * (1 + spread);
			const buyPrice = marketPrice * (1 - spread);
			const balances: any = await binanceClient.fetchBalance();
			const assetBalance = balances.free[asset];
			const baseBalance = balances.free[base];
			const sellVolume = assetBalance * allocation;
			const buyVolume = (baseBalance * allocation) / marketPrice;

			try {
				await binanceClient.createLimitSellOrder(market, sellVolume, sellPrice);
				await binanceClient.createLimitBuyOrder(market, buyVolume, buyPrice);
			} catch (error) {
				if (error instanceof ccxt.InvalidOrder) {
					console.error('Ошибка создания ордера:', error.message);
					// Здесь вы можете предпринять дополнительные действия для коррекции ошибки
				} else {
					console.error('Произошла ошибка:', error);
				}
			}
			

			console.log(`
				New tick for ${market}...
				Created limit sell order for ${sellVolume}@${sellPrice}
				Created limit buy order for ${buyVolume}@${buyPrice}
			`)
		}
	}

	const tradeBot = new TradeBot(new ConfigService(), new LoggerService());

	tradeBot.run();

