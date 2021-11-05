import { DATABASE } from '../env';
import { log, sendQuery } from '../common';

export default async () => {
  // Install UUID module
  log.debug('[DB] Installing UUID module');
  await sendQuery(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

  // Install dblink module
  log.debug('[DB] Installing UUID module');
  await sendQuery('CREATE EXTENSION IF NOT EXISTS dblink;');

  // Create database if it doesn't exist
  log.debug('[DB] Installing UUID module');
  await sendQuery(`
    DO $$
    BEGIN
    PERFORM dblink_exec('', 'CREATE DATABASE ${DATABASE}');
    EXCEPTION WHEN duplicate_database THEN RAISE NOTICE '%, skipping', SQLERRM USING ERRCODE = SQLSTATE;
    END
    $$;
  `);

  // Create users table
  log.debug('[DB] Creating users table');
  await sendQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT uuid_generate_v4(),
      username VARCHAR,
      salt VARCHAR
    );
  `);

  // Create federation credentials table
  log.debug('[DB] Creating federated_credentials table');
  await sendQuery(`
    CREATE TABLE IF NOT EXISTS federated_credentials (
      id UUID DEFAULT uuid_generate_v4(),
      username VARCHAR,
      user_id UUID,
      provider VARCHAR,
      provider_id VARCHAR,
      PRIMARY KEY (provider, provider_id)
    );
  `);

  // Create session table
  log.debug('[DB] Creating session table');
  await sendQuery(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL,
      CONSTRAINT session_pkey PRIMARY KEY (sid)
    )
    WITH (OIDS=FALSE);
  `);

  // Add index to session table
  log.debug('[DB] Adding index to session table');
  await sendQuery(`
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `);

  // Create counters table
  log.debug('[DB] Creating counters table');
  await sendQuery(`
    CREATE TABLE IF NOT EXISTS counters (
      id UUID DEFAULT uuid_generate_v4(),
      namespace VARCHAR NOT NULL,
      period VARCHAR NOT NULL,
      part VARCHAR NOT NULL,
      value INT NOT NULL,
      created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
      updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
      PRIMARY KEY (namespace, period, part)
    );
  `);

  await sendQuery(`
    CREATE OR REPLACE FUNCTION trigger_set_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW() AT TIME ZONE 'utc';
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  await sendQuery(`
    DO $$ BEGIN
      CREATE TRIGGER set_timestamp
      BEFORE UPDATE ON counters
      FOR EACH ROW EXECUTE
      PROCEDURE trigger_set_timestamp();
    EXCEPTION
      WHEN others THEN null;
    END $$;
  `);
};
