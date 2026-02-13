# How to Use CloudWatch Logs Insights Query Syntax

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Logging, Logs Insights, Observability

Description: A comprehensive reference for CloudWatch Logs Insights query syntax covering fields, filters, stats, parsing, sorting, and advanced techniques.

---

CloudWatch Logs Insights is AWS's query language for searching and analyzing log data. If you've used SQL before, you'll find the syntax familiar - it's a pipeline of commands that filter, parse, aggregate, and sort your log data. But unlike SQL, it's designed specifically for log analysis, with built-in support for extracting fields from unstructured text, computing statistics, and visualizing results.

This post is a complete reference for the query syntax. We'll go through every command, show practical examples, and cover the gotchas that aren't obvious from the documentation.

## Query Structure

Every Logs Insights query is a pipeline of commands separated by the pipe (`|`) character. Data flows from left to right through each command:

```
fields @timestamp, @message
| filter @message like /ERROR/
| sort @timestamp desc
| limit 20
```

The available commands are:

- `fields` - select which fields to display
- `filter` - keep only events matching a condition
- `stats` - aggregate data with functions like count, sum, avg
- `sort` - order results
- `limit` - cap the number of results
- `parse` - extract fields from unstructured text
- `display` - choose final output fields (like fields but at the end)

## The fields Command

`fields` selects which fields to show in results. Every log event has these built-in fields:

- `@timestamp` - when the event was logged
- `@message` - the full log message
- `@logStream` - the log stream name
- `@log` - the log group and stream combined
- `@ingestionTime` - when CloudWatch received the event

For JSON-formatted logs, CloudWatch automatically discovers fields. If your log line is `{"level": "ERROR", "service": "api", "duration": 234}`, you can reference `level`, `service`, and `duration` directly:

```
fields @timestamp, level, service, duration
| limit 20
```

You can also rename fields with `as`:

```
fields @timestamp, duration as responseTimeMs, service as svc
| limit 20
```

## The filter Command

`filter` keeps only events that match a condition. It supports comparison operators, string matching, regex, and logical combinations.

Basic comparisons:

```
# Exact equality
filter level = "ERROR"

# Numeric comparisons
filter duration > 1000
filter statusCode >= 400 and statusCode < 500

# Not equal
filter level != "DEBUG"
```

String matching with `like` and `not like`:

```
# Contains a substring (case-sensitive)
filter @message like "timeout"

# Regex matching (enclosed in forward slashes)
filter @message like /ERROR|WARN/

# Case-insensitive regex
filter @message like /(?i)error/

# Not matching
filter @message not like "healthcheck"
```

Combining conditions:

```
# AND conditions
filter level = "ERROR" and service = "payment-api"

# OR conditions
filter statusCode = 500 or statusCode = 502 or statusCode = 503

# Complex combinations with parentheses
filter (level = "ERROR" or level = "WARN") and service = "payment-api"

# Check if a field exists
filter ispresent(errorMessage)

# Check if a field is a specific type
filter isValidIp(sourceIp)
```

## The parse Command

`parse` extracts fields from unstructured or semi-structured log text. This is incredibly useful when your logs aren't JSON.

### Glob-style parsing

Use `*` as a wildcard to capture text between literal strings:

```
# Parse Apache-style access logs
parse @message '* - - [*] "* * *" * *' as ip, timestamp, method, path, protocol, statusCode, bytes

# Parse a custom log format
parse @message 'level=* msg="*" duration=*ms' as level, message, duration

# Use the parsed fields in subsequent commands
parse @message 'level=* msg="*" duration=*ms' as level, message, duration
| filter level = "ERROR"
| stats avg(duration) as avgDuration by message
```

### Regex-style parsing

For more complex patterns, use regex with named capture groups:

```
# Regex parsing with named groups
parse @message /level=(?<level>\w+) msg="(?<msg>[^"]+)" duration=(?<dur>\d+)/

# Parse IP addresses and request info
parse @message /(?<clientIp>\d+\.\d+\.\d+\.\d+) .* "(?<method>\w+) (?<path>[^\s]+)/
| stats count(*) by path
| sort count(*) desc
```

## The stats Command

`stats` aggregates data and is where the real analytical power lives. You can compute counts, sums, averages, percentiles, and more.

Available aggregate functions:

```
# Count events
stats count(*) as totalEvents

# Count by a field value
stats count(*) as count by level
| sort count desc

# Sum a numeric field
stats sum(bytesTransferred) as totalBytes by endpoint

# Average, min, max
stats avg(duration) as avgDuration, min(duration) as minDuration, max(duration) as maxDuration

# Percentiles - incredibly useful for latency analysis
stats pct(duration, 50) as p50, pct(duration, 95) as p95, pct(duration, 99) as p99

# Count distinct values
stats count_distinct(userId) as uniqueUsers

# Time-bucketed aggregation (creates timeline charts)
stats count(*) as errorCount by bin(5m)
| filter level = "ERROR"
```

The `bin()` function is especially powerful for creating time-series visualizations:

```
# Errors per 5-minute window, broken down by service
filter level = "ERROR"
| stats count(*) as errors by bin(5m), service

# Average latency per minute
stats avg(duration) as avgLatency by bin(1m)
```

## The sort Command

`sort` orders results ascending or descending:

```
# Sort by timestamp, newest first
sort @timestamp desc

# Sort by a computed field
stats count(*) as errorCount by service
| sort errorCount desc

# Multiple sort keys
sort level asc, @timestamp desc
```

## The limit Command

`limit` caps the number of results returned. The default is 1000, and the maximum is 10000:

```
# Show only the top 10
stats count(*) as count by endpoint
| sort count desc
| limit 10
```

## The display Command

`display` selects which fields appear in the final output. It's like `fields` but applied at the end of the pipeline:

```
fields @timestamp, @message
| parse @message 'duration=*ms' as duration
| filter duration > 1000
| display @timestamp, duration, @message
| sort duration desc
| limit 20
```

## Built-in Functions

Logs Insights provides several useful functions:

```
# String functions
filter strlen(@message) > 500
fields replace(@message, "password=***", "password=[REDACTED]") as sanitized

# Math functions
fields ceil(duration / 1000) as durationSeconds
fields abs(offset) as absoluteOffset

# Date/time functions
fields datefloor(@timestamp, 1h) as hourBucket
fields fromMillis(@timestamp) as readableTime

# IP functions
filter isValidIpv4(sourceIp)

# Coalesce (first non-null value)
fields coalesce(userId, "anonymous") as user
```

## Practical Examples

Here are some queries you'll find yourself using regularly:

Find the most recent errors:

```
filter level = "ERROR"
| fields @timestamp, @message
| sort @timestamp desc
| limit 20
```

Compute error rate over time:

```
stats sum(level = "ERROR") / count(*) * 100 as errorRate by bin(5m)
```

Find the slowest endpoints:

```
filter ispresent(duration)
| stats avg(duration) as avg, pct(duration, 99) as p99, count(*) as requests by endpoint
| sort p99 desc
| limit 10
```

Analyze error patterns:

```
filter level = "ERROR"
| parse @message /(?<errorType>\w+Error): (?<errorMsg>.+)/
| stats count(*) as occurrences by errorType, errorMsg
| sort occurrences desc
| limit 20
```

Track unique users per hour:

```
stats count_distinct(userId) as uniqueUsers by bin(1h)
```

## Query Limits and Performance

A few things to keep in mind for performance. Queries scan up to 10,000 log groups, and the maximum query runtime is 60 minutes. Results are capped at 10,000 rows. For large datasets, narrower time ranges and specific log groups improve performance significantly.

Also, `filter` commands should come as early as possible in your pipeline to reduce the data processed by subsequent commands. A query with `filter` first and `stats` second is much faster than the reverse.

## Wrapping Up

CloudWatch Logs Insights is a powerful query language that lets you go far beyond simple text search. The pipeline syntax makes it easy to build up complex analyses step by step. For more real-world query examples, check out our posts on [common Logs Insights queries](https://oneuptime.com/blog/post/2026-02-12-common-cloudwatch-logs-insights-queries/view) and [querying Lambda logs](https://oneuptime.com/blog/post/2026-02-12-query-lambda-logs-cloudwatch-logs-insights/view).
