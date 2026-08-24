# Validation Summary: How to Separate MySQL Query CPU Time from I/O and Lock Wait Time with Performance Schema Events

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- MySQL 8.0.28 and later
- MySQL Performance Schema
- SQL statement digest summaries
- CPU and event timers
- Wait-event histories and summaries
- InnoDB data locks and metadata locks

## Sources Consulted

- [MySQL 8.0.28 release notes](https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-28.html)
- [MySQL 8.4 Performance Schema statement event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-current-table.html)
- [MySQL 8.4 Performance Schema statement summary tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-summary-tables.html)
- [MySQL 8.4 Performance Schema pre-filtering by consumer](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-consumer-filtering.html)
- [MySQL 8.4 Performance Schema event timing](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-timing.html)
- [MySQL 8.4 `performance_timers` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-performance-timers-table.html)
- [MySQL 8.4 Performance Schema wait event tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-wait-tables.html)
- [MySQL 8.4 Performance Schema wait summary tables](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-wait-summary-tables.html)
- [MySQL 8.4 Performance Schema instrument naming conventions](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-instrument-naming.html)
- [MySQL 8.4 Performance Schema atom and molecule events](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-atom-molecule-events.html)
- [MySQL 8.4 `events_waits_current` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-waits-current-table.html)
- [MySQL 8.4 obtaining parent event information](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-obtaining-parent-events.html)
- [MySQL 8.4 `data_lock_waits` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-data-lock-waits-table.html)
- [MySQL 8.4 `metadata_locks` table](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-metadata-locks-table.html)
- [MySQL 8.4 Performance Schema general table characteristics](https://dev.mysql.com/doc/refman/8.4/en/performance-schema-table-characteristics.html)

## Issues Found

- **Incomplete consumer inventory**: The consumer query omitted `global_instrumentation`, `thread_instrumentation`, and `statements_digest`. CPU collection depends on the first two, and digest collection depends on the third. Added all three to the inventory query.
- **Incomplete instrument inventory**: The post queried synchronization wait summaries but did not inventory `wait/synch/%` instruments. Added that instrument prefix.
- **Overstated visibility**: The introduction said Performance Schema exposes every listed source of elapsed time, including uninstrumented work. Changed this to say that it exposes some of them, and described operating-system descheduling more precisely.
- **Incorrect `SUM_LOCK_TIME` scope**: The post repeatedly labeled this field as table-lock-only and said InnoDB record locks were separate. MySQL 8.0.28 changed `LOCK_TIME` to include time waited on SQL tables and data locks, including InnoDB row locks. Renamed the query alias to `lock_seconds` and corrected the description, dashboard label, and conclusion. Retained the caveat that metadata-lock waits and internal synchronization are separate.
- **Incomplete wait-summary interpretation**: Clarified that `COUNT_STAR` includes timed and untimed events while timer aggregates include only timed events. Also clarified that `wait/io/%` covers file, socket, and table I/O rather than only physical disk operations, and that molecular and batch table-I/O timers are not disjoint disk-wait buckets.
- **Incomplete nesting hierarchy**: The post mentioned waits nested under stages but omitted waits nested under other waits. Added the documented wait-parent case and warned that molecular parent waits can overlap their children, so summing both levels double-counts time.
- **Non-additive stage wording**: The invalid-residual explanation listed stage time as though it were an exclusive component. Replaced it with instrumented work not represented by the subtracted counters because stages are parent intervals that can contain CPU time and waits.

## Review Notes

- All SQL code blocks executed successfully against MySQL Community Server 8.0.46.
- A runtime InnoDB contention check on MySQL 8.0.46 confirmed that a roughly three-second row-lock wait contributed roughly three seconds to `SUM_LOCK_TIME`; a metadata-lock wait did not.
- `CPU_TIME`, `SUM_CPU_TIME`, `THREAD_CPU`, and the `events_statements_cpu` consumer require MySQL 8.0.28 or later. The consumer is disabled by default, and unsupported platforms can show `NULL` characteristics for `THREAD_CPU`.
- The long-history consumers are disabled by default and their tables are bounded circular histories. The attribution query therefore requires the relevant current and long-history consumers to be enabled during the diagnostic window.
- `data_lock_waits` reports current requester/blocker relationships, not accumulated wait duration. The post correctly uses it for active-incident inspection rather than as a historical timer.
- All external links in the post resolve to the correctly labeled official MySQL documentation pages.
