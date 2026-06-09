# Validation Summary: How to Handle Sessions and Cookies in Express

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Express.js
- cookie-parser
- express-session
- connect-redis (v7+)
- ioredis (including Cluster mode)
- connect-pg-simple
- pg (node-postgres)
- bcrypt
- crypto (Node.js built-in)
- helmet
- express-rate-limit (v6+)
- connect-flash
- Jest + Supertest

## Sources Consulted
- Express docs: response methods `res.cookie`, `res.clearCookie` — https://expressjs.com/en/api.html
- cookie-parser README — https://github.com/expressjs/cookie-parser
- express-session README — https://github.com/expressjs/session (options: `secret` as string or array, `resave`, `saveUninitialized`, `name`, `genid`, `rolling`, `proxy`; session methods `regenerate`, `destroy`, `save`)
- connect-redis v7+ README — https://github.com/tj/connect-redis (default export pattern `require('connect-redis').default`, `client`, `prefix`, `ttl`, `disableTouch` options)
- ioredis docs — https://github.com/redis/ioredis (constructor options, `Cluster`, `scaleReads`)
- connect-pg-simple README — https://github.com/voxpelli/node-connect-pg-simple (`pool`, `tableName`, `pruneSessionInterval`, `errorLog`, the required `session` table schema)
- node-postgres Pool docs — https://node-postgres.com/apis/pool
- bcrypt npm — https://www.npmjs.com/package/bcrypt (`hash`, `compare`, salt rounds)
- Node.js `crypto.randomUUID()` — added in v14.17.0, https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- express-rate-limit v6+ docs — https://express-rate-limit.mintlify.app/ (`windowMs`, `max`, `standardHeaders`, `legacyHeaders`)
- helmet docs — https://helmetjs.github.io/
- connect-flash README — https://github.com/jaredhanson/connect-flash
- Supertest README — https://github.com/ladjs/supertest (`request.agent` for cookie persistence)
- RFC 6265 — HTTP State Management Mechanism (cookie attributes, SameSite values)
- OWASP Session Management Cheat Sheet (session fixation, hijacking, regeneration guidance)

## Issues Found
- README.md (signed cookies example, around the `/set-signed-cookie` route): the comment said "The third argument (true) indicates this is a signed cookie." The third argument is actually the options object — `signed: true` is one of its properties, not the third positional argument. Updated the comment to "The signed: true option in the options object marks this cookie as signed" so the wording matches the actual cookie-parser API.

## Review Notes
- The `regenerate-session` example uses `{ ...req.session }` and `Object.assign(req.session, sessionData)` to preserve data across regeneration. This is a common shortcut, but the spread also copies the internal `cookie` property, which can overwrite the regenerated session's fresh cookie. The express-session docs recommend explicitly re-setting only the user data fields and then calling `req.session.save(callback)` before responding. Functional, but not the cleanest pattern.
- The "logout from all devices" implementation uses `redisClient.keys('sess:*')`. `KEYS` is O(N) and blocks Redis; production-grade code should use `SCAN`. Also, `KEYS` does not work uniformly against `Redis.Cluster` (it only queries the connected node). This example uses a single-node client so it works as written, but readers scaling up should be aware.
- ioredis Cluster option `scaleReads: 'slave'` is still accepted but the newer terminology in the ecosystem is `'replica'`; `'slave'` continues to work in current ioredis versions.
- `connect-redis` v7+ default export pattern (`require('connect-redis').default`) is correctly used; earlier versions required `connect-redis(session)` factory wrapping, which would not work here.
- Cookie `maxAge` is documented (correctly) as milliseconds for both `res.cookie` and the express-session cookie config — the library converts to seconds for the `Max-Age` header per RFC 6265.
- Express `secret` accepting an array of strings (for rotation) has been supported since express-session v1.16.0.
- The PostgreSQL `CREATE TABLE` snippet matches the schema bundled with connect-pg-simple's `table.sql`.
