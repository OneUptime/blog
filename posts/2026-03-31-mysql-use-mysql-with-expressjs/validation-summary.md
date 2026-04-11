# Validation Summary: How to Use MySQL with Express.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Express.js
- Node.js
- mysql2 (npm package)
- dotenv (npm package)

## Sources Consulted
- mysql2 official documentation: https://sidorares.github.io/node-mysql2/docs
- mysql2 GitHub repository and API reference: https://github.com/sidorares/node-mysql2
- Express.js API reference (Router, error handling): https://expressjs.com/en/api.html
- dotenv npm package documentation: https://github.com/motdotla/dotenv

## Issues Found
1. **Missing `dotenv` initialization**: The post installs `dotenv`, shows environment variables in `.env` format, uses `process.env.*` in the pool configuration, and the Summary explicitly says to "load them with `dotenv` before the pool is initialized" — but `require('dotenv').config()` was never called in the code. Without this call, environment variables from the `.env` file are not loaded into `process.env`. **Fix**: Added `require('dotenv').config();` at the top of the `src/db.js` example, before the pool is created.

## Review Notes
- The async route handlers do not include try/catch blocks. In Express 5 (the current major version), rejected promises from async route handlers are automatically forwarded to the error-handling middleware, so this is correct. If readers are using Express 4, they would need a try/catch wrapper or a library like `express-async-errors`.
- `waitForConnections: true` is the default value for mysql2 pools, so it is redundant but not incorrect.
- The `connectionLimit: 20` is a reasonable value; the mysql2 default is 10.
- All SQL queries use parameterized placeholders (`?`) via `pool.execute()`, which is the correct approach for preventing SQL injection.
- The transaction pattern (getConnection, beginTransaction, commit/rollback, release in finally) is textbook correct.
