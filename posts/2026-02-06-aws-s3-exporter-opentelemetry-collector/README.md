# How to Configure the AWS S3 Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporter, AWS, S3, Observability, Telemetry

Description: Learn how to configure the AWS S3 exporter in the OpenTelemetry Collector to store traces, metrics, and logs in Amazon S3 for long-term retention and analysis.

The OpenTelemetry Collector provides a powerful way to collect, process, and export telemetry data. One valuable use case is exporting telemetry data to Amazon S3 for long-term storage, compliance requirements, or batch processing. The AWS S3 exporter enables you to persist traces, metrics, and logs directly to S3 buckets.

## Understanding the AWS S3 Exporter

The AWS S3 exporter is part of the OpenTelemetry Collector Contrib distribution. It writes telemetry data to Amazon S3 buckets in various formats, making it ideal for archival, compliance, and data lake scenarios. This exporter supports all three telemetry signals: traces, metrics, and logs.

The exporter writes each exported batch as a separate object in your S3 bucket. The object key includes the configured prefix, a time-based partition path, the signal name, and a unique suffix.

## Architecture Overview

Here's how the AWS S3 exporter fits into your observability pipeline:

```mermaid
graph LR
    A[Applications] -->|OTLP| B[OpenTelemetry Collector]
    B -->|Receivers| C[Processors]
    C -->|Transform| D[AWS S3 Exporter]
    D -->|Batch Upload| E[Amazon S3]
    E -->|Analysis| F[Athena/Glue]
    E -->|Archive| G[Glacier]
```

## Prerequisites

Before configuring the AWS S3 exporter, ensure you have:

- An AWS account with appropriate permissions
- An S3 bucket created for storing telemetry data
- AWS credentials configured (IAM role, access keys, or instance profile)
- OpenTelemetry Collector Contrib installed

## IAM Permissions Required

Your AWS credentials must have the following S3 permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::your-telemetry-bucket/*"
      ]
    }
  ]
}
```

## Basic Configuration

Here's a minimal configuration for the AWS S3 exporter:

```yaml
# OpenTelemetry Collector configuration for AWS S3 exporter

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    # Batch data before sending to S3 to optimize costs
    timeout: 10s
    send_batch_size: 1024

exporters:
  awss3:
    s3uploader:
      # AWS region where the bucket is located
      region: "us-east-1"

      # S3 bucket name for storing telemetry data
      s3_bucket: "my-telemetry-bucket"

      # S3 key prefix for organizing data
      s3_prefix: "otel-data"

      # Compression algorithm (none, gzip, or zstd)
      compression: "gzip"

    # Data marshaling format (otlp_json or otlp_proto)
    marshaler: "otlp_json"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [awss3]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [awss3]
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [awss3]
```

This configuration sets up three pipelines (traces, metrics, and logs) that receive OTLP data, batch it for efficiency, and export it to the specified S3 bucket.

## Advanced Configuration Options

For production environments, you'll want to customize additional parameters:

```yaml
exporters:
  awss3:
    s3uploader:
      s3_bucket: "production-telemetry-bucket"
      region: "us-west-2"
      s3_prefix: "telemetry"

      # Partition data by time for easier querying
      s3_partition_format: "year=%Y/month=%m/day=%d/hour=%H/minute=%M"
      s3_partition_timezone: "UTC"

      # Compression for stored objects
      compression: "gzip"

      # Use IAM role when the collector should assume a role
      role_arn: "arn:aws:iam::123456789012:role/OtelCollectorRole"

      # S3 storage class for cost optimization
      storage_class: "STANDARD_IA"

      # S3 client retry configuration
      retry_mode: "standard"
      retry_max_attempts: 5
      retry_max_backoff: 30s

    # File format for stored data
    marshaler: "otlp_json"

    # Timeout for S3 operations
    timeout: 30s

    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s
```

## Data Partitioning Strategies

Partitioning your data effectively is crucial for query performance and cost management. The S3 exporter supports time-based partitioning using `strftime` formatting:

```yaml
exporters:
  awss3:
    s3uploader:
      s3_bucket: "telemetry-data"
      region: "us-east-1"
      # Partition by prefix, date, and hour
      s3_prefix: "telemetry"
      s3_partition_format: "year=%Y/month=%m/day=%d/hour=%H"
      file_prefix: "collector-"
```

This creates a structure like:
```text
s3://telemetry-data/
└── telemetry/
    └── year=2026/
        └── month=02/
            └── day=06/
                └── hour=14/
                    ├── collector-traces_123456789.json.gz
                    ├── collector-metrics_123456789.json.gz
                    └── collector-logs_123456789.json.gz
```

## Marshaler and Compression Options

Choose the right marshaler and compression for your use case:

**Marshaler Options:**
- `otlp_json`: OpenTelemetry Protocol in JSON format (human-readable, good for ad-hoc analysis)
- `otlp_proto`: OpenTelemetry Protocol in Protocol Buffers format (compact, efficient)
- `sumo_ic`: Sumo Logic Installed Collector archive format for logs
- `body`: Log body as a string, for logs only

**Compression Options:**
- `none`: No compression (fastest, largest files)
- `gzip`: Good compression ratio, widely supported
- `zstd`: Better compression than gzip, faster decompression

For most use cases, `otlp_json` with `gzip` compression provides a good balance:

```yaml
exporters:
  awss3:
    marshaler: "otlp_json"
    s3uploader:
      region: "us-east-1"
      s3_bucket: "telemetry-data"
      compression: "gzip"
```

## Cost Optimization Strategies

Storing telemetry data in S3 can become expensive. Here are strategies to optimize costs:

**1. Use Appropriate Storage Classes:**

```yaml
exporters:
  awss3:
    s3uploader:
      region: "us-east-1"
      s3_bucket: "telemetry-data"
      storage_class: "INTELLIGENT_TIERING"  # Automatically moves data between access tiers
```

**2. Configure Lifecycle Policies:**

Set up S3 lifecycle policies to transition older data to cheaper storage:

```json
{
  "Rules": [
    {
      "Id": "TransitionOldTelemetry",
      "Status": "Enabled",
      "Transitions": [
        {
          "Days": 30,
          "StorageClass": "STANDARD_IA"
        },
        {
          "Days": 90,
          "StorageClass": "GLACIER"
        },
        {
          "Days": 365,
          "StorageClass": "DEEP_ARCHIVE"
        }
      ]
    }
  ]
}
```

**3. Enable Batching:**

Larger batches mean fewer S3 PUT requests, reducing costs:

```yaml
processors:
  batch:
    timeout: 60s
    send_batch_size: 8192
```

## Security Best Practices

Secure your telemetry data with these practices:

**1. Enable Encryption at Rest on the Bucket:**

Configure default server-side encryption on the S3 bucket, for example SSE-S3 or SSE-KMS. The exporter does not expose a separate `s3_encryption` configuration block.

**2. Use IAM Roles Instead of Access Keys:**

```yaml
exporters:
  awss3:
    s3uploader:
      region: "us-west-2"
      s3_bucket: "telemetry-data"
      role_arn: "arn:aws:iam::123456789012:role/OtelCollectorRole"
```

**3. Enable S3 Bucket Versioning:**

Protect against accidental deletions by enabling versioning on your bucket.

**4. Configure Bucket Policies:**

Restrict access to your telemetry bucket:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": [
        "arn:aws:s3:::telemetry-bucket/*"
      ],
      "Condition": {
        "Bool": {
          "aws:SecureTransport": "false"
        }
      }
    }
  ]
}
```

## Querying S3 Data with Amazon Athena

Once your data is in S3, you can query it using Amazon Athena. When you use `otlp_json`, the files contain OTLP JSON objects, so the table schema must match the nested OTLP structure or you should transform the data to a query-friendly format such as Parquet before running broad analytical queries:

```sql
-- Create an external table for trace export objects in OTLP JSON form
CREATE EXTERNAL TABLE trace_exports (
  resourceSpans array<struct<
    scopeSpans:array<struct<
      spans:array<struct<
        traceId:string,
        spanId:string,
        name:string,
        startTimeUnixNano:string,
        endTimeUnixNano:string
      >>
    >>
  >>
)
PARTITIONED BY (
  year int,
  month int,
  day int,
  hour int
)
ROW FORMAT SERDE 'org.openx.data.jsonserde.JsonSerDe'
LOCATION 's3://telemetry-bucket/telemetry/';

-- Add partitions
MSCK REPAIR TABLE trace_exports;

-- Query span names from nested OTLP JSON
SELECT span.name, count(*) as span_count
FROM trace_exports
CROSS JOIN UNNEST(resourceSpans) AS t(resource_span)
CROSS JOIN UNNEST(resource_span.scopeSpans) AS t(scope_span)
CROSS JOIN UNNEST(scope_span.spans) AS t(span)
WHERE year = 2026 AND month = 2 AND day = 6 AND hour = 14
GROUP BY span.name
ORDER BY span_count DESC
LIMIT 10;
```

## Troubleshooting Common Issues

**Issue: Data not appearing in S3**

Check that:
- IAM permissions are correctly configured
- The S3 bucket exists and is in the specified region
- The collector logs don't show authentication errors

**Issue: High S3 costs**

Solutions:
- Increase batch size to reduce PUT requests
- Enable compression
- Use lifecycle policies to transition old data
- Consider sampling strategies for high-volume data

**Issue: Slow queries in Athena**

Optimize by:
- Using appropriate partitioning schemes
- Compacting small files into larger ones
- Using columnar formats like Parquet (requires additional processing)

## Complete Production Example

Here's a complete configuration suitable for production use:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Add resource attributes for better organization
  resource:
    attributes:
    - key: deployment.environment
      value: production
      action: upsert

  # Batch for efficiency
  batch:
    timeout: 30s
    send_batch_size: 4096

  # Sample traces to reduce volume (optional)
  probabilistic_sampler:
    sampling_percentage: 10

exporters:
  awss3:
    s3uploader:
      s3_bucket: "prod-observability-data"
      region: "us-west-2"
      s3_base_prefix: "otel"
      s3_prefix: "env=production"
      s3_partition_format: "year=%Y/month=%m/day=%d/hour=%H"
      s3_partition_timezone: "UTC"
      file_prefix: "collector-"
      compression: "gzip"
      storage_class: "INTELLIGENT_TIERING"
      role_arn: "arn:aws:iam::123456789012:role/OtelCollectorS3Role"
      retry_mode: "standard"
      retry_max_attempts: 5
      retry_max_backoff: 30s

    marshaler: "otlp_json"
    timeout: 60s
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [resource, probabilistic_sampler, batch]
      exporters: [awss3]
    metrics:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [awss3]
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [awss3]

  telemetry:
    logs:
      level: info
    metrics:
      address: 0.0.0.0:8888
```

## Conclusion

The AWS S3 exporter provides a robust solution for long-term storage of OpenTelemetry data. By following the configuration examples and best practices in this guide, you can build a cost-effective, secure, and scalable telemetry storage solution.

For more information on OpenTelemetry exporters, check out these related articles:
- https://oneuptime.com/blog/post/2026-02-06-azure-monitor-exporter-opentelemetry-collector/view
- https://oneuptime.com/blog/post/2026-02-06-google-cloud-operations-exporter-opentelemetry-collector/view

For detailed information about the S3 exporter configuration options, refer to the official OpenTelemetry Collector documentation.
