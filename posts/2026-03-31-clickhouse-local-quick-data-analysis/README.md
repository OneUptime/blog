# How to Use clickhouse-local for Quick Data Analysis

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-local, Data Analysis, CLI, SQL

Description: Learn how to use clickhouse-local to run SQL queries on local files without a server, enabling fast ad-hoc data analysis from the command line.

---

## What is clickhouse-local?

`clickhouse-local` is a standalone tool that runs the ClickHouse query engine entirely on your local machine without a server. It reads data from files or stdin, executes SQL, and writes results to stdout or a file. It is ideal for quick data exploration, ETL scripting, and log analysis.

## Installation

```bash
curl https://clickhouse.com/ | sh
./clickhouse local --version
```

On macOS with Homebrew:

```bash
brew install --cask clickhouse
clickhouse local --version
```

## Running a Simple Query on a File

Query a CSV file directly:

```bash
clickhouse local \
  --query "SELECT count(), avg(price) FROM file('sales.csv', CSV, 'date Date, product String, price Float64')"
```

## Using Auto-Detected Schema

Let ClickHouse infer the schema with `CSVWithNames`:

```bash
clickhouse local \
  --query "SELECT * FROM file('sales.csv', CSVWithNames) LIMIT 5"
```

## Interactive Mode

Start an interactive SQL shell by running `clickhouse local` without a `--query` argument:

```bash
clickhouse local
```

Then:

```sql
SELECT toYear(date) AS year, sum(price) AS revenue
FROM file('/tmp/sales.csv', CSVWithNames)
GROUP BY year
ORDER BY year;
```

## Reading Multiple Files

Use glob patterns to query multiple files at once:

```bash
clickhouse local \
  --query "SELECT count() FROM file('/var/log/nginx/access-*.log', LineAsString)"
```

## Output Formatting

Control output format with `--format`:

```bash
# JSON output
clickhouse local \
  --query "SELECT product, sum(price) AS total FROM file('sales.csv', CSVWithNames) GROUP BY product" \
  --format JSONEachRow

# Pretty table output
clickhouse local \
  --query "SELECT * FROM file('sales.csv', CSVWithNames) LIMIT 10" \
  --format PrettyCompact
```

## Writing Results to a File

```bash
clickhouse local \
  --query "SELECT product, sum(price) AS revenue FROM file('sales.csv', CSVWithNames) GROUP BY product ORDER BY revenue DESC" \
  --format CSV > revenue_report.csv
```

## Using stdin as Input

Pipe data directly:

```bash
cat access.log | clickhouse local \
  --query "SELECT extractAll(line, '\"[A-Z]+ ([^ ]+)')[1] AS url, count() AS hits FROM table GROUP BY url ORDER BY hits DESC LIMIT 10" \
  --format PrettyCompact \
  --structure "line String" \
  --input-format LineAsString
```

## Summary

`clickhouse-local` brings the full power of ClickHouse SQL to local files without running a server. It supports CSV, JSON, Parquet, and dozens of other formats with auto-schema detection, making it indispensable for quick data analysis and scripting workflows.
