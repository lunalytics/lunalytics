import { CronJob } from 'cron';
import HelloTwitter from 'hello-twitter';
import SQL from 'sql-template-strings';
import { TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET } from 'src/env';
import { pool } from '../db';

const twitter = new HelloTwitter({
    apiKey: TWITTER_CONSUMER_KEY,
    apiSecret: TWITTER_CONSUMER_SECRET
});

/** Every hour in crontab format */
const everyHour = '*/60 * * * *';

// One hour in ms
const ONE_HOUR = 3_600 * 1_000;

const getUsers = async () => {
    const client = await pool.connect();
    const sql = SQL`SELECT * FROM federated_credentials WHERE provider = ${'https://twitter.com'}`;
    const { rows: users } = await client.query<{ provider_id: string; username: string; }>(sql);
    return users;
};

export const statCollection = new CronJob(everyHour, () => {
    try {
        // Get last 3200 tweets for each user
        // const users = await Promise.all((await getUsers()).map(async user => {
        //     console.log(user);
        //     // Fetch last 3200 tweets for this user
        //     const tweets = await twitter.fetchTimeline({ username: user.username, resultSize: 3200 });
        //     const usersTweets = tweets.filter(tweet => !tweet.isRetweet && !tweet.isReply);
        //     return {
        //         ...user,
        //         tweets: usersTweets.map(tweet => ({ likes: tweet.likes, retweets: tweet.retweets })),
        //         totalEngagement: usersTweets.map(tweet => tweet.likes + tweet.retweets).reduce((a, b) => a + b, 0)
        //     };
        // }));

        // console.log(JSON.stringify(users, null, 2));
    } catch (error) {
        console.log('Failed stats collection with "%s"', error.message);
    }
});