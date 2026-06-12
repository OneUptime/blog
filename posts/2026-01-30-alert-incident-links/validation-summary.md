# Validation Summary: How to Implement Alert Incident Links

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- PostgreSQL
- SQL schema design
- JavaScript
- Node.js
- Express.js
- YAML configuration
- Mermaid diagrams
- Vector similarity / embeddings concepts

## Sources Consulted
- PostgreSQL CREATE TABLE documentation: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL constraints documentation: https://www.postgresql.org/docs/current/ddl-constraints.html
- PostgreSQL CREATE INDEX documentation: https://www.postgresql.org/docs/current/sql-createindex.html
- PostgreSQL JSON types documentation: https://www.postgresql.org/docs/current/datatype-json.html
- PostgreSQL JSON functions and operators documentation: https://www.postgresql.org/docs/current/functions-json.html
- PostgreSQL UUID functions documentation: https://www.postgresql.org/docs/current/functions-uuid.html
- Node.js Crypto documentation: https://nodejs.org/api/crypto.html
- Express routing guide: https://expressjs.com/en/guide/routing/
- Mermaid syntax reference: https://mermaid.js.org/intro/syntax-reference.html

## Issues Found
- The initial `incidents` table omitted `aggregation_key`, but the aggregation engine later queries and writes `incidents.aggregation_key`. Added the column and an index so the SQL schema supports the later code.
- The historical bulk-linking code updated `last_activity` and appended to `activity_log`, but those columns were not defined in the schema. Added both columns to `incidents`.
- The post-incident review code writes to `reviewLinks`, but the SQL schema did not include a corresponding table. Added a `review_links` table with an incident foreign key, unique UUID token, access level, expiry timestamp, and creation timestamp.
- The JSONB defaults relied on implicit casting from string literals. Updated them to explicit `::jsonb` casts for clarity and consistency with PostgreSQL JSONB examples.
- `findUnlinkedAlerts` called `incident.created_at.getTime()`, which fails when a database client returns timestamps as strings. Changed the code to normalize `incident.created_at` through `new Date(...)` before calling `getTime()`.

## Review Notes
- JavaScript examples were syntax-checked with Node.js v22.22.0.
- PostgreSQL SQL was reviewed against official PostgreSQL documentation, but not executed locally because `psql` is not installed in this environment.
- The Express route snippets assume surrounding application dependencies such as `db`, `incidentManager`, `historicalLinking`, `similarDetector`, `postIncidentReview`, and authentication middleware that populates `req.user`.
