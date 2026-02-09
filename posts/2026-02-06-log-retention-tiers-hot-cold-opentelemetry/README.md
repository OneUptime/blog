# How to Configure Log Retention Tiers (Hot Storage for 3 Days, Cold for 90 Days) with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Log Retention, Storage Tiers, Cost Optimization

Description: Set up tiered log retention with hot and cold storage using the OpenTelemetry Collector to balance cost and accessibility.

Storing every log line in fast, queryable storage for months is expensive. Most organizations find that they need quick access to recent logs (the last few days) for active debugging, while older logs are only needed occasionally for audits or historical investigations. The solution is tiered storage: hot storage for recent data with fast queries, and cold storage for older data at a fraction of the cost.

The OpenTelemetry Collector can route logs to different backends based on your retention needs, all from a single pipeline. Here is how to set it up.

## The Storage Tier Model

For this guide, we will use two tiers:

- **Hot tier (3 days)**: Fast, indexed storage. Expensive per GB but supports instant queries. Think Elasticsearch, ClickHouse, or a managed observability platform.
- **Cold tier (90 days)**: Object storage like S3 or GCS. Cheap per GB but requires extra steps to query. Good for compliance and occasional deep dives.

The OpenTelemetry Collector sends logs to both tiers simultaneously. The hot tier handles its own retention (auto-delete after 3 days), and the cold tier keeps data for 90 days.

## Collector Configuration

The key idea is to use multiple exporters in a single logs pipeline, or to use separate pipelines with different processing:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch/hot:
    # Smaller batches for low-latency hot storage
    timeout: 2s
    send_batch_size: 512

  batch/cold:
    # Larger batches for efficient cold storage writes
    timeout: 30s
    send_batch_size: 8192

  # Strip verbose attributes before sending to cold storage
  # to reduce storage size
  transform/cold:
    log_statements:
      - context: log
        statements:
          # Remove high-cardinality attributes not needed in cold storage
          - delete_key(attributes, "http.user_agent")
          - delete_key(attributes, "http.request.header.cookie")
          # Keep the essentials: timestamp, severity, body, service info

exporters:
  # Hot tier: your fast, indexed log backend
  otlp/hot:
    endpoint: "https://hot-logs.example.com:4317"
    tls:
      insecure: false
    headers:
      # Retention hint for backends that support it
      X-Retention-Days: "3"

  # Cold tier: S3-compatible object storage via the AWS S3 exporter
  awss3:
    s3uploader:
      region: "us-east-1"
      s3_bucket: "company-logs-cold-tier"
      s3_prefix: "logs"
      # Partition by date for easy lifecycle management
      s3_partition: "year=%Y/month=%m/day=%d/hour=%H"
      file_prefix: "otel-logs"
    marshaler: otlp_json

service:
  pipelines:
    # Hot pipeline: fast processing, small batches
    logs/hot:
      receivers: [otlp]
      processors: [batch/hot]
      exporters: [otlp/hot]
    # Cold pipeline: strip unnecessary data, large batches
    logs/cold:
      receivers: [otlp]
      processors: [transform/cold, batch/cold]
      exporters: [awss3]
```

## Setting Up S3 Lifecycle Rules

The cold tier relies on S3 lifecycle policies to enforce the 90-day retention. Create a lifecycle rule on your bucket:

```json
{
  "Rules": [
    {
      "ID": "delete-logs-after-90-days",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Expiration": {
        "Days": 90
      }
    },
    {
      "ID": "move-to-glacier-after-30-days",
      "Status": "Enabled",
      "Filter": {
        "Prefix": "logs/"
      },
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "GLACIER"
        }
      ]
    }
  ]
}
```

Apply it with:

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket company-logs-cold-tier \
  --lifecycle-configuration file://lifecycle.json
```

This gives you three effective tiers: hot storage for 3 days, standard S3 for 30 days, and Glacier for the remaining 60 days.

## Hot Tier Retention Configuration

For the hot tier, configure your backend to auto-expire data. In Elasticsearch, use Index Lifecycle Management (ILM):

```json
{
  "policy": {
    "phases": {
      "hot": {
        "actions": {
          "rollover": {
            "max_age": "1d",
            "max_size": "50gb"
          }
        }
      },
      "delete": {
        "min_age": "3d",
        "actions": {
          "delete": {}
        }
      }
    }
  }
}
```

If you are using ClickHouse, set a TTL on your logs table:

```sql
ALTER TABLE otel_logs
  MODIFY TTL toDateTime(Timestamp) + INTERVAL 3 DAY;
```

## Selective Cold Storage

Not all logs deserve 90 days of retention. Debug logs are rarely useful after a few hours. You can add filtering to the cold pipeline to skip low-value logs:

```yaml
processors:
  filter/cold:
    logs:
      # Only send WARN and above to cold storage
      log_record:
        - 'severity_number < 13'

service:
  pipelines:
    logs/cold:
      receivers: [otlp]
      processors: [filter/cold, transform/cold, batch/cold]
      exporters: [awss3]
```

The `filter` processor with `severity_number < 13` drops anything below WARN (INFO, DEBUG, TRACE) from the cold pipeline. Those logs still go to hot storage for short-term debugging but do not consume long-term storage.

## Cost Analysis

To put this in perspective, here is a rough comparison for 1 TB of daily log volume:

- All logs in hot storage for 90 days: roughly $15,000 to $25,000/month (depending on the backend)
- Hot storage for 3 days + S3 Standard for 30 days + Glacier for 60 days: roughly $2,500 to $4,000/month

The savings come from the massive cost difference between indexed, queryable storage and raw object storage. S3 Standard costs about $0.023/GB/month, and Glacier costs about $0.004/GB/month.

## Querying Cold Storage

When you need to access cold-tier logs, you have several options. For S3 data in OTLP JSON format, you can use tools like Athena or Spark to query the data directly. The date-partitioned prefix structure (`year=2026/month=02/day=06/`) makes it efficient to scan only the time range you need.

For Glacier data, you will need to initiate a restore first, which takes a few hours for standard retrieval.

## Wrapping Up

Tiered log retention is one of the most effective ways to reduce observability costs without sacrificing capability. The OpenTelemetry Collector makes it straightforward to split your log stream into multiple destinations with different retention policies. Start with two tiers (hot and cold), and refine from there based on your actual query patterns and compliance requirements.
