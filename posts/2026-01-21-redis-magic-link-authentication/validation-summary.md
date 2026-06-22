# Validation Summary: How to Implement Magic Link Authentication with Redis

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Redis
- redis-py
- ioredis
- Python
- Node.js
- Express.js
- Nodemailer
- Magic link / passwordless authentication
- Redis Lua scripting

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- Redis programmability / Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- ioredis documentation: https://redis.github.io/ioredis/
- Node.js Buffer documentation: https://nodejs.org/api/buffer.html
- Python secrets module documentation: https://docs.python.org/3/library/secrets.html
- Express response API documentation: https://expressjs.com/en/4x/api/response/
- Nodemailer SMTP transport documentation: https://nodemailer.com/smtp

## Issues Found
- Replaced Redis `SETEX` usage with `SET` plus expiration options (`ex=` in redis-py and `'EX'` in Redis command calls). Redis documents `SETEX` as deprecated in favor of `SET` with `EX`, and redis-py repeats the same recommendation for new code.
- Corrected the basic Python comment that said the non-Lua verification path marked a token as used atomically. That path performs separate client-side `GET` and `SET` operations, so the comment now describes the actual behavior without claiming atomicity.
- Updated the Express IP fallback from `req.connection.remoteAddress` to `req.socket.remoteAddress` to avoid relying on the older Node request connection alias.
- URL-encoded the token when building the email magic link so the URL construction remains correct if token generation changes or reserved characters are introduced.

## Review Notes
- The Lua verification examples correctly use Redis server-side scripting for atomic token verification and consumption.
- The rate-limit check/increment examples are simple fixed-window examples and can allow small bursts under concurrency because checking and incrementing are separate operations. For production systems, this could be tightened with a Lua script or a single atomic increment-and-check pattern.
- The Express example uses `crypto.randomBytes(32).toString('base64url')`, which is supported in modern Node.js versions. Older Node.js versions before `base64url` support would need a compatibility helper.
