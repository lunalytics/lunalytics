import { Router as createRouter } from 'express';
import passport from 'passport';
import { SQL } from 'sql-template-strings';
import { sendQuery } from 'src/common';

const router = createRouter();

router.get('/login', (_, res) => {
  res.render('login');
});

router.get('/login/federated/twitter.com', passport.authenticate('twitter'));
router.get('/oauth/callback/twitter.com', passport.authenticate('twitter', { assignProperty: 'federatedUser', failureRedirect: '/login' }), async (req, res, next) => {
  try {
    const sql = SQL`SELECT id, provider, provider_id, user_id, username FROM federated_credentials WHERE provider = ${'https://twitter.com'} AND provider_id = ${req.federatedUser.id}`;
    const { rows: [ federatedUser ] } = await sendQuery<{ id: string; provider: string; provider_id: string; user_id: string; username: string; }>(sql);

    // If they've logged in before with this twitter account then find their user and authenticate them
    if (federatedUser) {
      // Update the username of the twitter account
      if (federatedUser.username !== req.federatedUser.username) {
        const sql = SQL`UPDATE federated_credentials SET username = ${req.federatedUser.username} WHERE id = ${federatedUser.id}`;
        await sendQuery(sql);
      }

      // Get the user account associated with this twitter account
      const { rows: [ user ] } = await sendQuery<{ id: string, username: string }>(SQL`SELECT id, username FROM users WHERE id = ${federatedUser.user_id}`);
      // @todo: Handle undefined row.
      req.login(user, error => {
        if (error) return next(error);
        res.redirect('/');
      });
      return;
    }

    // Insert new user
    const { rows: [ user ] } = await sendQuery<{ id: string; username: string; }>(SQL`INSERT INTO users (username) VALUES (${req.federatedUser.username}) RETURNING id, username`);

    // Insert federated credentials
    await sendQuery(SQL`INSERT INTO federated_credentials (provider, provider_id, user_id, username) VALUES (${'https://twitter.com'}, ${req.federatedUser.id}, ${user.id}, ${req.federatedUser.username})`);

    req.login(user, (error) => {
      if (error) return next(error);
      res.redirect('/');
    });
  } catch (error) {
    next(error);
  }
});

router.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

export default router;
