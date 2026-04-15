# How to Use DynamoDB Global Tables with Dapr State Store

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, AWS, DynamoDB, Global Table, State Store, Multi-Region

Description: Configure DynamoDB Global Tables with Dapr state store for multi-region active-active stateful microservices with low-latency global access.

---

## Overview

DynamoDB Global Tables provide automatic multi-region replication with active-active write capability. Using them as a Dapr state store enables globally distributed microservices where each region reads and writes to a local DynamoDB replica with sub-millisecond latency.

## Creating DynamoDB Global Tables

Set up a Global Table using the AWS CLI:

```bash
# Create the base table in us-east-1
aws dynamodb create-table \
  --table-name dapr-state \
  --attribute-definitions AttributeName=key,AttributeType=S \
  --key-schema AttributeName=key,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1

# Add replicas to other regions (DynamoDB Streams are auto-enabled for Global Tables v2)
aws dynamodb update-table \
  --table-name dapr-state \
  --replica-updates '[
    {"Create": {"RegionName": "eu-west-1"}},
    {"Create": {"RegionName": "ap-southeast-1"}}
  ]' \
  --region us-east-1

# Wait for replica creation
aws dynamodb describe-table --table-name dapr-state --region eu-west-1 \
  --query 'Table.TableStatus'
```

## Dapr Component Configuration Per Region

Deploy a region-specific Dapr component in each cluster:

```yaml
# us-east-1 cluster
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: dynamodb-state
  namespace: default
spec:
  type: state.aws.dynamodb
  version: v1
  metadata:
  - name: table
    value: "dapr-state"
  - name: region
    value: "us-east-1"
  - name: endpoint
    value: ""
  - name: accessKey
    secretKeyRef:
      name: aws-credentials
      key: accessKey
  - name: secretKey
    secretKeyRef:
      name: aws-credentials
      key: secretKey
  - name: ttlAttributeName
    value: "ttl"
```

```yaml
# eu-west-1 cluster - same table, different region
  - name: region
    value: "eu-west-1"
```

## IAM Role with IRSA (Recommended)

Use IAM Roles for Service Accounts instead of static credentials:

```bash
# Create IAM policy for DynamoDB access
aws iam create-policy \
  --policy-name DaprDynamoDBPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:UpdateItem",
        "dynamodb:Query",
        "dynamodb:DescribeTable"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/dapr-state"
    }]
  }'

# Annotate the Kubernetes service account for IRSA
kubectl annotate serviceaccount dapr \
  eks.amazonaws.com/role-arn=arn:aws:iam::123456789012:role/DaprDynamoDBRole \
  -n default
```

## Handling Conflict Resolution

Global Tables use last-writer-wins conflict resolution based on timestamps. Use Dapr ETags for application-level optimistic concurrency:

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateOptions, Concurrency
import json

def update_global_counter(counter_key: str, increment: int):
    with DaprClient() as client:
        max_retries = 5
        for attempt in range(max_retries):
            # Get current value with ETag
            response = client.get_state(
                store_name="dynamodb-state",
                key=counter_key
            )

            current = json.loads(response.data) if response.data else {"value": 0}
            current["value"] += increment
            current_etag = response.etag

            try:
                client.save_state(
                    store_name="dynamodb-state",
                    key=counter_key,
                    value=json.dumps(current),
                    etag=current_etag,
                    options=StateOptions(
                        concurrency=Concurrency.first_write
                    )
                )
                return current["value"]
            except Exception as e:
                if attempt == max_retries - 1:
                    raise
```

## TTL Configuration for State Expiration

```bash
# Enable TTL on the DynamoDB table
aws dynamodb update-time-to-live \
  --table-name dapr-state \
  --time-to-live-specification "Enabled=true,AttributeName=ttl" \
  --region us-east-1
```

## Summary

DynamoDB Global Tables with Dapr enables active-active multi-region state management without custom replication logic. Each region accesses its local DynamoDB replica for minimal latency, while AWS handles cross-region synchronization. Using IRSA eliminates static credentials, and Dapr's ETag-based optimistic concurrency handles write conflicts when multiple regions update the same key simultaneously.
