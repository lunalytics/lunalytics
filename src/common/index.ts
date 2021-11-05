import dedent from 'dedent';
import { green } from 'picocolors';
import { Response } from "express";
import { SQLStatement } from "sql-template-strings";
import { pool } from "../db";

const isDebug = process.env.DEBUG;

export const log = {
    ...console,
    debug(...args: Parameters<typeof console.debug>) {
        if (isDebug) console.debug(...args);
    }
}

export const sendQuery = async <T>(query: SQLStatement | string, params?: any[], res?: Response) => {
    const client = await pool.connect();
    res?.startTime('db', 'Database query');
    log.debug(`${green('[DB:QUERY]')} %s\n${green('[DB:VALUES]')} %s`, dedent(typeof query === 'string' ? query : query.query), params);
    const result = params === undefined ? await client.query<T>(query) : await client.query<T>(query, params);
    res?.endTime('db');
    client.release();
    return result;
};