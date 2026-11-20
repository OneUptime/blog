# Validation review

The article separates unavailable packages from privileges and policy, then compares alternatives by required behavior. Its UUID example is explicitly version-4-only, and its worker design states the asynchronous and duplicate-delivery boundaries. SQL was parsed but not run against PostgreSQL.

## Checks

- Both SQL statements parsed with pglast 7.24 / PostgreSQL parser 17.7
- PostgreSQL 17 extension installation, built-in UUID generation, function privileges, notifications and server worker model source-reviewed
- RDS supported-extension restrictions and Trusted Language Extensions documentation reviewed
- Mermaid structurally checked: six nodes and five edges; not rendered
- Generated social image visually reviewed without clipping

## Limitations

- No live database queries, extension installation, custom function, worker or self-hosted database deployed
- Outbox diagram describes a design requiring implementation, leasing, retries and idempotency; no exactly-once claim
- Provider-specific availability and application equivalence require deployment-specific tests

## Reviewed sources

- https://www.postgresql.org/docs/17/view-pg-available-extensions.html
- https://www.postgresql.org/docs/17/sql-createextension.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.FeatureSupport.Extensions.html
- https://www.postgresql.org/docs/17/functions-uuid.html
- https://www.postgresql.org/docs/17/sql-createfunction.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL_trusted_language_extension.html
- https://www.postgresql.org/docs/17/sql-notify.html
- https://www.postgresql.org/docs/17/bgworker.html
- https://www.postgresql.org/docs/17/backup.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
