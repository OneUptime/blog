# Validation Summary: Alert on PostgreSQL Transaction-ID Wraparound Risk

## Status

validated

## Post Type

Operational monitoring guide

## Technologies Covered

- PostgreSQL transaction IDs and wraparound protection
- SQL system-catalog queries using `pg_database` and `pg_class`
- Autovacuum, aggressive vacuuming, and the vacuum failsafe
- `pg_stat_activity` and `pg_stat_progress_vacuum`
- Prepared transactions and replication slots
- PostgreSQL multixact IDs

## Sources Consulted

- PostgreSQL wraparound documentation for [14](https://www.postgresql.org/docs/14/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND), [15](https://www.postgresql.org/docs/15/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND), [16](https://www.postgresql.org/docs/16/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND), [17](https://www.postgresql.org/docs/17/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND), and [18](https://www.postgresql.org/docs/18/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND)
- [PostgreSQL 19 beta: Preventing transaction ID wraparound failures](https://www.postgresql.org/docs/19/routine-vacuuming.html#VACUUM-FOR-WRAPAROUND)
- [PostgreSQL 19 Beta 3 release announcement](https://www.postgresql.org/about/news/postgresql-186-1711-1615-1519-1424-and-19-beta-3-released-3365/)
- [PostgreSQL vacuum and autovacuum configuration](https://www.postgresql.org/docs/current/runtime-config-vacuum.html)
- [PostgreSQL table and TOAST storage parameters](https://www.postgresql.org/docs/current/sql-createtable.html#SQL-CREATETABLE-STORAGE-PARAMETERS)
- [PostgreSQL `pg_database` catalog](https://www.postgresql.org/docs/current/catalog-pg-database.html)
- [PostgreSQL `pg_class` catalog](https://www.postgresql.org/docs/current/catalog-pg-class.html)
- [PostgreSQL VACUUM progress reporting](https://www.postgresql.org/docs/current/progress-reporting.html#VACUUM-PROGRESS-REPORTING)
- [PostgreSQL activity and statistics monitoring](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [PostgreSQL transaction ID and snapshot functions](https://www.postgresql.org/docs/current/functions-info.html#FUNCTIONS-PG-SNAPSHOT)
- [PostgreSQL `pg_replication_slots` view](https://www.postgresql.org/docs/current/view-pg-replication-slots.html)
- [PostgreSQL `pg_prepared_xacts` view](https://www.postgresql.org/docs/current/view-pg-prepared-xacts.html)
- [PostgreSQL `VACUUM` command](https://www.postgresql.org/docs/current/sql-vacuum.html)

## Issues Found

- The database-level query labeled its server-wide freeze-age delta as the exact number of XIDs until forced autovacuum. A lower table or TOAST override can trigger work sooner, so the alias and explanation now identify this as a comparison with the server-wide setting.
- The storage-parameter query omitted TOAST-only overrides and did not state that per-relation `autovacuum_freeze_max_age` values can only reduce the server-wide value. The query now joins the associated TOAST relation, returns its `reloptions`, and checks both option arrays.
- The burn-rate guidance referred generically to a cluster transaction counter, which could be mistaken for transaction-completion statistics that do not track XID consumption. It now requires any alternative counter to track XID allocation specifically.
- The forty-million-XID warning threshold was presented as version-independent. The post now states that PostgreSQL 14 through 18 warn at forty million remaining, the PostgreSQL 19 beta documentation raises that point to one hundred million, and both refuse new XID assignments below three million remaining.
- The exhaustion-recovery guidance omitted the superuser requirement needed to process system catalogs and the warning against `VACUUM FREEZE`. It now calls for a database-wide ordinary `VACUUM` as a superuser and warns against both `VACUUM FULL` and `VACUUM FREEZE`.
- The freeze-settings documentation link pointed to an obsolete section of the client configuration page. It now points to the PostgreSQL 18 vacuum-freezing configuration section, and the PostgreSQL 19 wraparound documentation was added for the version-specific threshold.

## Review Notes

- All SQL examples are syntactically valid against current PostgreSQL and use documented catalog columns and functions.
- Reading other sessions' full `pg_stat_activity` details requires a superuser or membership in `pg_read_all_stats`; monitoring roles should account for that permission requirement.
- PostgreSQL 19 was at Beta 3 on the validation date, so its documented warning guardrail should be rechecked at final release and on later upgrades.
