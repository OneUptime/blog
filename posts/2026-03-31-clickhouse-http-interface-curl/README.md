# How to Use ClickHouse HTTP Interface with cURL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, HTTP Interface, curl, REST API, Query Execution

Description: Learn how to query ClickHouse over HTTP using cURL, including authentication, output formats, and inserting data via POST requests.

---

The ClickHouse HTTP interface listens on port 8123 by default and accepts SQL queries as plain text over GET or POST requests. This makes it easy to interact with ClickHouse from any language or tool that speaks HTTP, with no special client library required.

## Basic GET Query

The simplest way to run a query is to pass it as a URL parameter:

```bash
curl "http://localhost:8123/?query=SELECT%201"
```

For longer queries, use POST to avoid URL length limits:

```bash
curl -X POST "http://localhost:8123/" \
  --data-binary "SELECT version()"
```

## Authentication

Pass credentials via URL parameters or HTTP Basic Auth:

```bash
# URL parameters
curl "http://localhost:8123/?user=default&password=secret&query=SELECT+1"

# Basic Auth header
curl -u default:secret "http://localhost:8123/?query=SELECT+1"
```

## Choosing Output Format

ClickHouse supports many output formats. Use the `FORMAT` clause or `default_format` parameter:

```bash
# JSON output
curl -u default:secret "http://localhost:8123/" \
  --data-binary "SELECT number, number * 2 AS doubled FROM numbers(5) FORMAT JSON"

# TSV output
curl -u default:secret "http://localhost:8123/" \
  --data-binary "SELECT number FROM numbers(5) FORMAT TSV"

# CSV output
curl -u default:secret "http://localhost:8123/" \
  --data-binary "SELECT number FROM numbers(5) FORMAT CSV"
```

## Inserting Data

Use POST to insert data. For CSV, pass the format in the URL:

```bash
# Insert CSV rows
curl -u default:secret \
  "http://localhost:8123/?query=INSERT+INTO+events+FORMAT+CSV" \
  --data-binary $'1,2024-01-01,pageview\n2,2024-01-02,click\n'

# Insert JSONEachRow
curl -u default:secret \
  "http://localhost:8123/?query=INSERT+INTO+events+FORMAT+JSONEachRow" \
  --data-binary '{"id":3,"date":"2024-01-03","type":"purchase"}
{"id":4,"date":"2024-01-04","type":"pageview"}'
```

## Checking Server Health

The `/ping` endpoint returns `Ok.` when the server is healthy - ideal for load balancer health checks:

```bash
curl "http://localhost:8123/ping"
```

## Using Database Context

Specify a database with the `database` parameter:

```bash
curl -u default:secret \
  "http://localhost:8123/?database=mydb&query=SHOW+TABLES"
```

## Compression

Enable HTTP compression to reduce bandwidth for large result sets. You must set `enable_http_compression=1` in the URL parameters in addition to the `Accept-Encoding` header:

```bash
curl -u default:secret \
  -H "Accept-Encoding: gzip" \
  "http://localhost:8123/?enable_http_compression=1&query=SELECT+*+FROM+large_table+FORMAT+CSV" \
  --output result.csv.gz
```

## Query Parameters

You can pass named parameters using `param_` prefix:

```bash
curl -u default:secret \
  "http://localhost:8123/?param_event_type=pageview" \
  --data-binary "SELECT count() FROM events WHERE type = {event_type:String}"
```

## Summary

The ClickHouse HTTP interface with cURL is a practical way to run queries, insert data, and automate tasks in shell scripts. Use POST for complex queries, JSON or CSV formats for data exchange, `/ping` for health checks, and `param_` prefixed URL parameters for safe parameterized queries.
