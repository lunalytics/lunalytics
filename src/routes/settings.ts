import { Router as createRouter } from 'express';
import { ensureLoggedIn } from 'connect-ensure-login';

const router = createRouter();

/* GET settings page. */
// This route shows settings information of the logged in user.  The route is
// guarded by middleware that ensures a user is logged in.  If not, the web
// browser will be redirected to `/login`.
router.get('/', ensureLoggedIn(), (req, res) => {
  res.render('settings', { user: req.user });
});

export default router;
