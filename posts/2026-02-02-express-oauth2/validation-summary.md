# Validation Summary: How to Implement OAuth2 in Express

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- Express
- Passport.js
- passport-google-oauth20 (Google OAuth 2.0 strategy)
- passport-github2 (GitHub OAuth 2.0 strategy)
- express-session
- dotenv
- OAuth 2.0 protocol

## Sources Consulted
- Passport.js documentation (https://www.passportjs.org/docs/)
- passport-google-oauth20 README (https://github.com/jaredhanson/passport-google-oauth2)
- passport-github2 README (https://github.com/cfsghost/passport-github2)
- express-session README (https://github.com/expressjs/session)
- Google Identity / OAuth 2.0 docs (https://developers.google.com/identity/protocols/oauth2)
- Google+ API shutdown announcement (https://developers.google.com/+/api-shutdown)
- GitHub OAuth Apps docs (https://docs.github.com/en/apps/oauth-apps/building-oauth-apps)
- Twitter / X API v2 OAuth 2.0 scopes docs (https://docs.x.com/resources/fundamentals/authentication/oauth-2-0/authorization-code)
- Passport 0.6 logout signature change notes (https://github.com/jaredhanson/passport/releases/tag/v0.6.0)

## Issues Found
1. **Outdated Google Cloud setup instructions.** The post told readers to "enable the Google+ API" when registering Google OAuth credentials. The Google+ API was shut down on March 7, 2019 and is no longer required (or available) for OAuth 2.0 sign-in. Replaced with current guidance: "configure the OAuth consent screen, and create OAuth 2.0 client credentials."
2. **Inconsistent Twitter strategy/scopes row in the provider table.** The table listed the `passport-twitter` package (which implements OAuth 1.0a and does not use OAuth 2.0 scopes) alongside Twitter API v2 OAuth 2.0 scopes (`users.read, tweet.read`). Since this is an OAuth 2.0 post, updated the package reference to `@superfaceai/passport-twitter-oauth2` (a community-maintained OAuth 2.0 strategy for the X/Twitter v2 API) and added `offline.access` to the scope list so refresh tokens are issued, matching X's documented OAuth 2.0 flow.

## Review Notes
- `req.logout((err) => { ... })` correctly uses the async callback signature introduced in Passport 0.6 — older synchronous `req.logout()` would not work on current Passport.
- `failureMessage: true` on `passport.authenticate` is valid as of Passport 0.5+.
- The session cookie config (`secure: process.env.NODE_ENV === 'production'`, `saveUninitialized: false`) is reasonable for a tutorial; production deployments behind a proxy will also need `app.set('trust proxy', 1)` to honour the `X-Forwarded-Proto` header so secure cookies are sent — out of scope here but worth noting.
- The Google strategy passes `scope` in the strategy constructor options. This is supported by `passport-google-oauth20` but the more common pattern is to set scopes in the `passport.authenticate('google', { scope: [...] })` route (which the post also does). Both are functional.
- `User.findById` / `User.findOne` / `User.findOneAndUpdate` syntax used in the examples matches Mongoose; the post never explicitly names a DB layer but the API shape is correct for Mongoose and the post tells the reader to "Replace with your database lookup," so this is acceptable.
- The GitHub fallback email `${profile.username}@github.local` is illustrative only — in a real app, request the `user:email` scope (already done) and use the GitHub API to fetch a verified email when the profile object's `emails` array is empty.
