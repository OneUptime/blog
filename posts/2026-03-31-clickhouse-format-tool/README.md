# How to Use clickhouse-format for Query Formatting

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, SQL, Formatting, CLI, Developer Tool, Code Quality

Description: Use clickhouse-format to automatically format and pretty-print ClickHouse SQL queries for consistent code style in migrations, documentation, and code review.

---

## Introduction

`clickhouse-format` is a command-line tool included with ClickHouse that parses SQL queries and reformats them with consistent indentation, capitalization, and whitespace. It is useful for enforcing a consistent SQL style in migration files, code reviews, and documentation.

## Installation

`clickhouse-format` ships with the `clickhouse-client` package:

```bash
which clickhouse-format
# /usr/bin/clickhouse-format

# Or use the unified binary
clickhouse format --help
```

## Basic Formatting

Pipe SQL to stdin:

```bash
echo "select event_id,event_type,event_time from events where event_time>=today()-interval 7 day order by event_time desc limit 10" \
    | clickhouse-format
```

Output:

```sql
SELECT
    event_id,
    event_type,
    event_time
FROM events
WHERE event_time >= (today() - INTERVAL 7 DAY)
ORDER BY event_time DESC
LIMIT 10
```

## Formatting a Query File

```bash
clickhouse-format < /tmp/query.sql
```

Or using the `--query` flag:

```bash
clickhouse-format --query "select count() from events"
```

## Formatting Multiple Statements

```bash
cat /tmp/migrations.sql | clickhouse-format --multiquery
```

Input:

```sql
create table foo (id UInt64, ts DateTime) engine=MergeTree order by ts; insert into foo values (1, now()); drop table if exists foo;
```

Output:

```sql
CREATE TABLE foo
(
    id UInt64,
    ts DateTime
)
ENGINE = MergeTree
ORDER BY ts;

INSERT INTO foo
VALUES
    (1, now());

DROP TABLE IF EXISTS foo;
```

## Obfuscating Queries (Replacing Literals)

The `--obfuscate` flag replaces identifiers and literals with hash-derived dictionary words and similar-magnitude numbers, useful for sharing queries without exposing schema names or sensitive values:

```bash
echo "SELECT * FROM orders WHERE customer_email = 'alice@example.com' AND amount > 500.00" \
    | clickhouse-format --obfuscate
```

Output (words are chosen deterministically by hashing each token; exact values vary):

```sql
SELECT *
FROM nutmeg
WHERE (chive = 'parsley@oregano.basil') AND (thyme > 503.17)
```

Identifiers like `orders`, `customer_email`, and `amount` are each replaced with a noun from a built-in dictionary. String literals are tokenized on non-alphanumerics (so `@` and `.` are preserved) and each token is substituted independently. Numeric literals are perturbed while preserving their magnitude.

## Checking Syntax Validity

`clickhouse-format` exits with a non-zero code if the SQL is invalid:

```bash
echo "SELEC * FORM events" | clickhouse-format
# clickhouse-format: Exception: Syntax error

echo $?
# 1
```

Use this in CI pipelines to validate SQL files:

```bash
#!/bin/bash
set -e
for f in migrations/*.sql; do
    clickhouse-format --multiquery < "$f" > /dev/null
    echo "OK: $f"
done
```

## Formatting in a Pre-Commit Hook

Install a pre-commit hook to format all `.sql` files:

```bash
# .git/hooks/pre-commit
#!/bin/bash
set -e
for f in $(git diff --cached --name-only --diff-filter=ACM | grep '\.sql$'); do
    formatted=$(clickhouse-format --multiquery < "$f")
    echo "$formatted" > "$f"
    git add "$f"
done
```

## Integration with Editors

### Neovim / Vim

```vim
" Format the current SQL buffer with clickhouse-format
autocmd FileType sql nnoremap <leader>f :%!clickhouse-format<CR>
```

### VS Code

Use the `External Formatters` extension and point it at `clickhouse-format`:

```json
{
    "externalFormatters.languages": {
        "sql": {
            "command": "clickhouse-format"
        }
    }
}
```

## Formatting CREATE TABLE Statements

```bash
cat << 'EOF' | clickhouse-format
create table events(event_id UInt64,event_type LowCardinality(String),event_time DateTime,payload String) engine=MergeTree partition by toYYYYMM(event_time) order by (event_time,event_type) settings index_granularity=8192
EOF
```

Output:

```sql
CREATE TABLE events
(
    `event_id` UInt64,
    `event_type` LowCardinality(String),
    `event_time` DateTime,
    `payload` String
)
ENGINE = MergeTree
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, event_type)
SETTINGS index_granularity = 8192
```

## Using Hilite (Syntax Highlighting)

```bash
# Output with ANSI color codes for terminal display
echo "SELECT count() FROM events WHERE event_time >= today()" \
    | clickhouse-format --hilite
```

## Summary

`clickhouse-format` is a SQL formatter for ClickHouse that parses and pretty-prints SQL with consistent capitalization, indentation, and whitespace. Use it with `--multiquery` for files with multiple statements, `--obfuscate` to strip sensitive literals before logging, and `--hilite` for syntax-highlighted terminal output. Integrate it into CI pipelines to validate SQL syntax, and use it as an editor formatter to enforce a consistent SQL style across your team.
