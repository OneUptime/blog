# How to Fix DynamoDB 'ProvisionedThroughputExceededException' Errors

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Database, Performance, Troubleshooting

Description: Fix DynamoDB ProvisionedThroughputExceededException by understanding capacity units, enabling auto-scaling, fixing hot partitions, and switching to on-demand mode.

---

Your application is throwing this error from DynamoDB:

```
ProvisionedThroughputExceededException: The level of configured provisioned
throughput for the table was exceeded. Consider increasing your provisioning
level with the UpdateTable API.
```

This means you're trying to read or write data faster than your table's provisioned capacity allows. It's DynamoDB telling you to slow down. But "just increase the provisioned capacity" isn't always the right answer - sometimes the problem is deeper than that.

## Understanding DynamoDB Capacity

DynamoDB capacity is measured in Read Capacity Units (RCUs) and Write Capacity Units (WCUs):

- **1 RCU** = one strongly consistent read per second for items up to 4 KB
- **1 WCU** = one write per second for items up to 1 KB
- Eventually consistent reads use half an RCU

Check your current provisioned capacity and consumption:

```bash
# Check table capacity settings
aws dynamodb describe-table \
  --table-name my-table \
  --query 'Table.{Mode:BillingModeSummary.BillingMode,ReadCapacity:ProvisionedThroughput.ReadCapacityUnits,WriteCapacity:ProvisionedThroughput.WriteCapacityUnits}'
```

Check CloudWatch for throttling events:

```bash
# Check read throttle events
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ReadThrottleEvents \
  --dimensions Name=TableName,Value=my-table \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum

# Check write throttle events
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name WriteThrottleEvents \
  --dimensions Name=TableName,Value=my-table \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum
```

## Fix 1: Switch to On-Demand Mode

The easiest fix if you have unpredictable or spiky traffic. On-demand mode automatically scales to handle your request volume with no capacity planning needed.

```bash
# Switch to on-demand billing
aws dynamodb update-table \
  --table-name my-table \
  --billing-mode PAY_PER_REQUEST
```

On-demand costs more per request than provisioned capacity, but you never get throttled (within account limits). It's ideal for:
- Unpredictable workloads
- New applications where you don't know the traffic pattern yet
- Applications with sharp traffic spikes

You can switch between on-demand and provisioned once every 24 hours.

## Fix 2: Increase Provisioned Capacity

If you want to stick with provisioned mode:

```bash
# Increase read and write capacity
aws dynamodb update-table \
  --table-name my-table \
  --provisioned-throughput ReadCapacityUnits=500,WriteCapacityUnits=200
```

Increases take effect immediately. Decreases are limited to 4 per day.

## Fix 3: Enable Auto Scaling

Auto scaling adjusts your provisioned capacity based on actual usage:

```bash
# Register the table with Application Auto Scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/my-table" \
  --scalable-dimension "dynamodb:table:ReadCapacityUnits" \
  --min-capacity 10 \
  --max-capacity 1000

aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/my-table" \
  --scalable-dimension "dynamodb:table:WriteCapacityUnits" \
  --min-capacity 10 \
  --max-capacity 500

# Create scaling policies (target 70% utilization)
aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb \
  --resource-id "table/my-table" \
  --scalable-dimension "dynamodb:table:ReadCapacityUnits" \
  --policy-name "read-auto-scaling" \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
    },
    "ScaleInCooldown": 60,
    "ScaleOutCooldown": 60
  }'

aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb \
  --resource-id "table/my-table" \
  --scalable-dimension "dynamodb:table:WriteCapacityUnits" \
  --policy-name "write-auto-scaling" \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "DynamoDBWriteCapacityUtilization"
    },
    "ScaleInCooldown": 60,
    "ScaleOutCooldown": 60
  }'
```

Auto scaling reacts to increased usage, but it's not instant. It can take 1-2 minutes to scale up, so sudden spikes can still cause throttling.

## Fix 4: Don't Forget GSI Capacity

Global Secondary Indexes have their own provisioned capacity, separate from the base table. If your GSI is throttled, writes to the base table will also be throttled (because DynamoDB needs to propagate writes to GSIs).

```bash
# Check GSI capacity
aws dynamodb describe-table \
  --table-name my-table \
  --query 'Table.GlobalSecondaryIndexes[*].{IndexName:IndexName,ReadCapacity:ProvisionedThroughput.ReadCapacityUnits,WriteCapacity:ProvisionedThroughput.WriteCapacityUnits}'

# Update GSI capacity
aws dynamodb update-table \
  --table-name my-table \
  --global-secondary-index-updates '[{
    "Update": {
      "IndexName": "my-gsi",
      "ProvisionedThroughput": {
        "ReadCapacityUnits": 200,
        "WriteCapacityUnits": 100
      }
    }
  }]'
```

Don't forget to set up auto scaling for GSIs too:

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/my-table/index/my-gsi" \
  --scalable-dimension "dynamodb:index:ReadCapacityUnits" \
  --min-capacity 10 \
  --max-capacity 500
```

## Fix 5: Address Hot Partition Issues

This is the trickiest cause. DynamoDB distributes data across partitions based on the partition key. If your access pattern hits the same partition key repeatedly, that single partition gets overwhelmed even if your overall capacity is sufficient.

Signs of a hot partition:
- Throttling happens even when overall capacity utilization is low
- Specific operations are throttled while others work fine

Common hot partition scenarios:

```python
# BAD: Using a date as partition key - all today's data hits one partition
table.put_item(Item={
    'date': '2024-01-15',   # Hot key! All writes for today go here
    'timestamp': '10:30:00',
    'data': 'some value'
})

# BETTER: Distribute across partitions using a shard suffix
import random

shard = random.randint(0, 9)
table.put_item(Item={
    'date_shard': f'2024-01-15#{shard}',  # Distributes across 10 partitions
    'timestamp': '10:30:00',
    'data': 'some value'
})
```

Other strategies for avoiding hot partitions:

```python
# Use a composite key that distributes better
# Instead of: PK = "STATUS", SK = timestamp
# Use: PK = "STATUS#<hash_suffix>", SK = timestamp

import hashlib

def get_distributed_pk(base_key, num_shards=10):
    """Create a distributed partition key."""
    shard = int(hashlib.md5(str(time.time()).encode()).hexdigest(), 16) % num_shards
    return f"{base_key}#{shard}"
```

## Fix 6: Implement Exponential Backoff

The AWS SDK has built-in retry logic with exponential backoff, but make sure it's properly configured:

```python
import boto3
from botocore.config import Config

# Configure retries with exponential backoff
config = Config(
    retries={
        'max_attempts': 10,
        'mode': 'adaptive'  # Adaptive retry mode handles throttling better
    }
)

dynamodb = boto3.resource('dynamodb', config=config)
table = dynamodb.Table('my-table')
```

In Node.js:

```javascript
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({
  maxAttempts: 10,
  retryMode: 'adaptive',
});
```

The `adaptive` retry mode is specifically designed to handle throttling. It adjusts retry delays based on the throttling response.

## Fix 7: Use Batch Operations Wisely

Batch writes can help or hurt depending on how you use them:

```python
# Efficient: Batch write with error handling
def batch_write_with_retry(table, items):
    """Write items in batches with retry for unprocessed items."""
    with table.batch_writer() as batch:
        for item in items:
            batch.put_item(Item=item)
    # boto3's batch_writer automatically handles unprocessed items
```

But be aware that batch operations can concentrate load if all items hit the same partition.

## Fix 8: Use DynamoDB DAX for Read-Heavy Workloads

If your throttling is on reads, DynamoDB Accelerator (DAX) can cache reads and reduce the load on your table:

```bash
# Create a DAX cluster
aws dax create-cluster \
  --cluster-name my-cache \
  --node-type dax.r5.large \
  --replication-factor 3 \
  --iam-role-arn arn:aws:iam::123456789012:role/dax-role \
  --subnet-group-name my-subnet-group
```

DAX provides microsecond-latency reads and absorbs read traffic that would otherwise hit your table.

## Monitoring Throttling

Set up alarms so you know about throttling immediately:

```bash
# Alarm for write throttling
aws cloudwatch put-metric-alarm \
  --alarm-name "dynamodb-write-throttling" \
  --metric-name WriteThrottleEvents \
  --namespace AWS/DynamoDB \
  --statistic Sum \
  --period 300 \
  --threshold 10 \
  --comparison-operator GreaterThanThreshold \
  --dimensions Name=TableName,Value=my-table \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

For comprehensive DynamoDB monitoring including capacity utilization, throttling trends, and partition-level analysis, [OneUptime](https://oneuptime.com/blog/post/aws-cloudwatch-alternatives/view) can help you visualize your DynamoDB performance and catch throttling before it impacts users.

## Summary

The right fix depends on your situation:

1. **Unpredictable traffic?** Switch to on-demand mode
2. **Steady traffic with occasional spikes?** Use auto scaling
3. **Hot partitions?** Redesign your key schema
4. **Read-heavy?** Add DAX caching
5. **GSIs throttled?** Scale GSI capacity separately
6. **Always** implement proper retry logic with exponential backoff

Start by checking whether it's an overall capacity issue or a hot partition issue - the fix is very different for each.
