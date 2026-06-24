# How to Scale Dapr Applications Horizontally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scaling, Kubernetes, HPA, Horizontal

Description: Learn how to horizontally scale Dapr applications using Kubernetes HPA, KEDA, and Dapr-aware scaling patterns for stateful and stateless services.

---

## Overview

Dapr applications scale horizontally by adding more pod replicas. Each replica gets its own sidecar, and Dapr handles service discovery and load balancing automatically. However, stateful operations and pub/sub subscriptions require special consideration when scaling.

## Scaling Stateless Services

Stateless services scale transparently - Dapr's service discovery picks up new replicas:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
spec:
  replicas: 5
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "api-service"
        dapr.io/app-port: "8080"
```

Verify Dapr sees all replicas:

```bash
kubectl get endpoints api-service-dapr
# All pod IPs should appear
```

## Horizontal Pod Autoscaler (HPA)

Scale based on CPU utilization:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: api-service-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api-service
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 60
  - type: Resource
    resource:
      name: memory
      target:
        type: AverageValue
        averageValue: 200Mi
```

## Scaling Pub/Sub Consumers

For pub/sub consumers, Dapr distributes partitions across replicas automatically for supported brokers. Ensure your topic has enough partitions:

```bash
# Create Kafka topic with sufficient partitions
kafka-topics.sh --create \
  --bootstrap-server kafka:9092 \
  --topic orders \
  --partitions 20 \
  --replication-factor 3
```

Set the consumer deployment replicas to match:

```yaml
spec:
  replicas: 20  # One consumer per partition
```

## Actor Distribution

Dapr actors automatically distribute across replicas when you scale:

```python
from dapr.actor import Actor, ActorInterface, ActorRuntime

class OrderActor(Actor, OrderActorInterface):
    async def process_order(self, order_data: dict) -> str:
        # Actor is automatically placed on a specific pod
        await self._state_manager.set_state("order", order_data)
        return "processed"
```

Dapr's placement service tracks actor locations and routes calls to the correct pod.

## Scaling with Resource Awareness

Account for sidecar resources when setting replica limits:

```bash
# Calculate per-pod resource usage
APP_CPU=200m
APP_MEM=256Mi
SIDECAR_CPU=100m
SIDECAR_MEM=128Mi

# Total per pod: 300m CPU, 384Mi memory
# For 20 replicas: 6000m CPU, 7.5Gi memory
```

## Testing Scale-Out Behavior

Verify that scaled pods receive traffic evenly:

```bash
# While scaling is happening, send requests and watch distribution
for i in $(seq 1 100); do
  curl -s http://localhost:3500/v1.0/invoke/api-service/method/hello | \
    python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('host','unknown'))"
done | sort | uniq -c
```

## Summary

Dapr applications scale horizontally by adding pod replicas - Dapr's service discovery automatically includes new replicas. Use Kubernetes HPA for CPU/memory-based autoscaling, ensure pub/sub topics have sufficient partitions to distribute work across consumers, and account for sidecar resource usage when calculating cluster capacity requirements.
