# Validation review

The article scopes replay gating to PostgreSQL physical replication with known lineage and backend affinity. It requires token capture after commit and a later fresh snapshot for the business read. It does not promise survival of asynchronous writes across failover.

## Checks

- Both SQL examples parsed with pglast 7.24, PostgreSQL parser 17.7
- Post-commit insertion position, standby replay position and pg_lsn comparisons reviewed against PostgreSQL 17 documentation
- Read Committed versus Repeatable Read snapshots and timeline limitations reviewed against official documentation
- Mermaid structurally checked: eight nodes and eight edges; not rendered
- Generated social image visually reviewed without clipping

## Limitations

- No live PostgreSQL replication, promotion, restore, lag injection or query execution performed
- SQL parsing does not verify function permissions or deployment compatibility
- Application topology generation, token handling, backend affinity and request budgets require implementation-specific tests

## Reviewed sources

- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.html
- https://www.postgresql.org/docs/17/warm-standby.html#STREAMING-REPLICATION
- https://www.postgresql.org/docs/17/datatype-pg-lsn.html
- https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-ADMIN-BACKUP
- https://www.postgresql.org/docs/17/functions-admin.html#FUNCTIONS-RECOVERY-INFO
- https://www.postgresql.org/docs/17/transaction-iso.html
- https://www.postgresql.org/docs/17/continuous-archiving.html#BACKUP-TIMELINES

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
