# How to Monitor MySQL Queries in Real Time

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Query, Performance Schema, Monitoring, Real-Time

Description: Use MySQL Performance Schema, SHOW PROCESSLIST, and pt-query-digest to monitor and analyze queries running in MySQL in real time.

---

## Using SHOW PROCESSLIST

The quickest way to see what MySQL is executing right now is `SHOW PROCESSLIST`:

```sql
SHOW FULL PROCESSLIST;
```

The `FULL` keyword shows the complete SQL text instead of truncating it at 100 characters. Key columns to watch:

- `Time` - how many seconds the query has been running
- `State` - what the query is currently doing (e.g., "Sending data", "Waiting for lock")
- `Info` - the SQL text

Kill a long-running query:

```sql
KILL QUERY 1234;
```

## Filtering with Performance Schema

`performance_schema.events_statements_current` shows the statement each thread is executing right now:

```sql
SELECT t.PROCESSLIST_ID,
       t.PROCESSLIST_USER,
       t.PROCESSLIST_HOST,
       t.PROCESSLIST_TIME AS seconds,
       s.SQL_TEXT,
       s.ROWS_EXAMINED,
       s.ROWS_SENT
FROM performance_schema.threads t
JOIN performance_schema.events_statements_current s
  ON t.THREAD_ID = s.THREAD_ID
WHERE t.PROCESSLIST_COMMAND != 'Sleep'
ORDER BY t.PROCESSLIST_TIME DESC;
```

## Finding the Most Expensive Recent Queries

`events_statements_summary_by_digest` aggregates statistics for each normalized query pattern. Use it to find queries with high execution time or row scans:

```sql
SELECT DIGEST_TEXT,
       COUNT_STAR AS executions,
       ROUND(AVG_TIMER_WAIT / 1e9) AS avg_ms,
       ROUND(SUM_TIMER_WAIT / 1e9) AS total_ms,
       SUM_ROWS_EXAMINED,
       SUM_NO_INDEX_USED
FROM performance_schema.events_statements_summary_by_digest
ORDER BY avg_ms DESC
LIMIT 15;
```

`SUM_NO_INDEX_USED > 0` flags full table scans - a quick way to find missing indexes.

## Watching Slow Queries in Real Time

Enable the slow query log for immediate feedback during a performance investigation:

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

Tail the log while load is running:

```bash
sudo tail -f /var/log/mysql/slow.log
```

Remember to disable the log after your investigation to avoid disk pressure:

```sql
SET GLOBAL slow_query_log = 'OFF';
```

## Analyzing Slow Query Logs with pt-query-digest

Install Percona Toolkit and run `pt-query-digest` against the slow log to get a ranked report:

```bash
sudo apt-get install -y percona-toolkit
pt-query-digest /var/log/mysql/slow.log | head -100
```

The output ranks queries by total time, showing count, min/max/avg latency, and the full SQL fingerprint for each pattern.

## Using MySQL Enterprise Monitor Query Analyzer

If you have MySQL Enterprise, the Query Analyzer in MySQL Enterprise Monitor provides a real-time view of query performance with filtering by schema, user, and time range - no slow log required.

## Summary

Monitoring MySQL queries in real time starts with `SHOW FULL PROCESSLIST` for immediate visibility, then `performance_schema.events_statements_summary_by_digest` for aggregate query patterns, and the slow query log for capturing queries over a latency threshold. Use `pt-query-digest` to analyze slow log files and prioritize optimization work by total execution time rather than individual query latency.
