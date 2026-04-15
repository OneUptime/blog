# How to Implement Active-Active Dapr Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Active-Active, High Availability, Multi-Region, Architecture

Description: Learn how to deploy Dapr services in an active-active multi-region configuration where all regions serve live traffic simultaneously, with conflict-free state and event deduplication.

---

## What Is Active-Active?

In active-active deployments, multiple regions simultaneously serve live traffic rather than one active and one standby. Each region processes requests independently, which provides zero-downtime during regional failures and allows horizontal scaling across geography. The challenge is managing state consistency and preventing duplicate event processing.

## Architecture Overview

```text
Region US-East              Region EU-West
  +-------------------+      +-------------------+
  | Load Balancer     |      | Load Balancer     |
  | Services          | <--> | Services          |
  | Dapr Runtime      |      | Dapr Runtime      |
  | Redis Cluster     |      | Redis Cluster     |
  | Kafka (active)    |      | Kafka (active)    |
  +-------------------+      +-------------------+
         |                          |
         +----------- CRDT ----------+
              (conflict-free sync)
```

## Conflict-Free State with Redis CRDT

Use Redis Enterprise with Active-Active CRDT replication for conflict-free state across regions:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore-aa
  namespace: production
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis-aa-local.internal:6379"
  - name: redisPassword
    secretKeyRef:
      name: redis-aa-secret
      key: password
  - name: enableTLS
    value: "true"
```

For standard Redis, use region-prefixed keys to avoid conflicts:

```go
package main

import (
    "context"
    "fmt"
    "os"
    dapr "github.com/dapr/go-sdk/client"
)

var REGION = os.Getenv("CLUSTER_REGION") // "us-east" or "eu-west"

// Generate region-aware state key to avoid conflicts
func regionalKey(key string) string {
    return fmt.Sprintf("%s:%s", REGION, key)
}

func saveRegionalState(ctx context.Context, client dapr.Client, key string, value []byte) error {
    return client.SaveState(ctx, "statestore-aa", regionalKey(key), value, nil)
}
```

## Pub/Sub Deduplication in Active-Active

Prevent duplicate event processing when both regions consume the same topics:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub-aa
  namespace: production
spec:
  type: pubsub.kafka
  version: v1
  metadata:
  - name: brokers
    value: "kafka-local.internal:9092"
  - name: consumerGroup
    value: "production-us-east"
  - name: clientID
    value: "dapr-us-east"
```

Each region uses a distinct consumer group so each receives all events independently.

Add idempotency checks at the application level:

```python
from dapr.clients import DaprClient

def process_order(order_id: str, event_data: dict):
    idempotency_key = f"processed:{order_id}"

    with DaprClient() as client:
        # Check if this event was already processed in this region
        existing = client.get_state(
            store_name="statestore-aa",
            key=idempotency_key
        )
        if existing.data:
            print(f"Order {order_id} already processed, skipping")
            return

        # Process the order
        process_logic(event_data)

        # Mark as processed with TTL
        client.save_state(
            store_name="statestore-aa",
            key=idempotency_key,
            value="processed",
            state_metadata={"ttlInSeconds": "86400"}
        )
```

## Global Load Balancing

Route traffic to the nearest region using Cloudflare or AWS Route53:

```bash
# Example: AWS Route53 latency-based routing
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890 \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.myapp.com",
          "Type": "A",
          "SetIdentifier": "us-east-1",
          "Region": "us-east-1",
          "TTL": 60,
          "ResourceRecords": [{"Value": "1.2.3.4"}],
          "HealthCheckId": "us-east-health-check-id"
        }
      }
    ]
  }'
```

## Monitoring Active-Active Consistency

Track consistency metrics across regions:

```bash
# Compare state counts between regions
US_EAST_COUNT=$(kubectl exec -n production deployment/monitoring -- \
  redis-cli -h us-east-redis DBSIZE)
EU_WEST_COUNT=$(kubectl exec -n production deployment/monitoring -- \
  redis-cli -h eu-west-redis DBSIZE)

echo "US-East state entries: $US_EAST_COUNT"
echo "EU-West state entries: $EU_WEST_COUNT"
DIFF=$((US_EAST_COUNT - EU_WEST_COUNT))
echo "Difference: $DIFF"
```

## Summary

Active-active Dapr deployments run all regions as live traffic handlers simultaneously, providing zero failover time and geographic scalability. Use Redis Enterprise CRDT or region-prefixed keys for conflict-free state management, assign unique consumer group names per region for independent pub/sub processing, and implement idempotency checks to prevent duplicate order processing. Configure latency-based global load balancing with health checks to automatically route users to the nearest healthy region without manual intervention.
