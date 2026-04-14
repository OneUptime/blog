# How to Use Dapr with KEDA for Auto-Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, KEDA, Auto-Scaling, Kubernetes, Pub/Sub

Description: Learn how to integrate Dapr with KEDA to auto-scale consumer services based on message queue depth and other custom metrics.

---

## Overview

KEDA (Kubernetes Event-Driven Autoscaler) extends HPA to scale based on external metrics like message queue length. When combined with Dapr, KEDA can scale your pub/sub consumers up and down based on actual backlog, including scaling to zero when there are no messages.

## Installing KEDA

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update
helm install keda kedacore/keda --namespace keda --create-namespace
```

## Scaling a Kafka Consumer with KEDA

Deploy your Dapr consumer service:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-consumer
spec:
  replicas: 1   # KEDA will manage this
  template:
    metadata:
      annotations:
        dapr.io/enabled: "true"
        dapr.io/app-id: "order-consumer"
        dapr.io/app-port: "8080"
```

Create a KEDA ScaledObject targeting Kafka lag:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-consumer-scaledobject
spec:
  scaleTargetRef:
    name: order-consumer
  pollingInterval: 15    # Check every 15 seconds
  cooldownPeriod: 30     # Wait 30s before scaling down
  minReplicaCount: 0     # Scale to zero when no messages
  maxReplicaCount: 20
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka-service:9092
      consumerGroup: dapr-order-consumer
      topic: orders
      lagThreshold: "100"   # 1 replica per 100 messages of lag
      offsetResetPolicy: latest
```

## Scaling with Redis Pub/Sub

For Redis-backed Dapr pub/sub, use the Redis stream scaler:

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: redis-consumer-scaler
spec:
  scaleTargetRef:
    name: redis-consumer
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: redis-streams
    metadata:
      address: redis:6379
      stream: dapr-pubsub-stream
      consumerGroup: my-group
      pendingEntriesCount: "50"  # Scale per 50 pending entries
    authenticationRef:
      name: redis-trigger-auth
```

## Creating a TriggerAuthentication for Secured Brokers

```yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: redis-trigger-auth
spec:
  secretTargetRef:
  - parameter: password
    name: redis-secret
    key: password
```

## Scale to Zero with Traffic Restoration

When KEDA scales the deployment from zero, a new pod is created with a fresh Dapr sidecar. The message broker (e.g., Kafka) retains messages regardless of consumer availability, so the consumer rejoins its consumer group and resumes processing from the last committed offset:

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "orders",
        "route": "/process-order"
    }])

@app.route('/process-order', methods=['POST'])
def process_order():
    envelope = request.json
    # Process the order...
    return jsonify({"status": "processed"}), 200
```

## Monitoring KEDA Scaling Events

```bash
# Watch scaling events for ScaledObjects
kubectl get events --field-selector involvedObject.kind=ScaledObject -w

# Check ScaledObject status
kubectl describe scaledobject order-consumer-scaledobject

# View current replica count
kubectl get hpa -l scaledobject.keda.sh/name=order-consumer-scaledobject
```

## Summary

KEDA and Dapr work together to provide event-driven autoscaling for microservices. Configure KEDA ScaledObjects to target your Dapr app deployments and trigger on the message broker metrics that Dapr components use. Scale-to-zero capability reduces costs during off-peak hours while ensuring capacity scales up automatically as message backlog grows.
