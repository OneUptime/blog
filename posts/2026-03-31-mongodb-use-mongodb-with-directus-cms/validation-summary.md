# Validation Summary: How to Use MongoDB with Directus CMS

## Status
not-technically-relevant

## Post Type
Tutorial

## Technologies Covered
- Directus CMS
- MongoDB
- Docker Compose
- Directus SDK (@directus/sdk)
- Directus Hooks/Extensions

## Sources Consulted
- Directus official documentation — Supported SQL Databases: https://directus.io/features/supported-sql-databases
- Directus self-hosting requirements: https://directus.io/docs/self-hosting/requirements
- Directus database configuration: https://directus.io/docs/configuration/database
- Directus source code — database client types: https://github.com/directus/directus/blob/main/packages/types/src/database.ts
- Directus source code — database initialization: https://github.com/directus/directus/blob/main/api/src/database/index.ts
- Directus GitHub Discussion #3156 — MongoDB support request: https://github.com/directus/directus/discussions/3156
- Directus GitHub Discussion #22483 — MongoDB support request: https://github.com/directus/directus/discussions/22483
- Knex.js official documentation: https://knexjs.org/guide/
- npm registry lookup for `knex-mongodb` (package does not exist)

## Issues Found
The entire blog post is built on a false premise. **Directus does not support MongoDB as a database backend.** Every section of this post contains fabricated information:

1. **Directus is SQL-only**: Directus is built on Knex.js, which is a SQL query builder. It supports only relational databases: PostgreSQL, MySQL/MariaDB, SQLite, MS SQL Server, OracleDB, CockroachDB, and Redshift. MongoDB is not supported and has never been supported.

2. **`DB_CLIENT=mongodb` does not exist**: The Directus source code defines valid DB_CLIENT values as `mysql`, `postgres`, `cockroachdb`, `sqlite3`, `oracledb`, `mssql`, and `redshift`. Setting `DB_CLIENT=mongodb` would cause Directus to fail on startup.

3. **`knex-mongodb` driver does not exist**: The post claims MongoDB support is provided through a `knex-mongodb` driver. This npm package does not exist (returns 404 on the npm registry).

4. **`npm init directus-project` does not offer MongoDB**: The database selection during project initialization lists only SQL databases. MongoDB is not an option.

5. **Docker Compose configuration would fail**: The Docker Compose setup with `DB_CLIENT: mongodb` and a MongoDB connection string would cause the Directus container to crash on startup since it cannot connect to a MongoDB database.

6. **The introductory claim is false**: Directus does not "wrap any SQL or NoSQL database." It wraps SQL databases only.

7. **The hooks code is fabricated**: The `database.client.config.connection` path to access a native MongoDB connection through Directus hooks is not a real API, since the underlying database is never MongoDB.

8. **MongoDB support is an open feature request**: GitHub discussions (#3156, #22483) show this has been requested by the community but the Directus team has not implemented it due to the fundamental architectural mismatch between Directus's relational model and MongoDB's document model.

This post cannot be fixed with targeted edits — it would require a complete rewrite with a different technology stack (e.g., using PostgreSQL with Directus, or using a CMS that actually supports MongoDB like Strapi or Payload CMS). The post should be removed.

## Review Notes
None of the code examples, configuration snippets, or CLI commands in this post would work. A reader following this tutorial would be unable to complete any step beyond installing Docker and MongoDB. This post appears to be AI-generated content that was not verified against the actual capabilities of Directus.
