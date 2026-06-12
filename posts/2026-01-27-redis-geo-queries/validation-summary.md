# Validation Summary: How to Build Redis Geo Queries for Location Data

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Redis geospatial commands
- Redis sorted sets
- GEOADD, GEOPOS, GEODIST, GEORADIUS, GEOSEARCH, GEOSEARCHSTORE
- Node.js
- ioredis
- Express
- JavaScript

## Sources Consulted
- Redis GEOADD command documentation: https://redis.io/docs/latest/commands/geoadd/
- Redis GEOPOS command documentation: https://redis.io/docs/latest/commands/geopos/
- Redis GEODIST command documentation: https://redis.io/docs/latest/commands/geodist/
- Redis GEORADIUS command documentation: https://redis.io/docs/latest/commands/georadius/
- Redis GEOSEARCH command documentation: https://redis.io/docs/latest/commands/geosearch/
- Redis GEOSEARCHSTORE command documentation: https://redis.io/docs/latest/commands/geosearchstore/
- Redis EXPIRE command documentation: https://redis.io/docs/latest/commands/expire/
- Redis ZREM command documentation: https://redis.io/docs/latest/commands/zrem/
- Redis Node.js migration documentation covering ioredis pipelines: https://redis.io/docs/latest/develop/clients/nodejs/migration/
- ioredis official repository and API documentation: https://github.com/redis/ioredis and https://redis.github.io/ioredis/
- MDN JavaScript falsy values reference: https://developer.mozilla.org/en-US/docs/Glossary/Falsy

## Issues Found
- The Express `POST /api/restaurants` example used `!longitude` and `!latitude` to validate required coordinates. Numeric `0` is a valid coordinate value but is falsy in JavaScript, so valid requests at latitude or longitude zero could be rejected. Changed the required-field check to test for `undefined` and `null`.
- The same endpoint passed request-body coordinates directly to Redis and would return a 500 for non-numeric coordinate input. Added numeric parsing and a 400 response for invalid coordinates before calling `GEOADD`.
- The ride-sharing example claimed that expiring `driver:${driverId}:active` would auto-remove the driver from the `drivers:available` geospatial sorted set. Redis key expiration only deletes the expiring key, not a member in another sorted set. Changed the example to set a separate liveness marker with `SET ... EX` and clarified that a cleanup job should remove inactive drivers from the geospatial set with `ZREM`.

## Review Notes
The Redis command syntax, coordinate ordering, latitude/longitude limits, sorted-set storage model, Haversine/spherical-earth caveat, `GEORADIUS` deprecation guidance, `GEOSEARCH` return parsing, and `GEOSEARCHSTORE STOREDIST` behavior were verified against official Redis documentation. Future improvements could add stricter API validation for allowed units, coordinate ranges, radius, limit, and offset values in the Express example.
