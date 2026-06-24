# How to Optimize AWS DynamoDB Costs with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, DynamoDB, Cost, State Management

Description: Optimize AWS DynamoDB costs when used as a Dapr state store by using on-demand capacity, TTL cleanup, partition key design, and DynamoDB Accelerator for read-heavy workloads.

---

## DynamoDB as a Dapr State Store

AWS DynamoDB is a popular choice for Dapr state management in AWS-hosted Kubernetes clusters. DynamoDB bills based on read/write capacity units and storage. Poorly configured tables generate unexpected costs through hot partition reads, unbounded storage growth, and over-provisioned throughput.

## Configure the Dapr DynamoDB Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "dapr-state"
  - name: region
    value: "us-east-1"
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: access-key
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secret-key
  - name: ttlAttributeName
    value: "ttl"
```

## Use On-Demand Capacity Mode

For variable or unpredictable workloads, switch from provisioned to on-demand capacity to eliminate over-provisioning costs:

```bash
aws dynamodb update-table \
  --table-name dapr-state \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

For steady, predictable workloads, provisioned capacity with auto-scaling is cheaper:

```bash
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id "table/dapr-state" \
  --scalable-dimension "dynamodb:table:ReadCapacityUnits" \
  --min-capacity 5 \
  --max-capacity 100
```

## Enable TTL to Control Storage Costs

Configure the TTL attribute in DynamoDB:

```bash
aws dynamodb update-time-to-live \
  --table-name dapr-state \
  --time-to-live-specification "Enabled=true,AttributeName=ttl"
```

In your Dapr state operations, set TTL values:

```javascript
await daprClient.state.save('statestore', [
  {
    key: 'session:xyz',
    value: sessionData,
    metadata: {
      ttlInSeconds: '3600'
    }
  }
]);
```

The `ttlAttributeName: "ttl"` in the Dapr component tells the DynamoDB provider which attribute to populate with the expiry timestamp.

## Design Partition Keys to Avoid Hot Partitions

DynamoDB throttles partitions that exceed their allocated capacity. Dapr uses the state key as the DynamoDB primary key by default. Design your state keys to distribute access:

```javascript
// Bad - all user state goes to partition "user"
await daprClient.state.save('statestore', [{ key: 'user', value: data }]);

// Good - state distributed by user ID
await daprClient.state.save('statestore', [{ key: `user:${userId}:profile`, value: data }]);
```

## Monitor DynamoDB Costs

Track consumed capacity and costs with CloudWatch:

```bash
# Get consumed read/write capacity
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name ConsumedWriteCapacityUnits \
  --dimensions Name=TableName,Value=dapr-state \
  --start-time 2026-03-30T00:00:00Z \
  --end-time 2026-03-31T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

Set a billing alert:

```bash
aws cloudwatch put-metric-alarm \
  --alarm-name dapr-dynamodb-cost-alert \
  --metric-name EstimatedCharges \
  --namespace AWS/Billing \
  --dimensions Name=Currency,Value=USD \
  --statistic Maximum \
  --period 86400 \
  --evaluation-periods 1 \
  --threshold 50 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789:billing-alerts
```

## Summary

DynamoDB costs with Dapr are managed through on-demand billing mode for variable workloads, TTL-based automatic record expiry to control storage, high-cardinality partition key design to avoid hot partitions, and provisioned capacity auto-scaling for predictable workloads. Monitor consumed capacity in CloudWatch and set billing alerts to catch unexpected cost spikes before they compound.
