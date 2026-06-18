# Validation Summary: How to Structure Express.js Applications for Scale

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Express.js
- Node.js
- JavaScript CommonJS modules
- Express middleware
- Helmet
- CORS middleware
- Compression middleware
- Joi validation
- JSON Web Tokens with jsonwebtoken
- PostgreSQL with node-postgres
- Redis as a shared session/cache layer

## Sources Consulted
- Express 5.x API Reference: https://expressjs.com/en/api/
- Express body-parser middleware documentation: https://expressjs.com/en/resources/middleware/body-parser/
- Helmet package documentation: https://www.npmjs.com/package/helmet
- cors package documentation: https://www.npmjs.com/package/cors
- compression package documentation: https://www.npmjs.com/package/compression
- jsonwebtoken package documentation: https://www.npmjs.com/package/jsonwebtoken
- Joi API documentation: https://joi.dev/api/
- node-postgres Pool API documentation: https://node-postgres.com/apis/pool
- Node.js HTTP API documentation: https://nodejs.org/api/http.html

## Issues Found
- The repository example imported `db` from `../models`, but the database configuration example exports a node-postgres `pool`. Updated the repository to import `{ pool }` from `../config/database` and call `pool.query(...)`, matching the documented node-postgres Pool API.
- The PostgreSQL repository example used `SELECT *` and `RETURNING *`, while the service expected camelCase fields such as `passwordHash`. Because PostgreSQL returns `password_hash` by default, authentication would compare against `undefined`, and sanitized responses could expose password hashes. Updated the queries to return explicit columns and alias `password_hash` as `"passwordHash"`, while list queries omit the hash.
- The folder tree listed a separate `authorization.js`, but the route and middleware examples implement `authorize` in `authentication.js`. Updated the folder tree comment to match the code shown later in the post.
- The authorization middleware comment said it could accept a single role or an array of roles, but the implementation accepts one or more role arguments via rest parameters. Updated the comment to accurately describe the implementation.

## Review Notes
- Verified all JavaScript code blocks with `node --check`; all 17 snippets parse successfully.
- The graceful shutdown example is directionally correct for HTTP server shutdown, but production services may also need to close database pools, queues, and other long-lived resources.
