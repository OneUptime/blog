# Validation review

The article uses a PostgreSQL 17-to-17 write-pause migration rather than promising zero downtime. It distinguishes client storage from server filesystem access, requires complete source privileges and destination compatibility, and explicitly handles ownership/grant remapping and the cutover write boundary.

## Checks

- Two SQL catalog queries parsed with pglast 7.24 / PostgreSQL parser 17.7
- Two Bash examples passed syntax checking
- PostgreSQL 17 dump/restore flags, row-security behavior, extension catalogs and replication privilege requirements source-reviewed
- RDS provider role limitations checked against official documentation
- Generated social image visually reviewed without clipping

## Limitations

- No pg_dump or pg_restore binary available locally; export and restore commands not executed
- No provider connection, role grant, database creation, extension installation or migration performed
- Syntax checks do not establish provider-specific permissions, archive portability, ownership correctness or downtime

## Reviewed sources

- https://www.postgresql.org/docs/17/sql-copy.html
- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.PostgreSQL.CommonDBATasks.Roles.rds_superuser.html
- https://www.postgresql.org/docs/17/catalog-pg-extension.html
- https://www.postgresql.org/docs/17/view-pg-available-extension-versions.html
- https://www.postgresql.org/docs/17/app-pgdump.html
- https://www.postgresql.org/docs/17/logical-replication-security.html
- https://www.postgresql.org/docs/17/backup-dump.html
- https://www.postgresql.org/docs/17/libpq-pgpass.html
- https://www.postgresql.org/docs/17/app-pgrestore.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
