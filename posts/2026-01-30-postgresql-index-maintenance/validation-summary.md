# Validation Summary: How to Build PostgreSQL Index Maintenance Strategy

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (12+ for REINDEX CONCURRENTLY; queries assume PG 10+ stat view shape)
- pgstattuple extension (pgstatindex function)
- pg_repack extension and CLI
- Bash scripting / cron for scheduled maintenance

## Sources Consulted
- PostgreSQL Monitoring Stats (pg_stat_user_indexes column list): https://www.postgresql.org/docs/current/monitoring-stats.html
- pgstattuple extension docs (avg_leaf_density semantics): https://www.postgresql.org/docs/current/pgstattuple.html
- REINDEX SQL command (locking, CONCURRENTLY syntax): https://www.postgresql.org/docs/current/sql-reindex.html
- pg_repack documentation (CLI flags): https://reorg.github.io/pg_repack/
- PGDG package listings (postgresql-16-repack on Debian; pg_repack_16 on RHEL): packages.debian.org and yum.postgresql.org

## Issues Found
1. **Wrong column names against `pg_stat_user_indexes`.** Multiple SQL queries, the PL/pgSQL function, the bash script, and the two dashboard views referenced `tablename` and `indexname`. The actual columns are `relname` (table name) and `indexrelname` (index name). These queries would have failed with "column does not exist". Replaced all occurrences with the correct column names.

2. **Incorrect `avg_leaf_density` scaling.** In the "Check specific index bloat" query, `leaf_density_pct` was computed as `round(100.0 * avg_leaf_density, 2)`. `pgstatindex.avg_leaf_density` is already returned as a percentage (e.g., `54.27` meaning 54.27%, per the docs example), so multiplying by 100 produces values in the thousands. Changed to `round(avg_leaf_density::numeric, 2)`. Also added an explicit `::numeric` cast on the bloat calculation for `round(..., 2)` to work cleanly with the float8 result.

3. **Overstated REINDEX lock claim.** The post said "Standard REINDEX acquires an exclusive lock on the table, blocking all reads and writes." Per the official docs, REINDEX takes a SHARE lock on the parent table (blocking writes but not reads) and an ACCESS EXCLUSIVE lock on the specific index. Rewrote the warning to reflect the real lock behavior while still conveying the practical impact (planner attempts to lock all indexes, so most queries get blocked anyway).

4. **Wrong pg_repack flag for schema.** The post used `pg_repack -d myapp -s public` to "Repack all tables in a schema". In pg_repack, `-s/--tablespace` selects a tablespace, not a schema. The correct flag for schema is `-c/--schema`. Changed to `-c public`.

5. **Added `::numeric` cast in `maintenance_candidates` view.** Same float8/round issue as #2 — `round(100.0 - avg_leaf_density, 2)` against a float8 would not match the two-argument `round(numeric, integer)`. Cast to numeric to match the working pattern used elsewhere in the post.

## Review Notes
- `REINDEX SCHEMA CONCURRENTLY` is valid in PG 12+ (confirmed via the official synopsis), but the docs note that indexes backing exclusion constraints are skipped during concurrent reindexing, and `REINDEX SYSTEM CONCURRENTLY` is not supported. The post does not need to mention these edge cases for its scope, but readers should be aware.
- The pgstatindex JOIN pattern (`JOIN pgstatindex(indexrelid::regclass::text) ON true`) is valid because LATERAL is implicit for function-call FROM items in PostgreSQL — left as-is.
- The package names `postgresql-16-repack` (Debian/Ubuntu PGDG) and `pg_repack_16` (RHEL/CentOS PGDG) are correct as of writing. Version numbers will need updating as new PostgreSQL major versions are released.
- The decision-framework Mermaid diagram is opinion/heuristic rather than a hard rule (e.g., small databases can also benefit from CONCURRENTLY); left as authorial guidance.
- The comparison table's "Lock Type: Exclusive" for standard REINDEX is a simplification — the prose warning is now more precise, so the table is acceptable shorthand.
