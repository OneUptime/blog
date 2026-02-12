# How to Query Lambda Logs with CloudWatch Logs Insights

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, CloudWatch, Logs Insights, Serverless

Description: Learn how to write effective CloudWatch Logs Insights queries for Lambda functions, from basic debugging to advanced performance analysis and cold start tracking.

---

Lambda functions automatically send their logs to CloudWatch Logs. Every `console.log` in Node.js, every `print` in Python, every log statement in any runtime - it all ends up in a log group named `/aws/lambda/<function-name>`. On top of that, the Lambda runtime itself adds structured metadata like the `REPORT` line at the end of each invocation, which contains duration, billed duration, memory used, and whether it was a cold start.

This combination of application logs and runtime metadata makes Lambda logs incredibly rich for analysis with Logs Insights. Let's dig into the most useful queries.

## Understanding Lambda Log Structure

Each Lambda invocation produces several log lines in this order:

```
START RequestId: abc-123 Version: $LATEST
[Application log output goes here]
END RequestId: abc-123
REPORT RequestId: abc-123 Duration: 234.56 ms Billed Duration: 235 ms Memory Size: 256 MB Max Memory Used: 128 MB Init Duration: 543.21 ms
```

The `REPORT` line is the most valuable for performance analysis. The `Init Duration` field only appears on cold starts.

## Basic Lambda Queries

### Recent invocations with duration

Start here when you want a quick overview:

```
filter @type = "REPORT"
| fields @timestamp, @duration, @billedDuration, @memorySize, @maxMemoryUsed
| sort @timestamp desc
| limit 50
```

The `@type = "REPORT"` filter is a special built-in that catches Lambda REPORT lines. The `@duration`, `@billedDuration`, `@memorySize`, and `@maxMemoryUsed` fields are automatically extracted.

### Recent errors

Find which invocations threw errors:

```
filter @message like /ERROR|Error|error/ or @message like /Task timed out/
| fields @timestamp, @requestId, @message
| sort @timestamp desc
| limit 30
```

### Invocations by request ID

Trace a specific invocation:

```
filter @requestId = "abc123-def456-ghi789"
| fields @timestamp, @message
| sort @timestamp asc
```

## Cold Start Analysis

Cold starts are one of the most common Lambda performance concerns. Here's how to analyze them.

### Count cold starts vs warm starts

```
filter @type = "REPORT"
| stats sum(ispresent(@initDuration)) as coldStarts,
        sum(not ispresent(@initDuration)) as warmStarts,
        sum(ispresent(@initDuration)) / count(*) * 100 as coldStartPercent
```

### Cold start duration over time

```
filter @type = "REPORT" and ispresent(@initDuration)
| stats avg(@initDuration) as avgInit, max(@initDuration) as maxInit, count(*) as coldStarts by bin(15m)
```

### Cold start impact by memory configuration

If you're testing different memory sizes:

```
filter @type = "REPORT" and ispresent(@initDuration)
| stats avg(@initDuration) as avgInit, avg(@duration) as avgDuration, count(*) as invocations by @memorySize
| sort @memorySize asc
```

### Identify the worst cold starts

```
filter @type = "REPORT" and ispresent(@initDuration)
| fields @timestamp, @initDuration, @duration, @memorySize, @maxMemoryUsed, @requestId
| sort @initDuration desc
| limit 20
```

## Performance Analysis

### Duration percentiles

Get a clear picture of your function's performance profile:

```
filter @type = "REPORT"
| stats pct(@duration, 50) as p50,
        pct(@duration, 90) as p90,
        pct(@duration, 95) as p95,
        pct(@duration, 99) as p99,
        max(@duration) as maxDuration,
        count(*) as invocations
```

### Duration trend over time

Track performance changes after deployments:

```
filter @type = "REPORT"
| stats avg(@duration) as avgMs, pct(@duration, 95) as p95Ms, pct(@duration, 99) as p99Ms by bin(5m)
```

### Memory utilization

Find out if you've over-provisioned or under-provisioned memory:

```
filter @type = "REPORT"
| stats avg(@maxMemoryUsed / @memorySize * 100) as avgMemoryUtilPct,
        max(@maxMemoryUsed / @memorySize * 100) as maxMemoryUtilPct,
        avg(@maxMemoryUsed) as avgMemoryUsedMB,
        max(@maxMemoryUsed) as maxMemoryUsedMB
```

If `maxMemoryUtilPct` is consistently above 80%, consider increasing memory. If it's below 30%, you might be over-provisioned (and paying more than necessary, since Lambda billing is tied to memory allocation).

### Cost estimation

Estimate your Lambda costs from the REPORT data:

```
filter @type = "REPORT"
| stats sum(@billedDuration) / 1000 as totalBilledSeconds,
        count(*) as invocations,
        avg(@billedDuration) as avgBilledMs
```

To get a dollar estimate, multiply `totalBilledSeconds` by the per-GB-second price for your memory configuration.

## Error and Timeout Analysis

### Timeout detection

Lambda timeouts show up as a specific message:

```
filter @message like /Task timed out after/
| parse @message "Task timed out after * seconds" as timeoutDuration
| fields @timestamp, @requestId, timeoutDuration
| sort @timestamp desc
| limit 20
```

### Out of memory errors

```
filter @message like /Runtime.OutOfMemory/ or @message like /JavaScript heap out of memory/ or @message like /MemoryError/
| fields @timestamp, @requestId, @message
| sort @timestamp desc
| limit 20
```

### Unhandled exceptions

```
filter @message like /Runtime.UnhandledPromiseRejection/ or @message like /Runtime.HandlerNotFound/ or @message like /Traceback/
| fields @timestamp, @requestId, @message
| sort @timestamp desc
| limit 20
```

### Error rate over time

```
filter @type = "REPORT"
| stats sum(@message like /Error/) as errors, count(*) as total,
        sum(@message like /Error/) / count(*) * 100 as errorRate by bin(5m)
```

## Application-Level Queries

These queries work with your application's log output, not just the Lambda runtime metadata.

### Parse structured JSON application logs

If your Lambda logs JSON:

```
filter @message like /^\{/
| parse @message '{"level":"*","service":"*","msg":"*"' as level, service, msg
| filter level = "error"
| stats count(*) as errors by msg
| sort errors desc
| limit 20
```

Or if CloudWatch auto-discovers your JSON fields:

```
filter level = "error"
| stats count(*) as errors by errorType, endpoint
| sort errors desc
```

### API Gateway integration logs

When Lambda is behind API Gateway:

```
filter ispresent(httpMethod)
| stats count(*) as requests, avg(duration) as avgLatency by httpMethod, path
| sort requests desc
```

### SQS-triggered Lambda analysis

For Lambda processing SQS messages:

```
filter @message like /Records/
| parse @message '"messageId":"*"' as messageId
| fields @timestamp, @requestId, messageId, @duration
| sort @timestamp desc
| limit 30
```

## Multi-Function Queries

You can query multiple Lambda log groups at once. In the Logs Insights console, select multiple log groups, then run queries across them:

```
# Compare performance across Lambda functions (select multiple log groups)
filter @type = "REPORT"
| stats avg(@duration) as avgDuration,
        pct(@duration, 99) as p99Duration,
        count(*) as invocations
by @logStream
| sort avgDuration desc
```

## Provisioned Concurrency Monitoring

If you use provisioned concurrency to eliminate cold starts:

```
filter @type = "REPORT"
| stats sum(ispresent(@initDuration)) as coldStarts, count(*) as total by bin(15m)
```

If `coldStarts` is consistently 0, your provisioned concurrency is sufficient. If you're seeing cold starts, you may need to increase it.

## Creating Dashboards from Lambda Queries

You can add any Logs Insights query directly to a CloudWatch dashboard. In the dashboard editor, add a "Logs table" or "Logs" widget and paste your query. This is great for a Lambda operations dashboard. See our [dashboard creation guide](https://oneuptime.com/blog/post/create-cloudwatch-dashboards-application-monitoring/view) for more details.

## Wrapping Up

Lambda logs in CloudWatch are rich with performance and operational data. The `REPORT` line alone gives you duration, memory, billing, and cold start information. Combined with your application's own log output, Logs Insights queries let you build a comprehensive picture of your Lambda function's behavior. Start with the basic duration and error queries, then build up to cold start analysis and cost estimation as your needs grow. For more query patterns applicable to any AWS service, check out our [common Logs Insights queries](https://oneuptime.com/blog/post/common-cloudwatch-logs-insights-queries/view) post.
