# Validation Summary: How to Use Redis with Sails.js in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- Sails.js (v1)
- Node.js
- ioredis (Redis client)
- connect-redis (v7+ session store)
- @sailshq/socket.io-redis (Socket.io Redis adapter)
- Express-session (via Sails.js internals)

## Sources Consulted
- ioredis documentation: https://github.com/redis/ioredis
- connect-redis v7 documentation: https://github.com/tj/connect-redis
- Sails.js v1 session configuration: https://sailsjs.com/documentation/reference/configuration/sails-config-session
- Sails.js v1 sockets configuration: https://sailsjs.com/documentation/reference/configuration/sails-config-sockets
- Sails.js v1 hooks specification: https://sailsjs.com/documentation/concepts/extending-sails/hooks
- @sailshq/socket.io-redis: https://github.com/sailshq/socket.io-redis

## Issues Found
No technical issues found.

## Review Notes
- The custom hook's error handler (`sails.redis.on('error', cb)`) could theoretically call `cb` multiple times if an error occurs after the `ready` event has already fired and called `cb()`. In practice this is harmless because Sails.js ignores subsequent calls to the hook initialization callback after boot, but production code may want to guard against this with a `once` flag.
- The rate limiter example uses the common `INCR` + conditional `EXPIRE` pattern, which has a minor race condition (if the process crashes between the two commands, the key persists without a TTL). A Lua script or `MULTI/EXEC` pipeline would be more robust, but the simplified version is appropriate for a tutorial.
- The post correctly uses the connect-redis v7+ API (`.default` export, `{ client }` constructor) rather than the older v6 API that required passing the express-session module.
