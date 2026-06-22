# Validation Summary: How to Implement Token Storage with Redis

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
- PyJWT
- jsonwebtoken
- JWT registered claims
- Redis Lua scripting

## Sources Consulted
- Redis SET command documentation: https://redis.io/docs/latest/commands/set/
- Redis SETEX command documentation: https://redis.io/docs/latest/commands/setex/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html
- Redis Lua scripting documentation: https://redis.io/docs/latest/develop/programmability/eval-intro/
- PyJWT API documentation: https://pyjwt.readthedocs.io/en/stable/api.html
- PyJWT usage documentation: https://pyjwt.readthedocs.io/en/latest/usage.html
- jsonwebtoken package documentation: https://www.npmjs.com/package/jsonwebtoken
- node-jsonwebtoken README: https://github.com/auth0/node-jsonwebtoken/blob/master/README.md
- ioredis documentation: https://redis.github.io/ioredis/classes/Redis.html
- RFC 7519 JSON Web Token specification: https://datatracker.ietf.org/doc/html/rfc7519

## Issues Found
- Redis `SETEX` usage was outdated. Redis marks `SETEX` deprecated as of Redis 2.6.12 and recommends `SET` with the `EX` option for new code. Updated Python, Node.js, and Lua examples from `setex` / `SETEX` to `set(..., ex=...)`, `redis.set(..., 'EX', ...)`, and `redis.call('SET', ..., 'EX', ...)`.
- User-level token invalidation used a strict `>` comparison against JWT `iat` values. Because JWT `iat` is second-resolution, tokens issued in the same second as a logout-all operation could remain valid. Updated the checks to use `>=` and clarified the comment/docstring to say tokens issued at or before the timestamp are invalidated.
- The standalone Node.js blacklist helper used `jwt.decode()` to read `jti` and `exp`, which does not verify the token signature. Updated it to use `jwt.verify(token, JWT_SECRET, { ignoreExpiration: true })` so expiration can be ignored for blacklist TTL calculation while still verifying the signature.

## Review Notes
The refresh token rotation examples illustrate the correct security pattern, but production systems should implement the read-check-write rotation path atomically, as the later Lua example shows. Otherwise, concurrent refresh requests can race.
