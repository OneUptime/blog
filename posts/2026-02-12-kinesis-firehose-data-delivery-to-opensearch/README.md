# How to Use Kinesis Firehose for Data Delivery to OpenSearch

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Kinesis, Firehose, OpenSearch, Logging

Description: Configure Kinesis Data Firehose to stream data into Amazon OpenSearch Service for real-time search and analytics with index rotation and error handling.

---

Streaming data into OpenSearch for log analytics, search, or real-time dashboards is a natural fit for Kinesis Data Firehose. You get automated buffering, index rotation, and error handling without writing a custom indexing pipeline. If you've ever built and maintained a Logstash or Fluentd pipeline to feed Elasticsearch, you'll appreciate how much simpler this is.

Let's set up a Firehose delivery stream that feeds data into OpenSearch with production-ready configuration.

## Creating the OpenSearch Domain

If you don't have an OpenSearch domain yet, you'll need one. For details on setting up domains, check out our guide on [setting up Amazon OpenSearch Service domains](https://oneuptime.com/blog/post/set-up-amazon-opensearch-service-domains/view). For this post, we'll assume you have a domain running.

## Creating the Delivery Stream

This creates a Firehose delivery stream that delivers data to OpenSearch with daily index rotation.

```bash
aws firehose create-delivery-stream \
  --delivery-stream-name logs-to-opensearch \
  --delivery-stream-type DirectPut \
  --amazon-opensearch-service-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789:role/FirehoseOpenSearchRole",
    "DomainARN": "arn:aws:es:us-east-1:123456789:domain/my-search-domain",
    "IndexName": "app-logs",
    "IndexRotationPeriod": "OneDay",
    "TypeName": "_doc",
    "BufferingHints": {
      "IntervalInSeconds": 60,
      "SizeInMBs": 5
    },
    "RetryOptions": {
      "DurationInSeconds": 300
    },
    "S3BackupMode": "FailedDocumentsOnly",
    "S3Configuration": {
      "RoleARN": "arn:aws:iam::123456789:role/FirehoseOpenSearchRole",
      "BucketARN": "arn:aws:s3:::my-firehose-backup",
      "Prefix": "opensearch-failed/app-logs/",
      "BufferingHints": {
        "SizeInMBs": 128,
        "IntervalInSeconds": 300
      },
      "CompressionFormat": "GZIP"
    },
    "CloudWatchLoggingOptions": {
      "Enabled": true,
      "LogGroupName": "/aws/firehose/logs-to-opensearch",
      "LogStreamName": "OpenSearchDelivery"
    }
  }'
```

Key configuration points:

- **IndexRotationPeriod** - Creates time-based indices like `app-logs-2026-02-12`. Options are NoRotation, OneHour, OneDay, OneWeek, OneMonth.
- **S3BackupMode** - `FailedDocumentsOnly` sends rejected documents to S3. Use `AllDocuments` if you also want a full copy in S3.
- **BufferingHints** - Smaller buffers mean lower latency but more API calls to OpenSearch. 60 seconds and 5 MB is a good starting point for near-real-time.

## IAM Role Permissions

The Firehose role needs access to the OpenSearch domain, S3, and CloudWatch.

This IAM policy provides the permissions Firehose needs for OpenSearch delivery.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "es:DescribeElasticsearchDomain",
        "es:DescribeElasticsearchDomains",
        "es:DescribeElasticsearchDomainConfig",
        "es:ESHttpPost",
        "es:ESHttpPut",
        "es:ESHttpGet"
      ],
      "Resource": [
        "arn:aws:es:us-east-1:123456789:domain/my-search-domain",
        "arn:aws:es:us-east-1:123456789:domain/my-search-domain/*"
      ]
    },
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
        "arn:aws:s3:::my-firehose-backup",
        "arn:aws:s3:::my-firehose-backup/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:PutLogEvents",
        "logs:CreateLogStream"
      ],
      "Resource": "*"
    }
  ]
}
```

You also need to configure the OpenSearch domain's access policy to allow the Firehose role.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789:role/FirehoseOpenSearchRole"
      },
      "Action": "es:*",
      "Resource": "arn:aws:es:us-east-1:123456789:domain/my-search-domain/*"
    }
  ]
}
```

## Preparing the Index Template

Before sending data, create an index template in OpenSearch. This controls the mapping for all indices created by the rotation.

This index template defines the field mappings and settings for all rotated indices.

```bash
# Create an index template using the OpenSearch API
curl -XPUT "https://my-search-domain.us-east-1.es.amazonaws.com/_index_template/app-logs-template" \
  -H "Content-Type: application/json" \
  --aws-sigv4 "aws:amz:us-east-1:es" \
  -d '{
    "index_patterns": ["app-logs-*"],
    "template": {
      "settings": {
        "number_of_shards": 3,
        "number_of_replicas": 1,
        "index.refresh_interval": "10s"
      },
      "mappings": {
        "properties": {
          "timestamp": {"type": "date", "format": "epoch_millis||iso8601"},
          "level": {"type": "keyword"},
          "service": {"type": "keyword"},
          "message": {"type": "text"},
          "traceId": {"type": "keyword"},
          "host": {"type": "keyword"},
          "statusCode": {"type": "integer"},
          "responseTime": {"type": "float"},
          "metadata": {"type": "object", "dynamic": true}
        }
      }
    }
  }'
```

## Sending Data

Send log records to Firehose. Each record becomes a document in OpenSearch.

This Python script sends application log records to the Firehose stream for OpenSearch indexing.

```python
import boto3
import json
import time
import uuid
import random

firehose = boto3.client('firehose', region_name='us-east-1')

def generate_log_event():
    """Generate a realistic log event."""
    levels = ['INFO', 'WARN', 'ERROR', 'DEBUG']
    services = ['api-gateway', 'user-service', 'order-service', 'payment-service']
    endpoints = ['/api/users', '/api/orders', '/api/products', '/api/payments']

    level = random.choice(levels)
    service = random.choice(services)

    return {
        "timestamp": int(time.time() * 1000),
        "level": level,
        "service": service,
        "message": f"Request processed for {random.choice(endpoints)}",
        "traceId": str(uuid.uuid4()),
        "host": f"{service}-{random.randint(1,5)}.internal",
        "statusCode": random.choice([200, 200, 200, 201, 400, 404, 500]),
        "responseTime": round(random.uniform(10, 500), 2),
        "metadata": {
            "region": "us-east-1",
            "version": "2.1.0"
        }
    }

def send_logs(count):
    """Send a batch of log events to Firehose."""
    records = []
    for _ in range(count):
        event = generate_log_event()
        records.append({
            'Data': json.dumps(event) + '\n'
        })

    # Send in batches of 500
    for i in range(0, len(records), 500):
        batch = records[i:i+500]
        response = firehose.put_record_batch(
            DeliveryStreamName='logs-to-opensearch',
            Records=batch
        )

        if response['FailedPutCount'] > 0:
            print(f"Failed to deliver {response['FailedPutCount']} records")

    print(f"Sent {count} log records")

# Send 1000 log events
send_logs(1000)
```

## VPC Delivery

If your OpenSearch domain is in a VPC (which it should be for production), you need to configure Firehose with VPC access.

```bash
aws firehose create-delivery-stream \
  --delivery-stream-name vpc-logs-to-opensearch \
  --delivery-stream-type DirectPut \
  --amazon-opensearch-service-destination-configuration '{
    "RoleARN": "arn:aws:iam::123456789:role/FirehoseOpenSearchRole",
    "DomainARN": "arn:aws:es:us-east-1:123456789:domain/my-vpc-domain",
    "IndexName": "app-logs",
    "IndexRotationPeriod": "OneDay",
    "BufferingHints": {
      "IntervalInSeconds": 60,
      "SizeInMBs": 5
    },
    "VpcConfiguration": {
      "SubnetIds": ["subnet-abc123", "subnet-def456"],
      "SecurityGroupIds": ["sg-opensearch-access"],
      "RoleARN": "arn:aws:iam::123456789:role/FirehoseOpenSearchRole"
    },
    "S3Configuration": {
      "RoleARN": "arn:aws:iam::123456789:role/FirehoseOpenSearchRole",
      "BucketARN": "arn:aws:s3:::my-firehose-backup",
      "Prefix": "opensearch-failed/"
    }
  }'
```

The security group for Firehose must allow outbound traffic to the OpenSearch domain on port 443.

## Index Lifecycle Management

Rotated indices accumulate over time. Set up Index State Management (ISM) in OpenSearch to automatically manage old indices.

This ISM policy deletes indices older than 30 days and makes indices read-only after 7 days.

```bash
curl -XPUT "https://my-search-domain.us-east-1.es.amazonaws.com/_plugins/_ism/policies/app-logs-lifecycle" \
  -H "Content-Type: application/json" \
  --aws-sigv4 "aws:amz:us-east-1:es" \
  -d '{
    "policy": {
      "description": "Lifecycle policy for app-logs indices",
      "default_state": "hot",
      "states": [
        {
          "name": "hot",
          "actions": [],
          "transitions": [
            {
              "state_name": "warm",
              "conditions": {
                "min_index_age": "7d"
              }
            }
          ]
        },
        {
          "name": "warm",
          "actions": [
            {
              "read_only": {}
            },
            {
              "force_merge": {
                "max_num_segments": 1
              }
            }
          ],
          "transitions": [
            {
              "state_name": "delete",
              "conditions": {
                "min_index_age": "30d"
              }
            }
          ]
        },
        {
          "name": "delete",
          "actions": [
            {
              "delete": {}
            }
          ]
        }
      ],
      "ism_template": {
        "index_patterns": ["app-logs-*"],
        "priority": 100
      }
    }
  }'
```

## Monitoring Delivery Health

Watch these metrics for Firehose-to-OpenSearch delivery.

```bash
# Alert on delivery failures
aws cloudwatch put-metric-alarm \
  --alarm-name firehose-opensearch-failures \
  --metric-name DeliveryToAmazonOpenSearchService.Success \
  --namespace AWS/Firehose \
  --statistic Average \
  --period 300 \
  --threshold 0.95 \
  --comparison-operator LessThanThreshold \
  --evaluation-periods 3 \
  --dimensions Name=DeliveryStreamName,Value=logs-to-opensearch \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

Also monitor the OpenSearch domain itself:

- **ClusterStatus.red** - The cluster has unassigned primary shards. Bad.
- **FreeStorageSpace** - If this hits zero, the domain will reject writes.
- **JVMMemoryPressure** - High memory pressure leads to slow indexing.

## Troubleshooting Common Issues

**Documents rejected by OpenSearch** - Check the S3 backup prefix for failed documents. Look at the error messages to understand why they were rejected. Common causes are mapping conflicts and document size limits.

**High delivery latency** - If DataFreshness is growing, your OpenSearch domain might be overwhelmed. Check cluster health, increase instance count, or reduce the Firehose buffer to send smaller batches.

**Index not rotating** - Verify that the Firehose role has permission to create new indices. Check the OpenSearch access policy.

Firehose to OpenSearch is one of the cleanest ways to build a real-time log analytics pipeline. Combined with proper index templates and lifecycle management, you get a fully automated system that ingests, indexes, and cleans up data without any custom code.
