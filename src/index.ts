import express from 'express';
import passport from 'passport';
import { join as joinPath } from 'path';
import { serializeError } from 'serialize-error';
import cookieParser from 'cookie-parser';
import createStore from 'connect-pg-simple';
import logger from 'morgan';
import serverTiming from 'server-timing';
import session from 'express-session';
import indexRouter from './routes/index';
import authRouter from './routes/auth';
import settingsRouter from './routes/settings';
import apiRouter from './routes/api';
import bootApp from './boot';
import { COOKIE_SECRET } from './env';
import { pool } from './db';
import { log } from './common';

logger.token('url', request => new URL(request.url ?? '', `http://${request.headers.host}`).pathname);

const app = express();

const Store = createStore(session);

// Initialize application
bootApp();

// Configure view engine to render EJS templates.
app.set('views', joinPath(__dirname, '../views'));
app.set('view engine', 'ejs');

app.use(serverTiming());

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(joinPath(__dirname, '../public')));
// session setup
//
// This sequence of middleware is necessary for login sessions.  The first
// middleware loads session data and makes it available at `req.session`.  The
// next lines initialize Passport and authenticate the request based on session
// data.  If session data contains a logged in user, the user is set at
// `req.user`.
app.use(session({
  store: new Store({
    pool
  }),
  secret: COOKIE_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));
app.use(passport.initialize());
app.use(passport.session());

app.use('/', indexRouter);
app.use('/', authRouter);
app.use('/settings', settingsRouter);
app.use('/api', apiRouter);

// 404
app.use((_req, res, _next) => {
  res.render('http/404');
});

// 5XX
// @ts-expect-error
app.use((error, req, res, next) => {
  if (!error) return next();
  log.error(error);
  res.status(500).json({
    status: 500,
    error: serializeError(error)
  });
});

module.exports = app;
