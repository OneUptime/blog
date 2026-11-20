# Validation review

The article separates engine packaging from per-database extension state, checks explicit update paths, and uses a tagged hstore example to demonstrate compatibility review. Its mutating SQL is labeled as a rehearsal example and was only parsed locally.

## Checks

- Four SQL blocks parsed with pglast 7.24 / PostgreSQL parser 17.7: statement counts 1, 1, 1, 5
- hstore 1.8 control file and 1.7-to-1.8 script reviewed in official PostgreSQL REL_17_7 source
- Extension catalog columns, update path semantics, ownership requirements and timeouts source-reviewed
- Mermaid structurally checked: eight nodes and seven edges; not rendered
- Generated social image visually reviewed without clipping

## Limitations

- No live database inventory, extension update, timeout, transaction rollback or restore performed
- Parser verifies SQL syntax, not update-script behavior or provider package availability
- The hstore example applies only to the stated installed version and verified available path; not a universal extension procedure

## Reviewed sources

- https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_UpgradeDBInstance.PostgreSQL.ExtensionUpgrades.html
- https://www.postgresql.org/docs/17/catalog-pg-extension.html
- https://www.postgresql.org/docs/17/view-pg-available-extensions.html
- https://www.postgresql.org/docs/17/view-pg-available-extension-versions.html
- https://www.postgresql.org/docs/17/extend-extensions.html#EXTEND-EXTENSIONS-UPDATES
- https://github.com/postgres/postgres/blob/REL_17_7/contrib/hstore/hstore.control
- https://github.com/postgres/postgres/blob/REL_17_7/contrib/hstore/hstore--1.7--1.8.sql
- https://www.postgresql.org/docs/17/sql-alterextension.html
- https://www.postgresql.org/docs/17/runtime-config-client.html

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
