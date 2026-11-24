# Validation summary

Reviewed maintenance history alongside current statistics and live progress.

## Sources reviewed

- https://www.postgresql.org/docs/18/routine-vacuuming.html
- https://www.postgresql.org/docs/18/runtime-config-logging.html
- https://www.postgresql.org/docs/18/monitoring-stats.html
- https://www.postgresql.org/docs/18/progress-reporting.html
- https://www.postgresql.org/docs/18/sql-createtable.html#SQL-CREATETABLE-STORAGE-PARAMETERS
- https://www.postgresql.org/docs/18/runtime-config-vacuum.html
- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger

## Checks performed

Generated real automatic maintenance in a disposable PostgreSQL14.17 instance with no TCP listener. Inserted2000 rows, deleted1500 and waited for vacuum/analyze completion. The exact article audit query reported500 live/0 dead/0 modified estimates, populated automatic timestamps and counters1/1. SHOW, relation-options and both progress queries also executed; progress returned no rows after completion. The lab instance was stopped.

pgBadger13.3 under Perl5.34.1 produced HTML with one automatic vacuum and one automatic analyze for the fixture table. Ordinary query-duration logging remained disabled. The exact article parser command generated HTML after input/executable path adaptation.

The six-node/five-edge diagram passed structural checks. Generated and visually inspected the1280x720 social image; its two title lines fit.

## Limits

PostgreSQL14.17 is an explicitly disclosed older lab runtime;18 documentation was reviewed but18 was not executed. No production thresholds, active progress phases, retained snapshots, worker saturation or wraparound condition were tested. Lab thresholds accelerate a small fixture and are not a production recipe. HTML was checked programmatically without visual browser review; Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
