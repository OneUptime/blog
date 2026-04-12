# Validation Summary: How to Use pt-query-digest for MySQL Query Analysis

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (slow query log, general query log, binary logs)
- Percona Toolkit / pt-query-digest
- tcpdump (for MySQL traffic capture)
- mysqlbinlog

## Sources Consulted
- Percona Toolkit official documentation for pt-query-digest: https://docs.percona.com/percona-toolkit/pt-query-digest.html
- MySQL 8.0 Reference Manual — slow query log: https://dev.mysql.com/doc/refman/8.0/en/slow-query-log.html
- MySQL 8.0 Reference Manual — FLUSH statement: https://dev.mysql.com/doc/refman/8.0/en/flush.html

## Issues Found

1. **Incorrect `--filter` attribute for index usage (Section: "Report on Queries Without an Index")**
   - **What was wrong:** The filter used `$event->{No_index_used} eq "Yes"`. The `No_index_used` attribute is only available in tcpdump captures (`--type=tcpdump`), not in slow log events. When analyzing slow logs (the primary use case in this post), this filter would silently match nothing.
   - **What was changed:** Replaced `No_index_used` with `Full_scan`, which is the correct attribute for detecting full table scans in Percona Server's extended slow log format. Updated the section title and description to reflect this.
   - **Why:** The `Full_scan` attribute is the documented slow log equivalent for identifying queries that did not use indexes effectively. It requires Percona Server's extended slow log, which is noted in the updated text.

2. **Invalid `$event->{count}` filter (Section: "Filter by Minimum Execution Count")**
   - **What was wrong:** The filter `$event->{count} > 100` is invalid because `count` is an aggregate metric computed after query grouping, not an attribute on individual events. The `--filter` option operates on individual events before aggregation, so `$event->{count}` would be undefined and the filter would never match.
   - **What was changed:** Replaced the section with a "Filter by Minimum Execution Time" example using `$event->{Query_time} > 2`, which is a valid event-level attribute.
   - **Why:** `Query_time` is a standard slow log attribute available on every event, making this a correct and practically useful filter example.

## Review Notes
- The "Report on Queries That Caused a Full Table Scan" filter requires Percona Server's extended slow log format. Standard MySQL Community Server does not log the `Full_scan` attribute. This is noted in the updated text.
- The installation section assumes the Percona repository is already configured on the system. In practice, users may need to add the Percona apt/yum repository first before installing percona-toolkit.
- The `--type=binlog` option is still documented and supported in current Percona Toolkit versions, though the binary log must first be converted to text via `mysqlbinlog`.
- All other commands, flags, sample output formats, SQL statements, and configuration snippets are technically correct.
