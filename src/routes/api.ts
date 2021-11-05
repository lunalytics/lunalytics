import { Router as createRouter } from 'express';
import { createHash } from 'crypto';
import { SQL } from 'sql-template-strings';
import { sendQuery } from '../common/index';
import { cache as counters } from '../common/counters';

// increase internal counter
const increaseCount = async (namespace: string) => {
    if (!counters[namespace]) counters[namespace] = 0;
    counters[namespace]++;
};

const router = createRouter();

/* GET counters API. */
// This route returns all counters for the namespace. This route is open for all.
router.get('/counters/:namespace', async (req, res) => {
    // Ensure they pass a namespace
    const namespace = req.params.namespace;
    if (!namespace || typeof namespace !== 'string') {
        res.sendStatus(500);
        return;
    }

    const { rows: counters } = await sendQuery(`SELECT * FROM counters WHERE namespace LIKE $1 AND period LIKE $2 AND part LIKE $3`, [`${namespace}%`, req.query.period ?? '%', req.query.part ?? '%'], res);

    // Send counters
    res.send(counters);
});

router.get('/counters/:namespace/basic/stats', async (req, res) => {
    // Ensure they pass a namespace
    const namespace = req.params.namespace;
    if (!namespace || typeof namespace !== 'string') {
        res.sendStatus(500);
        return;
    }
    const period = `${req.query.period ?? 'hour'}`;

    // Get the views per hour for the last 24 hours
    const hourlyQuery = SQL`
        SELECT a.part,
        CASE
            WHEN b.views IS NULL THEN 0
            ELSE b.views
        end AS views
        FROM (SELECT extract(hour from Generate_series(Now() - INTERVAL '23' hour, Now(), '1 hour')) AS part) AS a
        LEFT JOIN (SELECT extract(hour from max(created_at)) as part, SUM(value) as views FROM counters WHERE namespace = ${namespace} AND period = 'hour' GROUP BY part) AS b
        ON a.part = b.part
    `;
    // Get the views per day for the last 30 days
    const dailyQuery = SQL`
        SELECT a.part,
        CASE
            WHEN b.views IS NULL THEN 0
            ELSE b.views
        end AS views
        FROM (SELECT extract(day from Generate_series(Now() - INTERVAL '29' day, Now(), '1 day')) AS part) AS a
        LEFT JOIN (SELECT extract(day from max(created_at)) as part, SUM(value) as views FROM counters WHERE namespace = ${namespace} AND period = 'day' GROUP BY part) AS b
        ON a.part = b.part
    `;
    const tilesQuery = SQL`
        SELECT
            Coalesce(SUM(is_user), 0)   AS total,
            Coalesce(SUM(in_30days), 0) AS month,
            Coalesce(SUM(in_14days), 0) AS fortnight,
            Coalesce(SUM(in_7days), 0)  AS week,
            Coalesce(SUM(in_day), 0)    AS day,
            Coalesce(SUM(in_hour), 0)   AS hour
        FROM (SELECT value AS is_user,
            CASE
            WHEN created_at > ( Now() - interval '30' day ) THEN value
            ELSE 0
            END AS in_30days,
            CASE
            WHEN created_at > ( Now() - interval '14' day ) THEN value
            ELSE 0
            END AS in_14days,
            CASE
            WHEN created_at > ( Now() - interval '7' day ) THEN value
            ELSE 0
            END AS in_7days,
            CASE
            WHEN created_at > ( Now() - interval '1' day ) THEN value
            ELSE 0
            END AS in_day,
            CASE
            WHEN created_at > ( Now() - interval '1' hour ) THEN value
            ELSE 0
            END AS in_hour
        FROM counters
        WHERE namespace = ${namespace}) AS a
    `;
    type Tiles = {
        total: string;
        month: string;
        fortnight: string;
        week: string;
        day: string;
        hour: string;
    };
    const { rows: stats } = await sendQuery<{ part: string; views: string; }>({ hour: hourlyQuery, day: dailyQuery }[period] ?? hourlyQuery, undefined, res);
    const { rows: [ tiles ] } = await sendQuery<Tiles>(tilesQuery);
    return res.json({
        graph: stats.map(row => ({
            x: parseInt(row.part, 10),
            y: parseInt(row.views, 10)
        })),
        tiles: Object.fromEntries(Object.entries(tiles).map(([key, row]) => [key, parseInt(row, 10)]))
    });
});

// This route returns basic counters for the namespace. This route is open for all.
router.get('/counters/:namespace/basic', async (req, res) => {
    // Ensure they pass a namespace
    const namespace = req.params.namespace;
    if (!namespace || typeof namespace !== 'string') {
        res.sendStatus(500);
        return;
    }

    // Increase their basic counter by 1
    await increaseCount(namespace);

    // All is good :)
    res.sendStatus(200);
});

// This route returns unique counters for the namespace. This route is open for all.
router.get('/counters/:namespace/unique', async (req, res) => {
    // Ensure they pass a namespace
    const namespace = req.params.namespace;
    if (!namespace || typeof namespace !== 'string') {
        res.sendStatus(500);
        return;
    }

    // Increase their basic counter by 1
    await increaseCount(`${namespace}-${createHash('sha256').update(req.ip).digest('base64')}`);

    // All is good :)
    res.sendStatus(200);
});

export default router;
