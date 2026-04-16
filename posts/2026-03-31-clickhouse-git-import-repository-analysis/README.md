# How to Use clickhouse-git-import for Repository Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-git-import, Git Analysis, Developer Analytics, Utility

Description: Learn how to use clickhouse-git-import to load Git repository history into ClickHouse for powerful commit analytics, contributor stats, and code churn analysis.

---

`clickhouse-git-import` parses a Git repository and emits TSV files describing its commit history, file changes, and per-line blame data. You then create three ClickHouse tables and load the TSVs with `clickhouse-client`, enabling SQL-based analysis of code evolution, contributor activity, and repository health.

## Installation

Available in the ClickHouse tools package:

```bash
which clickhouse-git-import
# /usr/bin/clickhouse-git-import
```

## Basic Import

Navigate to a Git repository and run the tool. It writes three TSV files (`commits.tsv`, `file_changes.tsv`, `line_changes.tsv`) into the current directory:

```bash
cd /path/to/your/repo

clickhouse-git-import \
  --skip-paths 'generated|vendor|node_modules'
```

`--skip-paths` takes a re2 regex (not a comma-separated list).

## Tables and Loading the Data

The tool does not connect to ClickHouse. You create the tables yourself — the exact DDL is printed by `clickhouse-git-import --help` — and then load the TSV files with `clickhouse-client`:

```bash
clickhouse-client --query "CREATE DATABASE IF NOT EXISTS git_analytics"

# Create tables using the DDL from `clickhouse-git-import --help`
# (commits, file_changes, line_changes)

clickhouse-client --database git_analytics --query "INSERT INTO commits FORMAT TSV"       < commits.tsv
clickhouse-client --database git_analytics --query "INSERT INTO file_changes FORMAT TSV"  < file_changes.tsv
clickhouse-client --database git_analytics --query "INSERT INTO line_changes FORMAT TSV"  < line_changes.tsv
```

The three tables are:

```text
commits         - one row per commit (hash, author, time, message, lines_added, lines_deleted, ...)
file_changes    - per-file changes per commit (path, author, time, lines_added, lines_deleted, ...)
line_changes    - per-line data with blame (sign, line_number_new, line, prev_author, ...)
```

## Example Queries

### Top Contributors by Commits

```sql
SELECT
    author,
    uniqExact(commit_hash) AS commits,
    sum(lines_added) AS added,
    sum(lines_deleted) AS deleted
FROM git_analytics.file_changes
GROUP BY author
ORDER BY commits DESC
LIMIT 20;
```

### Files with Most Churn

```sql
SELECT
    path,
    count() AS change_count,
    sum(lines_added + lines_deleted) AS total_lines_changed
FROM git_analytics.file_changes
GROUP BY path
ORDER BY change_count DESC
LIMIT 20;
```

### Commit Activity by Day of Week

```sql
SELECT
    toDayOfWeek(time) AS day_of_week,
    count() AS commits
FROM git_analytics.commits
GROUP BY day_of_week
ORDER BY day_of_week;
```

### Recent Commits by Author

```sql
SELECT
    hash,
    author,
    time,
    message
FROM git_analytics.commits
WHERE time >= now() - INTERVAL 30 DAY
ORDER BY time DESC
LIMIT 50;
```

## Analyzing Multiple Repositories

Import multiple repositories into the same database with different table prefixes by running the tool separately and joining on author or timestamp.

## Re-importing After New Commits

Each run is a full snapshot — the tool has no incremental mode. To refresh the data, truncate the tables, re-run the import to regenerate the TSVs, and reload them:

```bash
clickhouse-client --database git_analytics --query "TRUNCATE TABLE commits"
clickhouse-client --database git_analytics --query "TRUNCATE TABLE file_changes"
clickhouse-client --database git_analytics --query "TRUNCATE TABLE line_changes"

clickhouse-git-import
# then re-run the INSERT ... FORMAT TSV commands above
```

## Summary

`clickhouse-git-import` turns any Git repository into a queryable ClickHouse dataset, enabling deep analytics on code history, contributor patterns, and file-level churn using standard SQL.
