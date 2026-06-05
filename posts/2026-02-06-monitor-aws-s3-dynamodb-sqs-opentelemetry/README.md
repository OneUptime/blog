# How to Monitor AWS S3, DynamoDB, and SQS with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, AWS, S3, DynamoDB, SQS, Monitoring, CloudWatch, Metric

Description: Learn how to monitor AWS S3, DynamoDB, and SQS using OpenTelemetry by collecting CloudWatch metrics and tracing SDK calls for full visibility.

---

Monitoring managed AWS services like S3, DynamoDB, and SQS is tricky because you do not own the infrastructure. You cannot install agents on S3 or attach a profiler to DynamoDB. Instead, you need to pull metrics from CloudWatch and instrument your application's interactions with these services through traces and custom metrics.

OpenTelemetry gives you a unified way to do both. You can use the AWS CloudWatch receiver in the OpenTelemetry Collector to pull service metrics, and you can instrument your AWS SDK calls to trace every API call your code makes to these services.

This guide covers both approaches so you get complete visibility into how your application uses S3, DynamoDB, and SQS.

## Architecture Overview

There are two complementary layers to monitoring AWS services with OpenTelemetry: infrastructure metrics from CloudWatch and application-level traces from SDK instrumentation.

```mermaid
graph TD
    A[Your Application] -->|AWS SDK Calls| B[S3 / DynamoDB / SQS]
    A -->|OTLP Traces & Metrics| C[OpenTelemetry Collector]
    D[AWS CloudWatch] -->|Scraped Metrics| C
    B -->|Publishes Metrics| D
    C --> E[Observability Backend - OneUptime]

    style C fill:#4a9eff,stroke:#333,color:#fff
```

The collector sits in the middle, receiving trace data from your application and pulling CloudWatch metrics on a schedule. Both streams end up in your backend, where you can correlate high latency DynamoDB calls with table-level throttle metrics, for example.

## Collecting CloudWatch Metrics with the OpenTelemetry Collector

The OpenTelemetry Collector has a `awscloudwatch` receiver that queries CloudWatch APIs and converts the metrics into the OpenTelemetry metric format. This lets you ingest AWS service metrics alongside your application telemetry.

You will need the OpenTelemetry Collector Contrib distribution (or ADOT) since the CloudWatch receiver is not in the core distribution.

### S3 Metrics Configuration

S3 publishes request-level metrics to CloudWatch when you enable request metrics on your bucket. The following collector configuration scrapes key S3 metrics including request counts, latency, and error rates.

```yaml
# otel-collector-s3.yaml

receivers:
  awscloudwatch:
    region: us-east-1
    metrics:
      collection_interval: 60s  # How often to query CloudWatch
      period: 300s              # CloudWatch aggregation period
      delay: 10m                # Allow time for CloudWatch data to arrive
      queries:
        # Track total number of HTTP requests to your S3 bucket
        - namespace: AWS/S3
          metric_name: AllRequests
          stats: [Sum]
          dimensions:
            BucketName: my-app-bucket
            FilterId: EntireBucket

        # Track first byte latency for GET requests
        - namespace: AWS/S3
          metric_name: FirstByteLatency
          stats: [Average, p99]
          dimensions:
            BucketName: my-app-bucket
            FilterId: EntireBucket

        # Track 4xx and 5xx errors
        - namespace: AWS/S3
          metric_name: 4xxErrors
          stats: [Sum]
          dimensions:
            BucketName: my-app-bucket
            FilterId: EntireBucket

        - namespace: AWS/S3
          metric_name: 5xxErrors
          stats: [Sum]
          dimensions:
            BucketName: my-app-bucket
            FilterId: EntireBucket
```

Remember to enable S3 request metrics in the bucket configuration first, otherwise CloudWatch will not have data to report.

### DynamoDB Metrics Configuration

DynamoDB publishes several critical metrics to CloudWatch by default. The most important ones are consumed capacity, throttled requests, and latency.

```yaml
# Add these to the awscloudwatch receiver metrics.queries list
        # Track consumed read capacity units on your table
        - namespace: AWS/DynamoDB
          metric_name: ConsumedReadCapacityUnits
          stats: [Sum]
          dimensions:
            TableName: my-users-table

        # Track consumed write capacity units
        - namespace: AWS/DynamoDB
          metric_name: ConsumedWriteCapacityUnits
          stats: [Sum]
          dimensions:
            TableName: my-users-table

        # Track throttled requests - critical for detecting capacity issues
        - namespace: AWS/DynamoDB
          metric_name: ThrottledRequests
          stats: [Sum]
          dimensions:
            TableName: my-users-table
            Operation: GetItem

        # Track successful request latency
        - namespace: AWS/DynamoDB
          metric_name: SuccessfulRequestLatency
          stats: [Average, p99]
          dimensions:
            TableName: my-users-table
            Operation: GetItem
```

DynamoDB throttling is one of the most common production issues. Having this metric in your observability platform, right next to your application traces, makes debugging much faster.

### SQS Metrics Configuration

SQS metrics tell you about queue depth, message age, and throughput. These are essential for monitoring asynchronous workloads.

```yaml
# SQS metrics configuration for the awscloudwatch receiver
        # Number of messages available for retrieval
        - namespace: AWS/SQS
          metric_name: ApproximateNumberOfMessagesVisible
          stats: [Average]
          dimensions:
            QueueName: my-processing-queue

        # Age of oldest message in queue - indicates processing lag
        - namespace: AWS/SQS
          metric_name: ApproximateAgeOfOldestMessage
          stats: [Maximum]
          dimensions:
            QueueName: my-processing-queue

        # Number of messages sent to the queue
        - namespace: AWS/SQS
          metric_name: NumberOfMessagesSent
          stats: [Sum]
          dimensions:
            QueueName: my-processing-queue

        # Number of messages received from the queue
        - namespace: AWS/SQS
          metric_name: NumberOfMessagesReceived
          stats: [Sum]
          dimensions:
            QueueName: my-processing-queue

        # Number of messages deleted (successfully processed)
        - namespace: AWS/SQS
          metric_name: NumberOfMessagesDeleted
          stats: [Sum]
          dimensions:
            QueueName: my-processing-queue
```

The gap between `NumberOfMessagesReceived` and `NumberOfMessagesDeleted` can be a useful signal for processing failures. Because SQS can return the same message more than once and counts repeated deletes, use this as an operational signal rather than an exact count of unique failed messages.

## Complete Collector Pipeline

Here is the full collector configuration that ties the CloudWatch metrics together with a standard OTLP receiver for application traces.

```yaml
# otel-collector-full.yaml - Complete config for AWS service monitoring
receivers:
  # Receive traces and metrics from your application
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Pull metrics from CloudWatch for S3, DynamoDB, and SQS
  awscloudwatch:
    region: us-east-1
    metrics:
      collection_interval: 60s
      period: 60s
      delay: 10m
      queries:
        # ... all the metrics defined above ...

processors:
  batch:
    timeout: 10s
    send_batch_size: 512

  # Add resource attributes identifying this collector
  resource:
    attributes:
      - key: service.name
        value: aws-metrics-collector
        action: upsert

exporters:
  otlphttp:
    endpoint: "https://oneuptime.com/otlp"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp]
    metrics:
      receivers: [otlp, awscloudwatch]
      processors: [resource, batch]
      exporters: [otlphttp]
```

## Tracing AWS SDK Calls from Your Application

CloudWatch metrics give you the service-side view. To complete the picture, you need the client-side view: how your application interacts with these services. OpenTelemetry auto-instrumentation libraries for the AWS SDK capture every API call as a span.

For Python applications using boto3, install the AWS SDK instrumentation library.

```bash
# Install OpenTelemetry instrumentation for boto3 and botocore
pip install opentelemetry-instrumentation-botocore
```

The instrumentation wraps botocore calls made by boto3 with spans that include botocore-specific attributes such as the AWS service, operation, region, request ID, retry attempts, and HTTP status code. You can add selected request parameters with a request hook when that is useful and safe.

```python
# app.py - Example showing traced S3, DynamoDB, and SQS operations
from opentelemetry.instrumentation.botocore import BotocoreInstrumentor
import boto3

# Enable auto-instrumentation for all AWS SDK calls
BotocoreInstrumentor().instrument()

# Every call below will generate an OpenTelemetry span
s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")
sqs = boto3.client("sqs")

# This creates a span: "S3.GetObject"
response = s3.get_object(Bucket="my-bucket", Key="data.json")

# This creates a span: "DynamoDB.GetItem"
table = dynamodb.Table("my-users-table")
user = table.get_item(Key={"user_id": "12345"})

# This creates a span: "SQS.SendMessage"
sqs.send_message(
    QueueUrl="https://sqs.us-east-1.amazonaws.com/123456789012/my-queue",
    MessageBody='{"event": "user_signup"}'
)
```

Each span includes attributes like `rpc.service`, `rpc.method`, `aws.region`, and HTTP status codes. When a DynamoDB call is slow, you will see it in your traces alongside the CloudWatch throttling metrics.

## Correlating Metrics and Traces

The real power comes when you view CloudWatch metrics and application traces side by side. Here is a typical debugging workflow.

```mermaid
sequenceDiagram
    participant Dev as Developer
    participant OB as Observability Backend
    participant CW as CloudWatch Metrics
    participant TR as Application Traces

    Dev->>OB: Alert: High SQS message age
    OB->>CW: Check SQS queue depth
    CW-->>OB: Queue growing, messages not being deleted
    OB->>TR: Find consumer traces with errors
    TR-->>OB: DynamoDB throttling causing consumer failures
    OB->>CW: Check DynamoDB throttled requests
    CW-->>OB: Spike in throttled writes
    Dev->>Dev: Increase DynamoDB write capacity
```

Without both metrics and traces flowing through the same platform, this kind of cross-service debugging requires switching between multiple AWS console tabs and guessing at correlations.

## IAM Permissions

The collector needs CloudWatch read permissions to scrape metrics. Here is a minimal IAM policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:GetMetricData",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*"
    }
  ]
}
```

Attach this policy to the IAM role used by your collector, whether that is an EC2 instance profile, ECS task role, or EKS service account via IRSA.

## Summary

Monitoring AWS managed services with OpenTelemetry involves two layers. First, use the CloudWatch receiver in the collector to pull infrastructure metrics from S3, DynamoDB, and SQS. Second, instrument your application's AWS SDK calls to capture client-side traces for every API call. Together, these give you both the service provider view and the consumer view, which is exactly what you need to troubleshoot issues that span multiple AWS services.
