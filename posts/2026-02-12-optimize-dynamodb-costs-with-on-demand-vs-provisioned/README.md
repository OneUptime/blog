# How to Optimize DynamoDB Costs with On-Demand vs Provisioned

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, DynamoDB, Cost Optimization, Database, NoSQL

Description: Understand when to use DynamoDB on-demand versus provisioned capacity mode, and how to optimize costs with auto-scaling, reserved capacity, and table analysis.

---

DynamoDB pricing seems straightforward until you realize picking the wrong capacity mode can cost you 5-7x more than necessary. On-demand mode is convenient but expensive for steady workloads. Provisioned mode is cheaper but risky if you underestimate capacity and start getting throttled requests.

The right choice depends entirely on your traffic patterns. Let's break it down with real numbers.

## On-Demand vs Provisioned: The Price Difference

Here's the cost comparison for 1 million write requests per day in us-east-1:

**On-demand mode:**
- Write request units: $1.25 per million
- 1M writes/day x 30 days = 30M writes/month
- Monthly cost: $37.50

**Provisioned mode (steady traffic):**
- You need about 12 WCUs (writes per second) to handle 1M writes/day
- 12 WCUs x $0.00065/hour x 730 hours = $5.69/month
- Monthly cost: $5.69

That's a 6.6x difference. For reads, the gap is similar - on-demand is about 5-7x more expensive than well-provisioned capacity.

But here's the catch: provisioned mode only works this well if your traffic is predictable. If traffic spikes 10x during peak hours and you've provisioned for average load, you'll get throttled. If you provision for peak, you're paying for unused capacity during quiet hours.

## When to Use Each Mode

**Use on-demand when:**
- Traffic is unpredictable or spiky
- You're launching a new product and don't know the traffic pattern yet
- The table handles infrequent batch loads
- Development and testing environments
- Traffic varies by more than 4x between peak and trough

**Use provisioned (with auto-scaling) when:**
- Traffic follows a predictable pattern
- The table has consistent baseline load
- Cost optimization is a priority
- Traffic peaks are within 2-4x of the baseline

## Analyzing Your Current Usage

Before switching modes, understand your actual traffic patterns:

```python
import boto3
from datetime import datetime, timedelta

cw = boto3.client('cloudwatch')

def analyze_dynamodb_usage(table_name, days=14):
    """Analyze read and write patterns for a DynamoDB table"""
    end = datetime.utcnow()
    start = end - timedelta(days=days)

    # Get consumed write capacity
    writes = cw.get_metric_statistics(
        Namespace='AWS/DynamoDB',
        MetricName='ConsumedWriteCapacityUnits',
        Dimensions=[{'Name': 'TableName', 'Value': table_name}],
        StartTime=start,
        EndTime=end,
        Period=3600,  # Hourly granularity
        Statistics=['Sum', 'Maximum']
    )

    # Get consumed read capacity
    reads = cw.get_metric_statistics(
        Namespace='AWS/DynamoDB',
        MetricName='ConsumedReadCapacityUnits',
        Dimensions=[{'Name': 'TableName', 'Value': table_name}],
        StartTime=start,
        EndTime=end,
        Period=3600,
        Statistics=['Sum', 'Maximum']
    )

    # Analyze write patterns
    write_sums = [dp['Sum'] for dp in sorted(writes['Datapoints'], key=lambda x: x['Timestamp'])]
    if write_sums:
        avg_writes_per_hour = sum(write_sums) / len(write_sums)
        max_writes_per_hour = max(write_sums)
        min_writes_per_hour = min(w for w in write_sums if w > 0) if any(w > 0 for w in write_sums) else 0

        peak_to_avg_ratio = max_writes_per_hour / avg_writes_per_hour if avg_writes_per_hour > 0 else 0

        print(f"Table: {table_name}")
        print(f"\nWrite Pattern (past {days} days):")
        print(f"  Avg writes/hour:  {avg_writes_per_hour:,.0f}")
        print(f"  Max writes/hour:  {max_writes_per_hour:,.0f}")
        print(f"  Min writes/hour:  {min_writes_per_hour:,.0f}")
        print(f"  Peak/Avg ratio:   {peak_to_avg_ratio:.1f}x")

        # Recommendation
        if peak_to_avg_ratio > 4:
            print(f"\n  Recommendation: ON-DEMAND (high variability - {peak_to_avg_ratio:.1f}x peak/avg)")
        else:
            avg_wcu = avg_writes_per_hour / 3600
            peak_wcu = max_writes_per_hour / 3600
            print(f"\n  Recommendation: PROVISIONED with auto-scaling")
            print(f"  Suggested base WCU: {avg_wcu:.0f}")
            print(f"  Suggested max WCU:  {peak_wcu * 1.2:.0f}")

    # Cost comparison
    total_writes = sum(write_sums)
    total_reads = sum([dp['Sum'] for dp in reads['Datapoints']])

    # On-demand cost
    od_write_cost = (total_writes / 1_000_000) * 1.25 * (30 / days)
    od_read_cost = (total_reads / 1_000_000) * 0.25 * (30 / days)

    # Provisioned cost (using average as base)
    if write_sums:
        avg_wcu = sum(write_sums) / len(write_sums) / 3600
        prov_write_cost = avg_wcu * 1.2 * 0.00065 * 730  # 20% headroom

    read_sums = [dp['Sum'] for dp in reads['Datapoints']]
    if read_sums:
        avg_rcu = sum(read_sums) / len(read_sums) / 3600
        prov_read_cost = avg_rcu * 1.2 * 0.00013 * 730

    print(f"\nCost Comparison (estimated monthly):")
    print(f"  On-demand:    ${od_write_cost + od_read_cost:.2f}")
    print(f"  Provisioned:  ${prov_write_cost + prov_read_cost:.2f}")
    print(f"  Savings:      ${(od_write_cost + od_read_cost) - (prov_write_cost + prov_read_cost):.2f}")

analyze_dynamodb_usage('my-table')
```

## Switching Between Modes

You can switch a table's capacity mode, but there are limits - you can only switch once every 24 hours:

```bash
# Switch to on-demand mode
aws dynamodb update-table \
  --table-name my-table \
  --billing-mode PAY_PER_REQUEST

# Switch to provisioned mode with auto-scaling
aws dynamodb update-table \
  --table-name my-table \
  --billing-mode PROVISIONED \
  --provisioned-throughput ReadCapacityUnits=50,WriteCapacityUnits=25
```

## Setting Up Auto-Scaling for Provisioned Mode

Auto-scaling is critical for provisioned mode. It adjusts capacity based on actual usage, giving you cost savings without the risk of throttling:

```bash
# Register the table as a scalable target for writes
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/my-table" \
  --scalable-dimension "dynamodb:table:WriteCapacityUnits" \
  --min-capacity 5 \
  --max-capacity 500

# Create a scaling policy for writes (target 70% utilization)
aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb \
  --resource-id "table/my-table" \
  --scalable-dimension "dynamodb:table:WriteCapacityUnits" \
  --policy-name "WriteAutoScaling" \
  --policy-type "TargetTrackingScaling" \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "DynamoDBWriteCapacityUtilization"
    },
    "ScaleInCooldown": 60,
    "ScaleOutCooldown": 60
  }'

# Do the same for reads
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/my-table" \
  --scalable-dimension "dynamodb:table:ReadCapacityUnits" \
  --min-capacity 10 \
  --max-capacity 1000

aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb \
  --resource-id "table/my-table" \
  --scalable-dimension "dynamodb:table:ReadCapacityUnits" \
  --policy-name "ReadAutoScaling" \
  --policy-type "TargetTrackingScaling" \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "DynamoDBReadCapacityUtilization"
    },
    "ScaleInCooldown": 60,
    "ScaleOutCooldown": 60
  }'
```

Set the target utilization to 70% for a good balance between cost and performance headroom. Going higher risks throttling during sudden spikes.

## Reserved Capacity for Predictable Workloads

If your DynamoDB usage is stable and you're confident in the long-term need, reserved capacity provides additional savings on top of provisioned mode:

- **1-year term**: ~53% savings over on-demand pricing
- **3-year term**: ~76% savings over on-demand pricing

Reserved capacity is purchased in blocks of 100 WCUs or 100 RCUs. It makes sense when you have a consistent baseline that you're confident won't decrease.

```bash
# Check current provisioned capacity across all tables
aws dynamodb list-tables --query "TableNames" --output text | tr '\t' '\n' | while read table; do
  capacity=$(aws dynamodb describe-table \
    --table-name "$table" \
    --query "Table.{Name: TableName, Mode: BillingModeSummary.BillingMode, RCU: ProvisionedThroughput.ReadCapacityUnits, WCU: ProvisionedThroughput.WriteCapacityUnits}" \
    --output json)
  echo "$capacity"
done
```

## Optimizing Data Access Patterns

Beyond capacity mode, how you query DynamoDB affects costs:

**Use eventually consistent reads when possible.** They cost half as much as strongly consistent reads:

```python
import boto3

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('my-table')

# Strongly consistent read - 1 RCU per 4KB
response = table.get_item(
    Key={'pk': 'user#123'},
    ConsistentRead=True  # Costs 1 RCU per 4KB
)

# Eventually consistent read - 0.5 RCU per 4KB (half the cost)
response = table.get_item(
    Key={'pk': 'user#123'},
    ConsistentRead=False  # Costs 0.5 RCU per 4KB (default)
)
```

**Project only the attributes you need.** This reduces the amount of data read and the RCUs consumed:

```python
# Bad: reads entire item even if you only need two fields
response = table.get_item(Key={'pk': 'user#123'})

# Good: reads only the fields you need, reducing data transferred and RCUs
response = table.get_item(
    Key={'pk': 'user#123'},
    ProjectionExpression='username, email'
)
```

**Avoid scans.** Full table scans read every item in the table and consume massive amounts of RCUs:

```python
# Expensive: scans the entire table
response = table.scan(
    FilterExpression='age > :val',
    ExpressionAttributeValues={':val': 25}
)

# Cheaper: use a GSI with a query instead
response = table.query(
    IndexName='age-index',
    KeyConditionExpression='age_bracket = :bracket',
    ExpressionAttributeValues={':bracket': 'adult'}
)
```

## Monitoring and Alerting

Set up CloudWatch alarms for throttled requests, which indicate you need more capacity:

```bash
# Alert on throttled write requests
aws cloudwatch put-metric-alarm \
  --alarm-name "DynamoDB-WriteThrottled-my-table" \
  --metric-name WriteThrottleEvents \
  --namespace AWS/DynamoDB \
  --dimensions Name=TableName,Value=my-table \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:dynamodb-alerts
```

## Summary

The decision between on-demand and provisioned mode comes down to traffic predictability. Analyze your peak-to-average ratio: if it's above 4x, on-demand is probably cheaper when you factor in the provisioned headroom you'd need. Below 4x, provisioned with auto-scaling wins. For steady baselines, add reserved capacity for maximum savings.

For a broader look at database cost optimization, check out our guide on [reducing RDS costs with Reserved Instances](https://oneuptime.com/blog/post/2026-02-12-reduce-rds-costs-with-reserved-instances/view). And for overall AWS cost strategy, see [creating a cost optimization strategy for AWS](https://oneuptime.com/blog/post/2026-02-12-create-a-cost-optimization-strategy-for-aws/view).
