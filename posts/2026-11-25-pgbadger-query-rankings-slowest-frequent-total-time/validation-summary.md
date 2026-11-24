# Validation summary

Reviewed query rankings as different selection criteria, with explicit logging-population limits.

## Sources reviewed

- https://github.com/darold/pgbadger/blob/v13.3/README
- https://github.com/darold/pgbadger/blob/v13.3/pgbadger
- https://www.postgresql.org/docs/18/runtime-config-logging.html
- https://www.postgresql.org/docs/18/pgstatstatements.html
- https://www.postgresql.org/docs/18/using-explain.html

## Checks performed

Executed the exact article generator using Python3.11.13 and confirmed that a second invocation refused to overwrite its log. The article parser command generated HTML using pgBadger13.3 and Perl5.34.1. Text-report assertions verified1051 executions, three normalized groups, ten seconds total, export as slowest, lookup as most frequent, and batch as greatest total time. A control retaining only records of at least100ms produced51 executions, two groups and eight seconds, with batch becoming the frequency leader.

The eight-node/nine-edge diagram passed structural checks. Generated and visually inspected the1280x720 social image; its two title lines fit.

## Limits

The data consists of synthetic log records; durations are constructed, not benchmarks. No PostgreSQL queries, EXPLAIN ANALYZE, production changes or pg_stat_statements sampling were executed. Estimated savings are arithmetic examples. HTML was checked through generated content without browser visual review; Mermaid was not rendered.

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
