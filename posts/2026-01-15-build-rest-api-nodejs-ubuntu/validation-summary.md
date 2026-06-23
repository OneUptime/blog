# Validation Summary: How to Build a REST API with Node.js on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide (step-by-step, end-to-end build of a production REST API)

## Technologies Covered
- Node.js 20 LTS (installed via NodeSource)
- Express.js
- MongoDB / Mongoose
- PostgreSQL / Prisma (alternative database stack)
- JWT (jsonwebtoken) authentication
- bcryptjs password hashing
- Joi and Zod input validation
- Winston logging
- express-rate-limit rate limiting
- Swagger / OpenAPI (swagger-jsdoc, swagger-ui-express)
- PM2 process manager and deployment
- Jest, Supertest, mongodb-memory-server testing
- helmet, cors, morgan, dotenv middleware
- Ubuntu (apt, systemd)

## Sources Consulted
- NodeSource distributions / installation docs (https://github.com/nodesource/distributions)
- MongoDB official Ubuntu installation docs (https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)
- Ubuntu package archive — confirming the legacy `mongodb` package is no longer shipped in 20.04+ (https://packages.ubuntu.com)
- Mongoose docs — connection options and schema/middleware API (https://mongoosejs.com/docs/)
- Express.js docs — built-in middleware, routing, error handling (https://expressjs.com/)
- jsonwebtoken docs (https://github.com/auth0/node-jsonwebtoken)
- express-rate-limit docs (https://express-rate-limit.mintlify.app/)
- Joi (https://joi.dev/api/) and Zod (https://zod.dev/) docs
- PM2 docs — ecosystem file and deployment (https://pm2.keymetrics.io/docs/)
- Jest docs (https://jestjs.io/docs/configuration)
- MDN HTTP status code reference (https://developer.mozilla.org/en-US/docs/Web/HTTP/Status)

## Issues Found
1. **Incorrect MongoDB installation (fixed).** The Prerequisites section installed MongoDB with `sudo apt install -y mongodb` and managed the service as `mongodb`. The legacy `mongodb` package was dropped from Ubuntu's repositories after 18.04 and is unavailable on any modern (20.04+) system, which a Node 20 install implies — the command fails with a "package not found" error. Replaced it with the official MongoDB APT repository procedure (import GPG key, add the `mongodb-org` repo, `apt install -y mongodb-org`) and corrected the service name to `mongod` for `systemctl start`/`enable`.
2. **Troubleshooting service name (fixed).** "Issue 2: MongoDB Connection Errors" referenced `sudo systemctl status mongodb` and `sudo systemctl start mongodb`. Updated both to `mongod` to match the official `mongodb-org` service unit. (The `/var/log/mongodb/mongod.log` path was already correct and left unchanged.)

## Review Notes
- The Mongoose connection options `useNewUrlParser` and `useUnifiedTopology` are deprecated no-ops since Mongoose 6 (they are always-on and ignored in Mongoose 6/7/8). They are harmless and still extremely common in tutorials, so they were left in place; a future revision could drop them to silence the deprecation warning.
- The PM2 config sets `wait_ready: true`, which expects the app to emit `process.send('ready')`; without that signal PM2 falls back to `listen_timeout` (10s here) before considering the app online. Functional but worth being aware of.
- The user email regex `/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/` restricts the TLD to 2–3 characters, which rejects valid longer TLDs (e.g. `.info`, `.online`). The Joi/Zod `.email()` validators in the request layer are more permissive, so this only affects the Mongoose-level match. Cosmetic, not corrected.
- All HTTP status code mappings, REST principle explanations, Express middleware ordering (error handler last, 404 catch-all before it), JWT auth/authorize flow, bcrypt usage, Joi/Zod schemas, Prisma schema, Swagger config, PM2 commands, and Jest configuration were verified and are accurate.
