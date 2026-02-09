# How to Deduplicate Redundant Log Lines Using the OpenTelemetry Log Dedup Processor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Log Processing, Deduplication, Collector

Description: Reduce log noise and storage costs by deduplicating repeated log lines with the OpenTelemetry dedup processor.

If you have ever looked at your log storage bill and wondered why it is so high, the answer is probably duplicate logs. Applications love to repeat themselves. A failed database connection retry might produce the same error message 500 times in a minute. A health check endpoint might log an identical line every second. These duplicates add no value, but they cost you real money in storage and make it harder to find the logs that actually matter.

The OpenTelemetry Collector's log dedup processor solves this by collapsing repeated log lines into a single record with a count, reducing volume without losing information.

## How the Dedup Processor Works

The processor maintains a time window and groups log records by their content. When multiple logs with the same body and attributes arrive within the window, it emits a single log record with an additional attribute indicating how many duplicates were seen.

Think of it as `uniq -c` for your log stream, but running in real time inside the collector.

## Installation

The dedup processor is available in the OpenTelemetry Collector Contrib distribution. If you are building a custom collector, add it to your builder config:

```yaml
# builder-config.yaml
processors:
  - gomod: github.com/open-telemetry/opentelemetry-collector-contrib/processor/logdedupprocessor v0.96.0
```

## Basic Configuration

Here is a straightforward setup that deduplicates logs within a 10-second window:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  logdedup:
    # Time window for grouping duplicates
    interval: 10s
    # Which log fields to use for determining duplicates
    log_count_attribute: log_count
    # Timezone for the interval calculation
    timezone: UTC

  batch:
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://your-backend.example.com:4317"

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [logdedup, batch]
      exporters: [otlp]
```

With this config, if the same log body appears 200 times within a 10-second window, the collector emits one log record with `log_count: 200` as an attribute.

## Controlling What Counts as a Duplicate

By default, the dedup processor considers the entire log body when determining duplicates. Two logs are duplicates if their bodies match exactly. But sometimes you want more control. For example, logs might have the same message but different timestamps embedded in the body.

You can configure which fields to exclude from the comparison:

```yaml
processors:
  logdedup:
    interval: 10s
    log_count_attribute: log_count
    # Define which conditions identify a log as a duplicate
    exclude_fields:
      - timestamp
      - observed_timestamp
```

This tells the processor to ignore timestamp differences when comparing logs.

## Combining with the Transform Processor

For more complex deduplication logic, you can normalize your logs before they hit the dedup processor. For instance, if your logs contain a request ID that makes every line unique, strip it out first:

```yaml
processors:
  # First, normalize the logs by removing unique-per-request fields
  transform/normalize:
    log_statements:
      - context: log
        statements:
          # Remove the request ID before dedup comparison
          - delete_key(attributes, "request_id")
          # Normalize varying numeric values in the body
          - replace_pattern(body, "took [0-9]+ms", "took Xms")

  # Then deduplicate the normalized logs
  logdedup:
    interval: 15s
    log_count_attribute: duplicate_count

  batch:
    timeout: 5s

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [transform/normalize, logdedup, batch]
      exporters: [otlp]
```

The `replace_pattern` call is particularly useful. A log like `"Query completed, took 142ms"` and `"Query completed, took 287ms"` would normally be treated as different logs. By normalizing the timing value, they become duplicates and get collapsed.

## Real-World Impact

To give you a sense of the savings, here are some numbers from a production deployment I worked on:

- Before dedup: 2.4 million log records per hour
- After dedup (15-second window): 380,000 log records per hour
- Reduction: roughly 84%

The biggest contributors to duplication were health check logs, retry loops, and periodic status messages. The dedup processor collapsed all of these without losing any information, since the `duplicate_count` attribute preserved the original volume data.

## Preserving Important Details

One concern with deduplication is losing context. If 200 copies of an error have slightly different stack traces, you want to keep at least one full copy. The dedup processor handles this by emitting the first log record it sees in each window as the representative record. All the original attributes and body of that first record are preserved. Only the subsequent duplicates are collapsed into the count.

If you need to preserve the timestamps of individual occurrences, you can configure the processor to store them:

```yaml
processors:
  logdedup:
    interval: 10s
    log_count_attribute: log_count
    # Store the first and last timestamp of duplicates
    first_observed_timestamp_attribute: first_seen
    last_observed_timestamp_attribute: last_seen
```

This adds `first_seen` and `last_seen` attributes so you know the time range of the duplicated logs.

## When Not to Deduplicate

Deduplication is not always the right call. Audit logs, security events, and compliance-related logs should generally be left as-is. Every individual record matters in those contexts. You can handle this by running separate pipelines or by adding conditions to your transform processor that skip certain log sources.

## Wrapping Up

Log deduplication is one of the highest-impact optimizations you can make in your logging pipeline. The OpenTelemetry log dedup processor makes it easy to collapse redundant lines while preserving the information you need. Start with a conservative interval (5 to 10 seconds), monitor the reduction ratio, and adjust from there. Your storage bill will thank you.
