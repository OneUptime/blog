# How to Reduce Data Transfer Costs Between AWS Regions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Data Transfer, Cost Optimization, Multi-Region, Networking

Description: Strategies to minimize cross-region data transfer costs on AWS including selective replication, caching, compression, and architectural patterns.

---

Cross-region data transfer on AWS costs $0.02 per GB in most cases. That might sound trivial, but it compounds fast. If you're replicating 5TB of data between US East and EU West every month, that's $100 in transfer fees alone. Add in database replication, log shipping, backup copies, and inter-region API calls, and many organizations spend thousands monthly on cross-region traffic they could reduce or eliminate.

The key is figuring out what actually needs to cross regions and what doesn't.

## Map Your Cross-Region Traffic

Before optimizing, you need visibility. Use AWS Cost Explorer to break down data transfer costs by region pair:

```bash
# Get data transfer costs broken down by usage type (which includes region info)
aws ce get-cost-and-usage \
  --time-period Start=2026-01-01,End=2026-02-01 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter '{
    "Dimensions": {
      "Key": "USAGE_TYPE",
      "Values": ["USE1-USE2-AWS-Out-Bytes", "USE1-EUW1-AWS-Out-Bytes"]
    }
  }' \
  --group-by Type=DIMENSION,Key=USAGE_TYPE
```

Also check VPC Flow Logs for cross-region traffic patterns:

```bash
# Enable flow logs on your VPC peering connections
aws ec2 create-flow-logs \
  --resource-type VPC \
  --resource-ids vpc-0a1b2c3d4e5f67890 \
  --traffic-type ALL \
  --log-destination-type s3 \
  --log-destination arn:aws:s3:::my-flow-logs-bucket/cross-region/
```

Common cross-region traffic sources include:

- S3 Cross-Region Replication
- RDS read replicas in other regions
- DynamoDB Global Tables
- Application-level API calls between regional deployments
- Log and metric forwarding
- Backup replication

## Selective S3 Replication

S3 Cross-Region Replication (CRR) is often configured at the bucket level, replicating everything. Most of the time, you only need a subset of objects in the remote region.

Use prefix or tag-based filters to replicate only what's needed:

```bash
# Set up selective replication based on prefixes
aws s3api put-bucket-replication \
  --bucket source-bucket \
  --replication-configuration '{
    "Role": "arn:aws:iam::123456789012:role/replication-role",
    "Rules": [
      {
        "ID": "ReplicateCriticalOnly",
        "Status": "Enabled",
        "Priority": 1,
        "Filter": {
          "And": {
            "Prefix": "critical/",
            "Tags": [{"Key": "replicate", "Value": "true"}]
          }
        },
        "Destination": {
          "Bucket": "arn:aws:s3:::destination-bucket",
          "StorageClass": "STANDARD_IA"
        }
      }
    ]
  }'
```

Also consider the storage class at the destination. If replicated data is primarily for disaster recovery, using STANDARD_IA or even GLACIER at the destination saves on storage costs too.

## Compress Data Before Cross-Region Transfer

Compression is the simplest and most universally applicable optimization. If you're transferring text-based data (logs, JSON, CSV), compression typically reduces size by 70-90%.

For application-level API calls between regions:

```python
import requests
import gzip
import json

def send_cross_region(data, target_url):
    """Send compressed data to a service in another region"""
    serialized = json.dumps(data).encode('utf-8')
    compressed = gzip.compress(serialized, compresslevel=6)

    # compresslevel 6 gives good compression with reasonable CPU cost
    savings_pct = (1 - len(compressed) / len(serialized)) * 100
    print(f"Compressed {len(serialized)} -> {len(compressed)} bytes ({savings_pct:.0f}% reduction)")

    response = requests.post(
        target_url,
        data=compressed,
        headers={
            'Content-Encoding': 'gzip',
            'Content-Type': 'application/json'
        }
    )
    return response
```

For S3 objects, compress before uploading:

```python
import boto3
import gzip

s3 = boto3.client('s3')

def upload_compressed_to_remote_region(data, bucket, key, region):
    """Upload compressed data to a bucket in another region"""
    remote_s3 = boto3.client('s3', region_name=region)

    compressed = gzip.compress(data.encode('utf-8'))

    remote_s3.put_object(
        Bucket=bucket,
        Key=f"{key}.gz",
        Body=compressed,
        ContentEncoding='gzip'
    )
```

## Use CloudFront for Multi-Region Content Delivery

Instead of replicating S3 data to multiple regions for end-user access, use CloudFront with a single origin. CloudFront caches content at edge locations worldwide, and origin fetch traffic from CloudFront to S3 doesn't incur cross-region transfer charges in many cases.

```bash
# Create a CloudFront distribution with a single S3 origin
aws cloudfront create-distribution \
  --distribution-config '{
    "CallerReference": "my-global-distribution",
    "Origins": {
      "Quantity": 1,
      "Items": [
        {
          "Id": "S3Origin",
          "DomainName": "my-bucket.s3.us-east-1.amazonaws.com",
          "S3OriginConfig": {
            "OriginAccessIdentity": "origin-access-identity/cloudfront/EXAMPLE"
          }
        }
      ]
    },
    "DefaultCacheBehavior": {
      "TargetOriginId": "S3Origin",
      "ViewerProtocolPolicy": "redirect-to-https",
      "AllowedMethods": {"Quantity": 2, "Items": ["GET", "HEAD"]},
      "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6",
      "Compress": true
    },
    "Enabled": true,
    "Comment": "Global content distribution without cross-region replication"
  }'
```

This eliminates the need for S3 CRR entirely for read-heavy workloads and often provides better latency too.

## Optimize Database Replication

Cross-region database replication can be a major transfer cost driver.

**For RDS:** Consider whether you truly need a cross-region read replica, or if it's mainly for DR. If it's for DR, AWS Backup with cross-region copy is much cheaper than continuous replication:

```bash
# Set up cross-region backup copy instead of a live replica
aws backup create-backup-plan \
  --backup-plan '{
    "BackupPlanName": "CrossRegionDR",
    "Rules": [
      {
        "RuleName": "DailyBackup",
        "TargetBackupVaultName": "Default",
        "ScheduleExpression": "cron(0 2 * * ? *)",
        "Lifecycle": {"DeleteAfterDays": 30},
        "CopyActions": [
          {
            "DestinationBackupVaultArn": "arn:aws:backup:eu-west-1:123456789012:backup-vault:DR-Vault",
            "Lifecycle": {"DeleteAfterDays": 7}
          }
        ]
      }
    ]
  }'
```

**For DynamoDB Global Tables:** Filter what gets replicated using DynamoDB Streams and Lambda instead of full global table replication:

```python
import boto3

dynamodb = boto3.resource('dynamodb', region_name='eu-west-1')
target_table = dynamodb.Table('critical-data-eu')

def lambda_handler(event, context):
    """Selectively replicate only critical records to remote region"""
    for record in event['Records']:
        if record['eventName'] in ['INSERT', 'MODIFY']:
            new_image = record['dynamodb']['NewImage']

            # Only replicate records flagged as critical
            if new_image.get('replicate', {}).get('BOOL', False):
                target_table.put_item(
                    Item=deserialize_dynamodb(new_image)
                )

    return {'processed': len(event['Records'])}
```

## Batch and Schedule Cross-Region Transfers

Instead of streaming data continuously between regions, batch it up. Sending 1GB once per hour is the same cost as streaming it continuously, but batching lets you compress more effectively and gives you the option to be selective about what gets transferred.

```python
import boto3
import gzip
import json
from datetime import datetime

s3 = boto3.client('s3')

def batch_transfer(records, target_bucket, target_region):
    """Batch and compress records for efficient cross-region transfer"""
    # Collect records into a batch
    batch = json.dumps(records).encode('utf-8')
    compressed = gzip.compress(batch)

    # Single compressed transfer instead of many individual transfers
    timestamp = datetime.now().strftime('%Y/%m/%d/%H%M')
    target_s3 = boto3.client('s3', region_name=target_region)

    target_s3.put_object(
        Bucket=target_bucket,
        Key=f"batches/{timestamp}/data.json.gz",
        Body=compressed
    )

    print(f"Transferred {len(records)} records as {len(compressed)} bytes "
          f"(vs {len(batch)} uncompressed)")
```

## Monitor Cross-Region Transfer Costs

Set up cost alerts specifically for data transfer:

```bash
# Create a budget alert for data transfer costs
aws budgets create-budget \
  --account-id 123456789012 \
  --budget '{
    "BudgetName": "CrossRegionTransfer",
    "BudgetLimit": {"Amount": "500", "Unit": "USD"},
    "TimeUnit": "MONTHLY",
    "BudgetType": "COST",
    "CostFilters": {
      "UsageType": ["USE1-EUW1-AWS-Out-Bytes", "USE1-USE2-AWS-Out-Bytes"]
    }
  }' \
  --notifications-with-subscribers '[
    {
      "Notification": {
        "NotificationType": "ACTUAL",
        "ComparisonOperator": "GREATER_THAN",
        "Threshold": 80
      },
      "Subscribers": [
        {"SubscriptionType": "EMAIL", "Address": "team@example.com"}
      ]
    }
  ]'
```

## Summary

The most effective strategies for reducing cross-region transfer costs are:

1. **Be selective** - Don't replicate everything. Filter by prefix, tag, or importance.
2. **Compress everything** - 70-90% reduction for text-based data is free savings.
3. **Use CloudFront** - Eliminates the need for cross-region S3 replication for read workloads.
4. **Batch transfers** - Combine and compress instead of streaming individual records.
5. **Question the architecture** - Sometimes a single-region design with CloudFront is better than true multi-region.

For related cost optimization strategies, see our posts on [reducing S3 data transfer costs](https://oneuptime.com/blog/post/2026-02-12-reduce-s3-data-transfer-costs/view) and [reducing data transfer costs between VPCs](https://oneuptime.com/blog/post/2026-02-12-reduce-data-transfer-costs-between-vpcs/view).
