import { Router as createRouter } from 'express';
import { SQL } from 'sql-template-strings';
import { sendQuery } from 'src/common';

const router = createRouter();

/* GET home page. */
router.get('/', async (req, res) => {
  // No user logged in render default stats
  if (!req.user) {
    return res.render('index', { user: undefined, period: 'hour' });
  }
  
  // Render user's own stats
  const { rows: [ profile ] } = await sendQuery(SQL`SELECT * FROM federated_credentials WHERE user_id = ${req.user?.id}`);
  res.render('index', { user: req.user, profile, period: `${req.query.period ?? 'hour'}` });
});

export default router;

