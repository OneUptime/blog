# Validation Summary: How to Use MongoDB with Kong API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kong API Gateway 3.6
- MongoDB 7.0
- Node.js with Express
- MongoDB Node.js Driver
- Docker Compose
- JWT authentication
- Rate limiting with Redis

## Sources Consulted
- Kong Gateway 3.x Declarative Configuration documentation (https://docs.konghq.com/gateway/latest/production/deployment-topologies/db-less-and-declarative-config/)
- Kong Gateway Admin API documentation (https://docs.konghq.com/gateway/latest/admin-api/)
- Kong rate-limiting plugin documentation (https://docs.konghq.com/hub/kong-inc/rate-limiting/configuration/)
- Kong JWT plugin documentation (https://docs.konghq.com/hub/kong-inc/jwt/)
- Kong key-auth plugin documentation (https://docs.konghq.com/hub/kong-inc/key-auth/)
- Kong route entity documentation — strip_path behavior (https://docs.konghq.com/gateway/latest/key-concepts/routes/)
- MongoDB Node.js Driver documentation (https://www.mongodb.com/docs/drivers/node/current/)

## Issues Found

1. **Path routing mismatch (Kong strip_path default):** Kong's `strip_path` defaults to `true`, which strips the matched route path prefix before forwarding to the upstream. The route path was `/api/products`, so Kong would forward requests as `GET /` to the upstream — but the Express app had routes at `/products`, which would never match. Fixed by adding `strip_path: false` to the route configuration and updating Express routes from `/products` to `/api/products` so the full path is preserved and correctly matched.

2. **DB-less mode incompatible with Admin API write commands:** The Docker Compose setup configured Kong in DB-less mode (`KONG_DATABASE: "off"`), but the JWT authentication and per-consumer rate-limiting sections used `curl -X POST` commands against the Admin API. In DB-less mode, the Admin API is read-only — POST/PUT/PATCH/DELETE requests are rejected. Added clarifying notes before those sections explaining that the Admin API commands require a database-backed Kong deployment, and that DB-less users should configure these in their `kong.yml` file instead.

3. **Deprecated Redis configuration format:** The rate-limiting curl command used `config.redis_host=redis`, which is the deprecated flat field format. Since Kong 3.4+, the rate-limiting plugin uses a nested Redis configuration structure: `config.redis.host`. Updated to `config.redis.host=redis`.

## Review Notes
- The `ObjectId` import in the Node.js code is unused but harmless — it would likely be needed for future PUT/DELETE routes that the tutorial doesn't fully implement.
- The `version: "3.8"` key in Docker Compose is obsolete in Docker Compose V2 (it is ignored), but it does not cause errors and is still commonly seen in tutorials.
- The declarative `kong.yml` uses `_format_version: "3.0"` which is correct for Kong 3.x.
- The `keyauth_credentials` field in the declarative config consumers section is correct for Kong 3.x declarative format.
