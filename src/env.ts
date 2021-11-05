import { randomBytes } from 'crypto';
import { config } from 'dotenv';

config();

if (!process.env.DATABASE) console.error('Missing env DATABASE');
if (!process.env.TWITTER_CONSUMER_KEY) console.error('Missing env TWITTER_CONSUMER_KEY');
if (!process.env.TWITTER_CONSUMER_SECRET) console.error('Missing env TWITTER_CONSUMER_SECRET');
if (!process.env.DATABASE || !process.env.TWITTER_CONSUMER_KEY || !process.env.TWITTER_CONSUMER_SECRET) process.exit(1);

export const DATABASE = process.env.DATABASE!;
export const DATABASE_USERNAME = process.env.DATABASE_USERNAME ?? 'postgres';
export const DATABASE_PASSWORD = process.env.DATABASE_PASSWORD ?? '';
export const DATABASE_HOST = process.env.DATABASE_HOST ?? 'localhost';
export const DATABASE_PORT = parseInt(process.env.DATABASE_PORT ?? '5432', 10) ?? '5432';
export const TWITTER_CONSUMER_KEY = process.env.TWITTER_CONSUMER_KEY!;
export const TWITTER_CONSUMER_SECRET = process.env.TWITTER_CONSUMER_SECRET!;
export const COOKIE_SECRET = process.env.COOKIE_SECRET ?? randomBytes(64).toString('base64').replace(/\//g,'_').replace(/\+/g,'-');
