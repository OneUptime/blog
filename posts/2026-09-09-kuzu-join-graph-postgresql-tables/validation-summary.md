# Validation Summary: Join Kuzu Graph Matches with Attached PostgreSQL Tables

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Kuzu 0.11.3 and its PostgreSQL extension
- PostgreSQL and SQL
- Cypher graph creation, relational scans, projections, and joins
- Embedded DuckDB and its PostgreSQL extension
- Cross-system consistency, schema caching, and query performance

## Sources Consulted
- [Kuzu PostgreSQL extension documentation](https://kuzudb.github.io/docs/extensions/attach/postgres/) — attachment options, default schema, type mappings, table scans, read-only SQL_QUERY, schema-cache refresh, and detachment.
- [Kuzu extension management](https://kuzudb.github.io/docs/extensions/) — INSTALL FROM, loading extensions, and hosting a custom extension repository.
- [Kuzu 0.11.3 release notes](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3) — bundled extensions and the requirement to provision a local server for other extensions.
- [Kuzu repository metadata](https://api.github.com/repos/kuzudb/kuzu) — archived repository status.
- [PostgreSQL connector, v0.11.3](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/postgres/src/connector/postgres_connector.cpp) — separate embedded DuckDB instance, installation and loading of its postgres extension, and read-only PostgreSQL attachment.
- [SQL_QUERY implementation, v0.11.3](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/postgres/src/function/sql_query.cpp) — remote postgres_query execution, result-column binding, and projection.
- [SQL_QUERY implementation tests, v0.11.3](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/postgres/test/test_files/sql_query.test) — documented query forms, result handling, and rejected non-SELECT statements.
- [DuckDB scan implementation, v0.11.3](https://github.com/kuzudb/kuzu/blob/v0.11.3/extension/duckdb/src/function/duckdb_scan.cpp) — scan projections and supported predicate forwarding.
- [Kuzu LOAD FROM](https://kuzudb.github.io/docs/cypher/query-clauses/load-from/) — scanned columns become query variables and scans can precede graph clauses.
- [Kuzu WITH](https://kuzudb.github.io/docs/cypher/query-clauses/with/) — projection and variable scope before a subsequent MATCH.
- [Kuzu CREATE TABLE](https://kuzudb.github.io/docs/cypher/data-definition/create-table/) — node primary keys, relationship definitions, edge identity, and default multiplicity.
- [Kuzu CREATE clause](https://kuzudb.github.io/docs/cypher/data-manipulation-clauses/create/) — node insertion and creation of relationships between matched endpoints.
- [PostgreSQL CREATE TABLE](https://www.postgresql.org/docs/current/sql-createtable.html) — SQL table definition and primary-key constraint.
- [PostgreSQL INSERT](https://www.postgresql.org/docs/current/sql-insert.html) — multirow VALUES insertion.
- [PostgreSQL connection strings](https://www.postgresql.org/docs/current/libpq-connect.html) — keyword/value connection parameters.

## Issues Found
No technical issues found.

## Review Notes
- The README was left unchanged. Its examples use APIs supported by the explicitly targeted Kuzu 0.11.3 release.
- The local fixture creates two accounts, one project, and two assignment relationships. Applying the enabled flag and shared-key equality yields the expected row: account_id 1, tier priority, project_id 10. This result was checked by tracing the fixture and documented query semantics, not by running the integration.
- The bigint/INT64 join keys are compatible. WITH preserves the imported variables used by MATCH, and the equality predicate supplies the relational-to-graph join. Missing matches are excluded; additional matching edges can multiply results.
- The custom-server installation syntax is documented. The release bundles algo, fts, json, and vector; postgres requires separate provisioning. The tagged connector also installs and loads DuckDB's postgres extension, supporting the stated offline-deployment caveat.
- SQL_QUERY passes its SQL through DuckDB's postgres_query and the connector attaches PostgreSQL read-only. Fixed SQL and separately parameterized extraction are appropriate recommendations for dynamic input.
- Predicate forwarding exists in the scan implementation, so the post correctly avoids claiming that every LOAD FROM filter is necessarily executed locally or remotely. Actual transfer volume and plans require deployment-specific measurement.
- The separate embedded connector supports the warning that a local Kuzu transaction does not establish an atomic snapshot across both systems. Historical snapshot alignment and missing-row policies remain application responsibilities.
- The official attachment documentation confirms schema caching and the clear_attached_db_cache procedure. Provision the PostgreSQL database, reader permissions, authentication, and fixture schema before relying on scans; refresh the attachment cache if schema changes occur afterward.
- Referenced documentation pages were retrieved successfully. GitHub source links were checked through their corresponding raw files at the v0.11.3 tag after browser fetch failures. The localhost extension URL is an explicitly illustrative deployment endpoint, not a public service to verify.
- Review scope: official documentation and version-tagged source inspection. No live Kuzu/PostgreSQL integration, custom extension-server installation, latency measurements, or execution-plan capture was performed. The upstream SQL_QUERY test cases contain SKIP markers; their contents provide implementation examples, not evidence of a successful test run during this review.
