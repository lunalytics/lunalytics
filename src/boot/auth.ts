import passport from 'passport';
import { Strategy } from 'passport-twitter';
import { SQL } from 'sql-template-strings';
import { sendQuery } from 'src/common';
import { TWITTER_CONSUMER_KEY, TWITTER_CONSUMER_SECRET } from 'src/env';

export default async () => {
  // Configure the Twitter strategy for use by Passport.
  //
  // OAuth 1.0-based strategies require a `verify` function which receives the
  // credentials (`token` and `tokenSecret`) for accessing the Twitter API on the
  // user's behalf, along with the user's profile.  The function must invoke `cb`
  // with a user object, which will be set at `req.federatedUser` in route handlers after
  // authentication.
  passport.use(new Strategy({
    consumerKey: TWITTER_CONSUMER_KEY,
    consumerSecret: TWITTER_CONSUMER_SECRET,
    callbackURL: '/oauth/callback/twitter.com'
  }, (_token, _tokenSecret, profile, cb) => {
    // In this example, the user's Twitter profile is supplied as the user
    // record. In a production-quality application, the Twitter profile should
    // be associated with a user record in the application's database, which
    // allows for account linking and authentication with other identity
    // providers.
    return cb(null, profile);
  }));
    
  // Configure Passport authenticated session persistence.
  //
  // In order to restore authentication state across HTTP requests, Passport needs
  // to serialize users into and deserialize users out of the session.  In a
  // production-quality application, this would typically be as simple as
  // supplying the user ID when serializing, and querying the user record by ID
  // from the database when deserializing.  However, due to the fact that this
  // example does not have a database, the complete Facebook profile is serialized
  // and deserialized.
  passport.serializeUser((user, cb) => {
    cb(null, user.id);
  });

  passport.deserializeUser(async (id, cb) => {
    try {
      const { rows: [ user ] } = await sendQuery<{ id: string; username: string; }>(SQL`SELECT id, username FROM users WHERE id = ${id}`);
      cb(null, user);
    } catch (error) {
      cb(error);
    }
  });
};
