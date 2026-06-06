# How to Configure the AWS CloudWatch Logs Exporter in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Exporter, AWS, CloudWatch, Log, Observability, Cloud

Description: Learn how to configure the AWS CloudWatch Logs exporter in OpenTelemetry Collector to centralize log management in AWS with log groups, streams, IAM permissions, and metric filters.

AWS CloudWatch Logs provides centralized log management for AWS resources and applications. The OpenTelemetry Collector's CloudWatch Logs exporter enables you to send logs collected through OpenTelemetry to CloudWatch, where you can leverage powerful querying capabilities, metric filters, alarms, and integrations with other AWS services.

## Why Use OpenTelemetry with CloudWatch Logs

Integrating OpenTelemetry with CloudWatch Logs offers significant benefits:

- **Unified collection**: Collect logs, traces, and metrics through a single OpenTelemetry pipeline
- **Advanced processing**: Filter, transform, and enrich logs before sending to CloudWatch
- **Cost optimization**: Reduce log volume through sampling and filtering before ingestion
- **Vendor neutrality**: Use OpenTelemetry instrumentation with the option to send logs to multiple destinations
- **Cross-service correlation**: Link logs with traces using trace and span IDs

## Architecture Overview

The CloudWatch Logs exporter organizes logs into hierarchical log groups and streams:

```mermaid
graph TB
    A[Applications] -->|OTLP| B[OpenTelemetry Collector]
    B -->|Receivers| C[Processors]
    C -->|Filter & Transform| D[CloudWatch Logs Exporter]
    D -->|PutLogEvents API| E[AWS CloudWatch Logs]
    E --> F[Log Group: /aws/app/api]
    E --> G[Log Group: /aws/app/worker]
    F --> H[Log Stream: instance-1]
    F --> I[Log Stream: instance-2]
    E --> J[Metric Filters]
    J --> K[CloudWatch Metrics]
    K --> L[CloudWatch Alarms]
```

## Prerequisites

Before configuring the CloudWatch Logs exporter, ensure you have:

- OpenTelemetry Collector Contrib distribution
- AWS account with CloudWatch Logs access
- IAM credentials or role with appropriate permissions
- Network connectivity to CloudWatch Logs endpoints

## IAM Permissions

Create an IAM policy with necessary CloudWatch Logs permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:PutRetentionPolicy",
        "logs:TagResource",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": "arn:aws:logs:*:*:*"
    }
  ]
}
```

For production environments, scope the resource ARN to specific log groups:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:PutRetentionPolicy",
        "logs:TagResource"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/otel/*:*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup"
      ],
      "Resource": "arn:aws:logs:us-east-1:123456789012:log-group:/aws/otel/*"
    }
  ]
}
```

## Basic Configuration

Here is a minimal configuration for sending logs to CloudWatch:

```yaml
# Basic CloudWatch Logs exporter configuration

exporters:
  awscloudwatchlogs:
    # AWS region
    region: us-east-1

    # Log group name
    log_group_name: /aws/otel/application

    # Log stream name (supports supported placeholders)
    log_stream_name: "{ServiceName}-{InstanceId}"

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 100

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [awscloudwatchlogs]
```

This configuration creates a log group `/aws/otel/application` and streams logs based on the service name and service instance ID.

## Dynamic Log Stream Names

Use supported resource attribute placeholders to create dynamic log stream names:

```yaml
exporters:
  awscloudwatchlogs:
    region: us-east-1
    log_group_name: /aws/otel/application

    # Template using supported resource attribute placeholders
    # Creates streams like: production-api-gateway-i-0123456789abcdef
    log_stream_name: "production-{ServiceName}-{InstanceId}"

processors:
  # Add resource attributes
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert
      - key: service.name
        value: api-gateway
        action: insert
      - key: service.instance.id
        value: ${HOSTNAME}
        action: insert

  batch:
    timeout: 10s
    send_batch_size: 100

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [resource, batch]
      exporters: [awscloudwatchlogs]
```

## Multiple Log Groups Configuration

Route different log types to separate log groups:

```yaml
exporters:
  # Application logs
  awscloudwatchlogs/app:
    region: us-east-1
    log_group_name: /aws/otel/application
    log_stream_name: "{ServiceName}"

  # Error logs
  awscloudwatchlogs/errors:
    region: us-east-1
    log_group_name: /aws/otel/errors
    log_stream_name: "{ServiceName}"

  # Audit logs
  awscloudwatchlogs/audit:
    region: us-east-1
    log_group_name: /aws/otel/audit
    log_stream_name: "{ServiceName}"

connectors:
  # Route logs based on severity
  routing:
    default_pipelines: [logs/app]
    table:
      - context: log
        condition: severity_text == "ERROR"
        pipelines: [logs/errors]
      - context: log
        condition: severity_text == "FATAL"
        pipelines: [logs/errors]

processors:
  # Filter for audit logs
  filter/audit:
    log_conditions:
      - 'log.attributes["log.type"] != "audit"'

  batch:
    timeout: 10s
    send_batch_size: 100

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    # Route incoming logs
    logs/in:
      receivers: [otlp]
      processors: [batch]
      exporters: [routing]

    # Application logs
    logs/app:
      receivers: [routing]
      exporters: [awscloudwatchlogs/app]

    # Error logs
    logs/errors:
      receivers: [routing]
      exporters: [awscloudwatchlogs/errors]

    # Audit logs
    logs/audit:
      receivers: [otlp]
      processors: [filter/audit, batch]
      exporters: [awscloudwatchlogs/audit]
```

## Log Format and Encoding

Configure how logs are encoded before sending to CloudWatch:

```yaml
exporters:
  awscloudwatchlogs:
    region: us-east-1
    log_group_name: /aws/otel/application
    log_stream_name: "{ServiceName}"

    # Export only the log body instead of the CloudWatch Logs exporter JSON wrapper.
    # Set this to true when the body already contains EMF JSON.
    raw_log: false

processors:
  # Transform logs to include structured data
  transform:
    log_statements:
      - context: log
        statements:
          # Add timestamp
          - set(attributes["timestamp"], log.time_unix_nano)

          # Parse JSON body if present
          - merge_maps(log.attributes, ParseJSON(log.body.string), "insert") where IsMatch(log.body.string, "^\\{")

  batch:
    timeout: 10s
    send_batch_size: 100

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [transform, batch]
      exporters: [awscloudwatchlogs]
```

## Advanced Configuration with Retention and Tagging

Configure log retention policies and tags:

```yaml
exporters:
  awscloudwatchlogs:
    region: us-east-1
    log_group_name: /aws/otel/application
    log_stream_name: "{ServiceName}-{InstanceId}"

    # Log retention in days (0 = never expire)
    # Valid values: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 2192, 2557, 2922, 3288, 3653
    log_retention: 30

    # Tags for the log group
    tags:
      Environment: production
      Application: api-gateway
      ManagedBy: opentelemetry
      CostCenter: engineering

processors:
  batch:
    timeout: 10s
    send_batch_size: 100
    send_batch_max_size: 1000

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [awscloudwatchlogs]
```

## ECS and EKS Configuration

For containerized environments with AWS resource detection:

```yaml
processors:
  # Detect AWS resource attributes
  resourcedetection:
    detectors:
      - env
      - system
      - ecs
      - ec2
      - eks
    timeout: 5s
    override: false

  # Transform ECS attributes
  attributes:
    actions:
      # Extract ECS task ID for log stream
      - key: aws.ecs.task.id
        from_attribute: aws.ecs.task.id
        action: upsert

      # Extract cluster name
      - key: aws.ecs.cluster.name
        from_attribute: aws.ecs.cluster.name
        action: upsert

  batch:
    timeout: 10s
    send_batch_size: 100

exporters:
  awscloudwatchlogs:
    region: us-east-1

    # ECS-specific log group
    log_group_name: /aws/ecs/{ClusterName}

    # Log stream using ECS task ID
    log_stream_name: "{ServiceName}/{TaskId}"

    log_retention: 7

    tags:
      Platform: ECS
      Environment: production

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [resourcedetection, attributes, batch]
      exporters: [awscloudwatchlogs]
```

## Embedded Metric Format (EMF) Configuration

Send OpenTelemetry metrics to CloudWatch Logs as embedded metric format (EMF) using the AWS EMF exporter:

```yaml
exporters:
  awsemf:
    region: us-east-1
    log_group_name: /aws/otel/metrics
    log_stream_name: "{ServiceName}"

    # CloudWatch namespace for metrics
    namespace: CustomApp/Metrics

    # Dimension rollup option
    dimension_rollup_option: NoDimensionRollup

    # Resource attributes to convert to dimensions
    resource_to_telemetry_conversion:
      enabled: true

    # Parse JSON-encoded attribute values for selected attributes
    parse_json_encoded_attr_values:
      - metadata

    # Metric declarations
    metric_declarations:
      - dimensions: [[service.name, operation]]
        metric_name_selectors:
          - request.duration
          - request.count

      - dimensions: [[service.name]]
        metric_name_selectors:
          - error.count

    log_retention: 7

processors:
  # Rename metrics before EMF export
  metricstransform:
    transforms:
      - include: request.duration
        action: update
        new_name: RequestDuration

      - include: request.count
        action: update
        new_name: RequestCount

  batch:
    timeout: 10s

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [metricstransform, batch]
      exporters: [awsemf]
```

## Complete Production Configuration

A comprehensive production-ready configuration:

```yaml
extensions:
  health_check:
    endpoint: 0.0.0.0:13133

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 32
      http:
        endpoint: 0.0.0.0:4318

  # Collect container logs
  filelog:
    include:
      - /var/log/containers/*.log
    start_at: beginning
    operators:
      - type: json_parser
        timestamp:
          parse_from: attributes.time
          layout: '%Y-%m-%dT%H:%M:%S.%LZ'

processors:
  # Memory protection
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  # AWS resource detection
  resourcedetection:
    detectors:
      - env
      - system
      - ec2
      - ecs
      - eks
    timeout: 5s

  # Filter out debug logs
  filter:
    log_conditions:
      - 'log.severity_number < SEVERITY_NUMBER_INFO'

  # Deduplicate logs
  log_dedup:
    interval: 1s

  # Add attributes
  resource:
    attributes:
      - key: deployment.environment
        value: production
        action: insert
      - key: log.source
        value: otel-collector
        action: insert
      - key: service.instance.id
        value: ${HOSTNAME}
        action: insert

  # Transform logs
  transform:
    log_statements:
      - context: log
        statements:
          # Extract trace context
          - set(log.attributes["trace_id"], log.trace_id.string)
          - set(log.attributes["span_id"], log.span_id.string)

          # Normalize severity
          - set(log.severity_text, "INFO") where log.severity_text == "information"
          - set(log.severity_text, "ERROR") where log.severity_text == "error"

  # Batch for efficiency
  batch:
    timeout: 5s
    send_batch_size: 100
    send_batch_max_size: 1000

exporters:
  # Application logs
  awscloudwatchlogs/app:
    region: us-east-1
    log_group_name: /aws/otel/production/{ServiceName}
    log_stream_name: "{ServiceName}-{InstanceId}"

    log_retention: 30

    tags:
      Environment: production
      ManagedBy: opentelemetry

    # Queue configuration
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000

    # Retry configuration
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s
      max_elapsed_time: 300s

service:
  extensions: [health_check]

  telemetry:
    logs:
      level: info
      output_paths:
        - stdout
        - /var/log/otel-collector.log

    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    logs:
      receivers: [otlp, filelog]
      processors:
        - memory_limiter
        - resourcedetection
        - filter
        - log_dedup
        - resource
        - transform
        - batch
      exporters: [awscloudwatchlogs/app]
```

## VPC Endpoint Configuration

For private subnets, use CloudWatch Logs VPC endpoints:

```yaml
exporters:
  awscloudwatchlogs:
    region: us-east-1
    log_group_name: /aws/otel/application
    log_stream_name: "{ServiceName}"

    # Custom endpoint for VPC endpoint
    endpoint: https://vpce-1234567-abcdefg.logs.us-east-1.vpce.amazonaws.com

    # Disable TLS certificate verification only if required for a custom endpoint
    no_verify_ssl: false

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 10s
    send_batch_size: 100

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [awscloudwatchlogs]
```

Create the CloudWatch Logs VPC endpoint:

```bash
aws ec2 create-vpc-endpoint \
  --vpc-id vpc-12345678 \
  --vpc-endpoint-type Interface \
  --service-name com.amazonaws.us-east-1.logs \
  --subnet-ids subnet-12345678 subnet-87654321 \
  --security-group-ids sg-12345678 \
  --private-dns-enabled
```

## CloudWatch Logs Insights Queries

Once logs are in CloudWatch, use Logs Insights for analysis:

```text
# Find error logs
fields @timestamp, body, severity_text
| filter severity_text = "ERROR"
| sort @timestamp desc
| limit 20

# Count logs by service
stats count() by resource.`service.name`

# Find logs with specific trace ID
fields @timestamp, body
| filter attributes.trace_id = "abc123..."

# Calculate p95 latency from logs
fields attributes.duration
| stats percentile(attributes.duration, 95) by resource.`service.name`

# Search for specific patterns
fields @timestamp, body
| filter body like /exception/
| sort @timestamp desc
```

## Metric Filters Configuration

Create metric filters from log patterns:

```bash
# Create metric filter for error count
aws logs put-metric-filter \
  --log-group-name /aws/otel/application \
  --filter-name ErrorCount \
  --filter-pattern '[time, request_id, level = ERROR*, ...]' \
  --metric-transformations \
    metricName=ErrorCount,metricNamespace=CustomApp,metricValue=1,unit=Count

# Create metric filter for response time
aws logs put-metric-filter \
  --log-group-name /aws/otel/application \
  --filter-name ResponseTime \
  --filter-pattern '[time, request_id, level, duration]' \
  --metric-transformations \
    metricName=ResponseTime,metricNamespace=CustomApp,metricValue=$duration,unit=Milliseconds
```

## Monitoring and Troubleshooting

Monitor the exporter using metrics exposed on port 8888:

- `otelcol_exporter_sent_log_records`: Successfully exported log records
- `otelcol_exporter_send_failed_log_records`: Failed exports
- `otelcol_exporter_queue_size`: Current queue size

Common issues and solutions:

**ResourceNotFoundException**: Log group doesn't exist. Enable auto-creation or create manually.

**InvalidSequenceTokenException**: This should not occur with current CloudWatch Logs `PutLogEvents`, because sequence tokens are ignored. If you see it from older tooling, upgrade the client or collector.

**ThrottlingException**: Too many API calls. Increase batch size and timeout to reduce call frequency.

**Access Denied**: Verify IAM permissions include all required actions.

## Cost Optimization

Reduce CloudWatch Logs costs:

- **Filter before export**: Remove debug logs and health checks using the filter processor
- **Compress data**: Use EMF for metric data instead of individual log entries
- **Set retention policies**: Don't keep logs longer than necessary
- **Use S3 export**: Archive old logs to S3 for long-term storage
- **Aggregate logs**: Pre-aggregate metrics in the collector before sending

## Integration with CloudWatch Alarms

Create alarms based on metric filters:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name high-error-rate \
  --alarm-description "Alert when error rate is high" \
  --metric-name ErrorCount \
  --namespace CustomApp \
  --statistic Sum \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --treat-missing-data notBreaching
```

## Conclusion

The AWS CloudWatch Logs exporter enables centralized log management for applications instrumented with OpenTelemetry. By processing logs through the OpenTelemetry Collector before sending to CloudWatch, you gain powerful filtering, transformation, and cost optimization capabilities while maintaining the benefits of CloudWatch's query interface, metric filters, and AWS service integrations.

The configuration patterns shown here provide a foundation for building scalable log collection infrastructure that integrates seamlessly with AWS services. Whether you're running containers on ECS, Kubernetes on EKS, or traditional EC2 instances, the CloudWatch Logs exporter offers flexible options for organizing and managing your log data.

For information about other AWS exporters, see our guides on the [AWS X-Ray exporter](https://oneuptime.com/blog/post/2026-02-06-aws-xray-exporter-opentelemetry-collector/view) and [AWS Kinesis exporter](https://oneuptime.com/blog/post/2026-02-06-aws-kinesis-exporter-opentelemetry-collector/view).
