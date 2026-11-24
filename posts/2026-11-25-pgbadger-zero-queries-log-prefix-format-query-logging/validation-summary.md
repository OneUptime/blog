# Validation summary

Reviewed the separation of log emission, transport, parser format/prefix recognition, query text and report filtering. The tutorial avoids treating a completed parse as proof of query recognition and uses transaction-scoped diagnostic logging.

## Sources reviewed

- https://www.postgresql.org/docs/18/view-pg-settings.html
- https://www.postgresql.org/docs/18/runtime-config-logging.html
- https://www.postgresql.org/docs/18/sql-set.html
- https://www.postgresql.org/docs/18/runtime-config-logging.html#RUNTIME-CONFIG-LOGGING-WHERE
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://pgbadger.darold.net/documentation.html

## Checks performed

Ran pgBadger 13.3 under Perl 5.34.1 on controlled records. The known SQL fixture produced one query and one normalized query. Duration-only input produced one query with no normalized SQL; checkpoint-only input produced zero. An excluding database filter also produced zero.

Started a fresh PostgreSQL 14.17 cluster with TCP disabled and an isolated Unix socket. A query with duration logging disabled was absent. The exact article transaction-scoped probe produced a standalone duration-and-statement record. The cluster was stopped after the test. pgBadger recognized this real record with its correct custom prefix, while an incompatible prefix or syslog format produced zero queries.

Generated an HTML report containing the fixture SQL. Checked article probe equality and shell syntax. The six-node/five-edge Mermaid diagram passed structural checks. Generated and visually inspected the 1280x720 social image; the three-line title fits.

## Limits

The installed PostgreSQL 14.17 runtime was used only as a disposable test fixture, not a deployment recommendation. PostgreSQL 18 configuration semantics were reviewed but not executed on that version. No production, managed-service transport, CSV/JSON or incremental processing repair was tested. The HTML report was content-checked, not visually rendered. Mermaid was not browser-rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
