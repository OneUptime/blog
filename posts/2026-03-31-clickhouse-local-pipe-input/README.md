# How to Use clickhouse-local with Pipe Input

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, clickhouse-local, Pipe, Stdin, Shell

Description: Learn how to pipe data into clickhouse-local from stdin to run SQL queries on command output, log streams, and shell pipeline results.

---

## Piping Data into clickhouse-local

`clickhouse-local` reads from stdin when no file is specified in the query, enabling you to compose it with other Unix tools via pipes. This makes it a powerful addition to shell pipelines for filtering, aggregating, and transforming streaming data.

## Basic Pipe from a File

```bash
cat access.log | clickhouse local \
  --query "SELECT count() FROM table" \
  --input-format LineAsString \
  --structure "line String"
```

## Parsing Nginx Access Logs

```bash
cat /var/log/nginx/access.log | clickhouse local \
  --query "
  SELECT
      extractAllGroups(line, '(\\d+\\.\\d+\\.\\d+\\.\\d+)')[1][1] AS ip,
      count() AS requests
  FROM table
  GROUP BY ip
  ORDER BY requests DESC
  LIMIT 10
  " \
  --input-format LineAsString \
  --structure "line String"
```

## Piping JSON from an API

```bash
curl -s 'https://api.example.com/events' | clickhouse local \
  --query "SELECT event_type, count() FROM table GROUP BY event_type" \
  --input-format JSONEachRow
```

## Piping CSV from Another Tool

```bash
psql -c "COPY orders TO STDOUT CSV HEADER" | clickhouse local \
  --query "
  SELECT
      customer_id,
      sum(amount) AS total
  FROM table
  GROUP BY customer_id
  ORDER BY total DESC
  LIMIT 20
  " \
  --input-format CSVWithNames
```

## Using --input-format and --format Together

Convert from one format to another while processing:

```bash
cat data.csv | clickhouse local \
  --query "SELECT id, upper(name) AS name, price * 1.1 AS price_with_tax FROM table" \
  --input-format CSVWithNames \
  --format JSONEachRow > output.ndjson
```

## Filtering Log Lines with SQL

```bash
journalctl -u myapp --since "1 hour ago" --output=json | clickhouse local \
  --query "
  SELECT
      toStartOfMinute(toDateTime(toUInt64(__REALTIME_TIMESTAMP) / 1000000)) AS minute,
      count() AS log_lines,
      countIf(PRIORITY = '3') AS errors
  FROM table
  GROUP BY minute
  ORDER BY minute
  " \
  --input-format JSONEachRow
```

## Counting Words in a Text File

```bash
cat book.txt | tr ' ' '\n' | clickhouse local \
  --query "
  SELECT word, count() AS frequency
  FROM table
  WHERE length(word) > 3
  GROUP BY word
  ORDER BY frequency DESC
  LIMIT 20
  " \
  --input-format LineAsString \
  --structure "word String"
```

## Combining with watch for Live Monitoring

```bash
watch -n 5 'tail -n 1000 /var/log/app.log | clickhouse local \
  --query "SELECT level, count() FROM table GROUP BY level" \
  --input-format JSONEachRow \
  --format PrettyCompact'
```

## Summary

`clickhouse-local` integrates into Unix pipelines by reading from stdin with `--input-format` and the implicit `table` name. This makes it a powerful shell companion for parsing logs, filtering API responses, and transforming data streams without temporary files.
