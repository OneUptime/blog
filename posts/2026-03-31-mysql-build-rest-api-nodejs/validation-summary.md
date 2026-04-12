# Validation Summary: How to Build a REST API with MySQL and Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js
- Express.js
- MySQL (via mysql2/promise driver)
- dotenv (environment variable management)
- nodemon (development tool)

## Sources Consulted
- mysql2 npm package documentation: https://github.com/sidorares/node-mysql2
- mysql2 createPool API and pool options: https://sidorares.github.io/node-mysql2/docs
- Express.js API reference (Router, express.json, app.listen): https://expressjs.com/en/api.html
- dotenv npm package documentation: https://github.com/motdotla/dotenv
- Node.js process.env documentation: https://nodejs.org/api/process.html#processenv

## Issues Found
1. **Missing `require('dotenv').config()` in app.js**: The `dotenv` package was installed in the project setup (`npm install express mysql2 dotenv`) but was never loaded in `src/app.js`. Without calling `require('dotenv').config()` before importing modules that read `process.env`, the `.env` file is never parsed and all `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, and `PORT` environment variables would be `undefined`. This would cause the MySQL connection pool to fail to connect. **Fixed** by adding `require('dotenv').config();` at the top of `src/app.js`, before the Express import, ensuring environment variables are loaded before the database pool (imported via the orders route) reads them.

## Review Notes
- The `!total` validation check in the POST route would reject a total of `0`. This is arguably correct for an orders API (zero-dollar orders are unusual), but worth noting.
- The PATCH response returns `req.params.id` (a string) while the POST response returns `result.insertId` (a number). This is a minor inconsistency in the API response shape but not a correctness issue.
- All SQL queries use parameterized placeholders (`?`), which correctly prevents SQL injection.
- The `catch { }` syntax (without an error binding) in the health endpoint is valid ES2019+ and works in Node.js 10+.
