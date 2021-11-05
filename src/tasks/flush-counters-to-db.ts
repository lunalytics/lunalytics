import { CronJob } from 'cron';
import { log, sendQuery } from '../common';
import { cache as counters } from '../common/counters';

// every 10s in crontab format
const TEN_SECONDS = '*/10 * * * * *';

const createCounterQuery = (namespace: string, period: 'year' | 'month' | 'day' | 'hour', value = 1): [string, [string]] => {
    return [`
        INSERT INTO counters (namespace, period, part, value)
        VALUES ($1, '${period}', extract('${period}' from NOW()), 1)
        ON CONFLICT (namespace, period, part) DO UPDATE
        SET value = counters.value + ${value}
    `, [namespace]];
};

const increaseCountInDb = (namespace: string, value: number) => {
    return Promise.all([
        sendQuery(...createCounterQuery(namespace, 'year', value)),
        sendQuery(...createCounterQuery(namespace, 'month', value)),
        sendQuery(...createCounterQuery(namespace, 'day', value)),
        sendQuery(...createCounterQuery(namespace, 'hour', value))
    ]);
};

export const flushCountersToDb = new CronJob(TEN_SECONDS, async () => {
    // every 10s flush counters to DB and then reset to 0
    log.debug('[STATS] Flushing caches to database, please wait...');

    // For every in memory counter add it's value to the existing record in the DB
    for await (const [namespace, value] of Object.entries(counters)) {
        // Skip counters at 0
        if (value === 0) continue;
        // Update DB
        await increaseCountInDb(namespace, value);
        // Reset in memory counter
        counters[namespace] = 0;
    }

    log.debug('[STATS] Done');
});
