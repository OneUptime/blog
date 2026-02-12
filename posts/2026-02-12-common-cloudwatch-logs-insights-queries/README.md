# How to Write Common CloudWatch Logs Insights Queries

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Logs Insights, Logging, Monitoring

Description: A collection of ready-to-use CloudWatch Logs Insights queries for common monitoring scenarios including error tracking, latency analysis, and traffic patterns.

---

CloudWatch Logs Insights is great, but writing queries from scratch every time you need to investigate something gets old fast. This post is a collection of battle-tested queries that cover the most common monitoring and debugging scenarios. Copy them, tweak them for your log format, and save them as favorites in the CloudWatch console.

If you're new to the query syntax, start with our [Logs Insights query syntax guide](https://oneuptime.com/blog/post/cloudwatch-logs-insights-query-syntax/view) first. This post assumes you know the basics and want practical, ready-to-use queries.

## Error Analysis Queries

### Find the most common errors

This is usually the first query you run when something's going wrong:

```
filter level = "ERROR"
| parse @message /(?<errorType>\w+Error|Exception): (?<errorMsg>[^\n]+)/
| stats count(*) as occurrences by errorType, errorMsg
| sort occurrences desc
| limit 25
```

### Error rate over time

Great for spotting when errors started spiking:

```
stats sum(level = "ERROR") as errors, count(*) as total,
      sum(level = "ERROR") / count(*) * 100 as errorRate
by bin(5m)
```

### Errors grouped by service and endpoint

When you need to know which part of your system is failing:

```
filter level = "ERROR"
| stats count(*) as errors by service, endpoint
| sort errors desc
| limit 20
```

### First occurrence of each error type

Useful for finding when a new error type first appeared:

```
filter level = "ERROR"
| parse @message /(?<errorType>\w+Error)/
| stats earliest(@timestamp) as firstSeen, latest(@timestamp) as lastSeen, count(*) as total by errorType
| sort firstSeen desc
```

## Latency Analysis Queries

### Latency percentiles by endpoint

The go-to query for understanding response time distribution:

```
filter ispresent(duration)
| stats pct(duration, 50) as p50,
        pct(duration, 90) as p90,
        pct(duration, 95) as p95,
        pct(duration, 99) as p99,
        max(duration) as maxLatency,
        count(*) as requests
by endpoint
| sort p99 desc
| limit 20
```

### Latency trend over time

Track how latency changes throughout the day:

```
filter ispresent(duration)
| stats avg(duration) as avgMs, pct(duration, 95) as p95Ms, pct(duration, 99) as p99Ms by bin(5m)
```

### Find the slowest individual requests

When you need to investigate specific slow requests:

```
filter ispresent(duration) and duration > 5000
| fields @timestamp, duration, endpoint, userId, requestId
| sort duration desc
| limit 50
```

### Latency by status code

Check if errors correlate with slow responses:

```
filter ispresent(duration)
| stats avg(duration) as avgMs, count(*) as count by statusCode
| sort statusCode asc
```

## Traffic Pattern Queries

### Requests per minute over time

Basic traffic volume visualization:

```
stats count(*) as requests by bin(1m)
```

### Top endpoints by traffic

Find out which endpoints get the most hits:

```
filter ispresent(endpoint)
| stats count(*) as requests, avg(duration) as avgLatency by endpoint
| sort requests desc
| limit 20
```

### Traffic by user agent

Useful for spotting bots or API client versions:

```
filter ispresent(userAgent)
| parse userAgent /^(?<client>[^\/\s]+)/
| stats count(*) as requests by client
| sort requests desc
| limit 20
```

### Unique users over time

Track how many distinct users are active:

```
filter ispresent(userId)
| stats count_distinct(userId) as uniqueUsers by bin(1h)
```

### Geographic traffic distribution

If your logs include country or region:

```
filter ispresent(country)
| stats count(*) as requests, avg(duration) as avgLatency by country
| sort requests desc
| limit 30
```

## Status Code Analysis

### HTTP status code breakdown

See the distribution of response codes:

```
stats count(*) as count by statusCode
| sort statusCode asc
```

### 5xx errors with details

When you need to dig into server errors:

```
filter statusCode >= 500
| fields @timestamp, statusCode, endpoint, errorMessage, requestId
| sort @timestamp desc
| limit 50
```

### Status code distribution over time

Visualize the mix of success vs error responses:

```
stats sum(statusCode >= 200 and statusCode < 300) as success2xx,
      sum(statusCode >= 300 and statusCode < 400) as redirect3xx,
      sum(statusCode >= 400 and statusCode < 500) as clientError4xx,
      sum(statusCode >= 500) as serverError5xx
by bin(5m)
```

## Authentication and Security Queries

### Failed login attempts

Track authentication failures:

```
filter event = "auth_failed" or event = "login_failed"
| stats count(*) as failures by sourceIp, username
| sort failures desc
| limit 20
```

### Unusual IP activity

Find IPs making an unusually high number of requests:

```
filter ispresent(sourceIp)
| stats count(*) as requests, count_distinct(endpoint) as uniqueEndpoints by sourceIp
| filter requests > 1000
| sort requests desc
| limit 20
```

### Access pattern anomalies

Spot users hitting unusual combinations of endpoints:

```
filter ispresent(userId)
| stats count(*) as requests, count_distinct(endpoint) as uniqueEndpoints, count_distinct(sourceIp) as uniqueIps by userId
| filter uniqueIps > 5
| sort uniqueIps desc
```

## Application-Specific Queries

### Queue depth monitoring

If your application logs queue metrics:

```
filter event = "queue_status"
| stats max(queueDepth) as maxDepth, avg(queueDepth) as avgDepth by bin(5m), queueName
```

### Database query performance

For apps that log database query times:

```
filter ispresent(queryTime) and queryTime > 100
| fields @timestamp, queryTime, queryType, tableName
| sort queryTime desc
| limit 30
```

### Cache hit rates

Track cache effectiveness:

```
filter ispresent(cacheResult)
| stats sum(cacheResult = "hit") as hits,
        sum(cacheResult = "miss") as misses,
        sum(cacheResult = "hit") / count(*) * 100 as hitRate
by bin(5m)
```

### Memory and resource usage

If your application logs resource metrics:

```
filter event = "resource_usage"
| stats avg(memoryUsedMB) as avgMemory, max(memoryUsedMB) as maxMemory, avg(cpuPercent) as avgCpu by bin(5m)
```

## Debugging Queries

### Trace a specific request

Follow a request through your system by request ID:

```
filter requestId = "req-abc123def456"
| fields @timestamp, service, level, @message
| sort @timestamp asc
```

### Find correlated events around an error

Get context before and after a specific error occurred:

```
filter @timestamp > "2026-02-12T10:00:00" and @timestamp < "2026-02-12T10:05:00"
| filter @logStream = "specific-log-stream-name"
| fields @timestamp, level, @message
| sort @timestamp asc
| limit 200
```

### Count log volume by log level

Understanding your log distribution helps with cost management:

```
stats count(*) as count by level
| sort count desc
```

### Find log lines exceeding a size threshold

Large log messages can drive up costs:

```
fields strlen(@message) as msgLength, @message
| filter msgLength > 5000
| sort msgLength desc
| limit 20
```

## Cost and Usage Queries

### Estimate log volume per log stream

Useful for identifying chatty services:

```
stats count(*) as events, sum(strlen(@message)) / 1048576 as estimatedMB by @logStream
| sort estimatedMB desc
| limit 20
```

### Identify log sources producing the most data

```
stats count(*) as eventCount by service
| sort eventCount desc
| limit 10
```

## Saving and Reusing Queries

You can save any query in the CloudWatch console by clicking "Save" above the query editor. Give it a descriptive name like "Error Rate by Service - 5min buckets" so you can find it quickly during an incident.

For programmatic access, you can start queries via the CLI:

```bash
# Run a Logs Insights query from the CLI
aws logs start-query \
  --log-group-name "/myapp/production/api" \
  --start-time $(date -d '1 hour ago' +%s) \
  --end-time $(date +%s) \
  --query-string 'filter level = "ERROR" | stats count(*) as errors by bin(5m)'
```

Then retrieve the results:

```bash
# Get the results of a running query
aws logs get-query-results --query-id "abc123-def456-ghi789"
```

## Wrapping Up

Having a library of ready-made queries saves precious time during incidents. Start with the error and latency queries, and build up your collection as you learn what questions you ask most often. For queries specific to Lambda, see our post on [querying Lambda logs](https://oneuptime.com/blog/post/query-lambda-logs-cloudwatch-logs-insights/view), and for VPC flow logs, check out [querying VPC Flow Logs](https://oneuptime.com/blog/post/query-vpc-flow-logs-cloudwatch-logs-insights/view).
