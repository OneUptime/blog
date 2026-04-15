# How to Configure DynamoDB Read/Write Capacity for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, DynamoDB, AWS, State Store, Capacity Unit

Description: Learn how to configure DynamoDB read and write capacity units for Dapr state stores, choosing between provisioned and on-demand modes for cost efficiency.

---

## DynamoDB Capacity Modes for Dapr State

Amazon DynamoDB offers two capacity modes: provisioned (predictable workloads, lower cost) and on-demand (variable workloads, pay per request). Dapr's DynamoDB state store component maps state operations to DynamoDB read/write operations, so capacity planning follows standard DynamoDB patterns.

## Creating the DynamoDB Table

Create a DynamoDB table sized for Dapr state:

```bash
# On-demand mode (recommended for variable traffic)
aws dynamodb create-table \
  --table-name DaprStateStore \
  --attribute-definitions \
    AttributeName=key,AttributeType=S \
  --key-schema \
    AttributeName=key,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Provisioned mode (predictable traffic)
aws dynamodb create-table \
  --table-name DaprStateStore \
  --attribute-definitions \
    AttributeName=key,AttributeType=S \
  --key-schema \
    AttributeName=key,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=100,WriteCapacityUnits=50 \
  --region us-east-1
```

## Dapr DynamoDB State Store Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: dynamodb-statestore
  namespace: production
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "DaprStateStore"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-secret
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-secret
      key: secretKey
  - name: ttlAttributeName
    value: "TTL"
  - name: partitionKey
    value: "key"
```

## Auto Scaling for Provisioned Mode

Configure DynamoDB auto-scaling to handle traffic spikes:

```bash
# Register the table as a scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/DaprStateStore" \
  --scalable-dimension "dynamodb:table:WriteCapacityUnits" \
  --min-capacity 10 \
  --max-capacity 1000

# Create scaling policy for write capacity
aws application-autoscaling put-scaling-policy \
  --service-namespace dynamodb \
  --resource-id "table/DaprStateStore" \
  --scalable-dimension "dynamodb:table:WriteCapacityUnits" \
  --policy-name DaprWriteScalingPolicy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "DynamoDBWriteCapacityUtilization"
    }
  }'
```

## Calculating Required Capacity

Estimate capacity based on Dapr state operations:

```python
def calculate_dynamodb_capacity(
    state_writes_per_sec: int,
    state_reads_per_sec: int,
    avg_item_size_kb: float
) -> dict:
    # DynamoDB capacity: 1 WCU = 1KB write/sec, 1 RCU = 4KB read/sec
    wcu = state_writes_per_sec * max(1, avg_item_size_kb)
    rcu = state_reads_per_sec * max(1, avg_item_size_kb / 4)

    # Add 30% buffer for burst
    return {
        "recommendedWCU": round(wcu * 1.3),
        "recommendedRCU": round(rcu * 1.3),
        "monthlyProvisionedCost": round(wcu * 1.3 * 0.00065 * 730 + rcu * 1.3 * 0.00013 * 730, 2)
    }

# Example: 200 writes/sec, 500 reads/sec, 2KB items
cap = calculate_dynamodb_capacity(200, 500, 2.0)
print(cap)
# {"recommendedWCU": 520, "recommendedRCU": 650, "monthlyProvisionedCost": 308.42}
```

## Handling ProvisionedThroughputExceededException

Configure Dapr resiliency to retry on throttling:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: dynamodb-resiliency
spec:
  policies:
    retries:
      dynamoRetry:
        policy: exponential
        initialInterval: 100ms
        maxInterval: 5s
        maxRetries: 5
  targets:
    components:
      dynamodb-statestore:
        outbound:
          retry: dynamoRetry
```

## Monitoring Consumed Capacity

```bash
# Check consumed capacity metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=DaprStateStore \
  --start-time 2026-03-31T00:00:00Z \
  --end-time 2026-03-31T01:00:00Z \
  --period 300 \
  --statistics Average
```

## Summary

DynamoDB on-demand mode is the recommended choice for Dapr state stores with unpredictable traffic since it scales automatically without capacity planning. For steady, predictable workloads, provisioned mode with auto-scaling reduces costs by 40-70% compared to on-demand. Dapr resiliency policies handle `ProvisionedThroughputExceededException` with exponential backoff, preventing failures during short-term capacity spikes.
