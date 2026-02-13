# How to Use Amazon Kinesis Data Firehose for Data Delivery to S3

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Firehose, S3, Data Engineering

Description: Step-by-step guide to setting up Kinesis Data Firehose to deliver streaming data to Amazon S3 with buffering, compression, and format conversion.

---

Kinesis Data Firehose is the easiest way to get streaming data into S3. You don't write any consumer code - you just configure a delivery stream, point your producers at it, and Firehose handles the buffering, batching, compression, and delivery. It's the "set it and forget it" approach to data lake ingestion.

This post covers everything from basic setup to advanced features like format conversion and dynamic partitioning.

## Creating a Basic Firehose Delivery Stream

Let's start with the simplest configuration - delivering raw JSON data to S3.

This creates a Firehose delivery stream that buffers data and delivers it to S3.

```bash
aws firehose create-delivery-stream \
  --delivery-stream-name user-events-to-s3 \
  --delivery-stream-type DirectPut \
  --s3-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789:role/FirehoseToS3Role",
    "BucketARN": "arn:aws:s3:::my-data-lake",
    "Prefix": "raw/user-events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/hour=!{timestamp:HH}/",
    "ErrorOutputPrefix": "errors/user-events/!{firehose:error-output-type}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
    "BufferingHints": {
      "SizeInMBs": 128,
      "IntervalInSeconds": 300
    },
    "CompressionFormat": "GZIP",
    "CloudWatchLoggingOptions": {
      "Enabled": true,
      "LogGroupName": "/aws/firehose/user-events",
      "LogStreamName": "S3Delivery"
    }
  }'
```

Key settings explained:

- **Prefix** - The S3 path pattern. The `!{timestamp:...}` expressions create time-based partitions.
- **BufferingHints** - Firehose accumulates data until it hits either the size limit or time limit, whichever comes first. Larger buffers mean fewer, bigger files.
- **CompressionFormat** - GZIP, Snappy, ZIP, or UNCOMPRESSED. GZIP gives the best compression ratio for text data.

## IAM Role for Firehose

Your Firehose delivery stream needs an IAM role with permissions to write to S3 and log to CloudWatch.

This IAM policy grants Firehose the minimum permissions needed for S3 delivery.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:AbortMultipartUpload",
        "s3:GetBucketLocation",
        "s3:GetObject",
        "s3:ListBucket",
        "s3:ListBucketMultipartUploads",
        "s3:PutObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-data-lake",
        "arn:aws:s3:::my-data-lake/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:PutLogEvents",
        "logs:CreateLogStream"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/firehose/*"
    }
  ]
}
```

The trust policy lets Firehose assume this role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "firehose.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## Sending Data to Firehose

You can send data directly to Firehose or from a Kinesis Data Stream.

This Python script sends records directly to the Firehose delivery stream.

```python
import boto3
import json
import time

firehose = boto3.client('firehose', region_name='us-east-1')

def send_events(delivery_stream, events):
    """Send a batch of events to Firehose."""
    records = []
    for event in events:
        # Each record needs a newline delimiter for JSON processing
        records.append({
            'Data': json.dumps(event) + '\n'
        })

    # Send in batches of 500 (Firehose limit)
    for i in range(0, len(records), 500):
        batch = records[i:i+500]
        response = firehose.put_record_batch(
            DeliveryStreamName=delivery_stream,
            Records=batch
        )

        if response['FailedPutCount'] > 0:
            print(f"Failed to deliver {response['FailedPutCount']} records")
            # Retry failed records
            for idx, result in enumerate(response['RequestResponses']):
                if 'ErrorCode' in result:
                    print(f"Error: {result['ErrorCode']} - {result['ErrorMessage']}")

# Generate sample events
events = [
    {
        "userId": f"user-{i}",
        "eventType": "page_view",
        "page": f"/products/{i % 100}",
        "timestamp": int(time.time()),
        "userAgent": "Mozilla/5.0"
    }
    for i in range(1000)
]

send_events('user-events-to-s3', events)
```

## Reading from a Kinesis Data Stream

Instead of direct puts, you can configure Firehose to read from an existing Kinesis Data Stream. This is useful when you want multiple consumers on the same stream.

```bash
aws firehose create-delivery-stream \
  --delivery-stream-name kinesis-to-s3 \
  --delivery-stream-type KinesisStreamAsSource \
  --kinesis-stream-source-configuration '{
    "KinesisStreamARN": "arn:aws:kinesis:us-east-1:123456789:stream/user-events",
    "RoleARN": "arn:aws:iam::123456789:role/FirehoseKinesisRole"
  }' \
  --s3-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789:role/FirehoseToS3Role",
    "BucketARN": "arn:aws:s3:::my-data-lake",
    "Prefix": "raw/user-events/",
    "BufferingHints": {
      "SizeInMBs": 128,
      "IntervalInSeconds": 300
    },
    "CompressionFormat": "GZIP"
  }'
```

## Format Conversion to Parquet

One of Firehose's best features is automatic format conversion. You can ingest JSON and have Firehose convert it to Parquet or ORC before writing to S3. This is huge for analytics - Parquet files are much faster to query and take up less space.

This creates a delivery stream that converts JSON input to Parquet using a Glue table schema.

```bash
aws firehose create-delivery-stream \
  --delivery-stream-name events-parquet-to-s3 \
  --delivery-stream-type DirectPut \
  --extended-s3-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789:role/FirehoseToS3Role",
    "BucketARN": "arn:aws:s3:::my-data-lake",
    "Prefix": "processed/events/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
    "BufferingHints": {
      "SizeInMBs": 128,
      "IntervalInSeconds": 900
    },
    "DataFormatConversionConfiguration": {
      "Enabled": true,
      "SchemaConfiguration": {
        "RoleARN": "arn:aws:iam::123456789:role/FirehoseGlueRole",
        "DatabaseName": "analytics",
        "TableName": "user_events",
        "Region": "us-east-1"
      },
      "InputFormatConfiguration": {
        "Deserializer": {
          "OpenXJsonSerDe": {}
        }
      },
      "OutputFormatConfiguration": {
        "Serializer": {
          "ParquetSerDe": {
            "Compression": "SNAPPY"
          }
        }
      }
    }
  }'
```

You need a Glue table that defines the schema. Create it first.

```bash
aws glue create-table \
  --database-name analytics \
  --table-input '{
    "Name": "user_events",
    "StorageDescriptor": {
      "Columns": [
        {"Name": "userId", "Type": "string"},
        {"Name": "eventType", "Type": "string"},
        {"Name": "page", "Type": "string"},
        {"Name": "timestamp", "Type": "bigint"},
        {"Name": "userAgent", "Type": "string"}
      ],
      "InputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat",
      "OutputFormat": "org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat",
      "SerdeInfo": {
        "SerializationLibrary": "org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe"
      }
    }
  }'
```

## Dynamic Partitioning

Dynamic partitioning lets you partition data in S3 based on the content of the records, not just timestamps. This is perfect for multi-tenant data or partitioning by event type.

This enables dynamic partitioning based on fields extracted from the record data.

```bash
aws firehose create-delivery-stream \
  --delivery-stream-name dynamically-partitioned-events \
  --delivery-stream-type DirectPut \
  --extended-s3-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789:role/FirehoseToS3Role",
    "BucketARN": "arn:aws:s3:::my-data-lake",
    "Prefix": "events/event_type=!{partitionKeyFromQuery:eventType}/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/",
    "ErrorOutputPrefix": "errors/",
    "BufferingHints": {
      "SizeInMBs": 64,
      "IntervalInSeconds": 60
    },
    "DynamicPartitioningConfiguration": {
      "Enabled": true,
      "RetryOptions": {
        "DurationInSeconds": 300
      }
    },
    "ProcessingConfiguration": {
      "Enabled": true,
      "Processors": [
        {
          "Type": "MetadataExtraction",
          "Parameters": [
            {
              "ParameterName": "MetadataExtractionQuery",
              "ParameterValue": "{eventType: .eventType}"
            },
            {
              "ParameterName": "JsonParsingEngine",
              "ParameterValue": "JQ-1.6"
            }
          ]
        },
        {
          "Type": "AppendDelimiterToRecord",
          "Parameters": [
            {
              "ParameterName": "Delimiter",
              "ParameterValue": "\\n"
            }
          ]
        }
      ]
    }
  }'
```

With this configuration, click events go to `events/event_type=click/`, page view events go to `events/event_type=page_view/`, and so on. This makes Athena and Spark queries much faster because they can skip irrelevant partitions.

## Monitoring Firehose

Keep an eye on these CloudWatch metrics:

- **IncomingBytes/IncomingRecords** - Data flowing in
- **DeliveryToS3.Bytes/Records** - Data delivered to S3
- **DeliveryToS3.DataFreshness** - Oldest record not yet delivered (latency indicator)
- **DeliveryToS3.Success** - Successful delivery count

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name firehose-delivery-freshness \
  --metric-name DeliveryToS3.DataFreshness \
  --namespace AWS/Firehose \
  --statistic Maximum \
  --period 300 \
  --threshold 900 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=DeliveryStreamName,Value=user-events-to-s3 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

If DeliveryToS3.DataFreshness is consistently high, check if your S3 bucket has any issues or if the Firehose role has correct permissions. For more on building streaming pipelines, see our guide on [configuring Kinesis Data Streams](https://oneuptime.com/blog/post/2026-02-12-configure-amazon-kinesis-data-streams/view).

## Buffering Strategy

The buffer size and interval directly affect file sizes in S3. Here's the tradeoff:

| Buffer Size | Buffer Interval | Result |
|---|---|---|
| 1 MB | 60 sec | Many small files (bad for queries) |
| 128 MB | 900 sec | Fewer large files (better for queries, higher latency) |
| 64 MB | 300 sec | Good balance for most workloads |

For analytics workloads queried with Athena or Spark, larger files are better. For near-real-time dashboards, smaller buffers give you fresher data.

Firehose is the simplest path from streaming data to S3. Once it's configured, it runs without intervention - no code to maintain, no servers to patch, no capacity to manage. The format conversion and dynamic partitioning features make it a complete ingestion pipeline in a single managed service.
