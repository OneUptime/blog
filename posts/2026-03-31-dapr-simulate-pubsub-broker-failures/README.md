# How to Simulate Pub/Sub Broker Failures for Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pub/Sub, Kafka, Failure, Chaos Engineering

Description: Simulate message broker failures for Dapr pub/sub applications using pod chaos, network partitions, and Toxiproxy to validate message durability and retry behavior.

---

## Understanding Dapr Pub/Sub Failure Modes

Dapr pub/sub abstracts over brokers like Kafka, Redis Streams, and RabbitMQ. Failures can occur at multiple levels:
- Broker pod crash or restart
- Network partition between sidecar and broker
- Message backlog causing consumer lag
- Dead letter queue overflow

## Scenario 1: Kill the Kafka Broker Pod

```bash
# Find Kafka pods
kubectl get pods | grep kafka

# Kill a Kafka broker (for a 3-broker cluster, this tests leader election)
kubectl delete pod kafka-0

# Watch for subscriber recovery
kubectl logs -l app=ordersubscriber -c daprd -f | grep -E "error|reconnect|kafka"
```

After the Kafka pod restarts (via StatefulSet), Dapr should automatically reconnect and resume message consumption.

## Scenario 2: Network Partition via Chaos Mesh

Partition the subscriber from the Kafka broker:

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: kafka-network-partition
  namespace: default
spec:
  action: partition
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: ordersubscriber
  direction: both
  target:
    mode: all
    selector:
      namespaces:
        - default
      labelSelectors:
        app: kafka
  duration: "2m"
```

```bash
kubectl apply -f kafka-partition.yaml
```

## Scenario 3: Toxiproxy for Kafka Latency

```bash
# Create Kafka proxy
toxiproxy-cli create kafka-proxy \
  --listen 0.0.0.0:9093 \
  --upstream kafka-service:9092

# Simulate broker slowness
toxiproxy-cli toxic add kafka-proxy \
  -t latency \
  -a latency=3000 \
  -n kafka-latency

# Simulate connection drops
toxiproxy-cli toxic add kafka-proxy \
  -t reset_peer \
  -a timeout=5000 \
  -n kafka-reset
```

Update Dapr pub/sub component to use Toxiproxy:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: pubsub
spec:
  type: pubsub.kafka
  version: v1
  metadata:
    - name: brokers
      value: "localhost:9093"  # Toxiproxy port
    - name: consumerGroup
      value: "orderservice-group"
    - name: authType
      value: "none"
```

## Verify Dead Letter Queue Behavior

Configure a dead letter topic for failed messages:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: order-subscription
spec:
  topic: orders
  pubsubname: pubsub
  route: /orders
  deadLetterTopic: orders-dlq
  bulkSubscribe:
    enabled: true
    maxMessagesCount: 100
```

Publish test messages and verify they flow to DLQ during broker failure:

```bash
# Publish messages
curl -X POST http://localhost:3500/v1.0/publish/pubsub/orders \
  -H "Content-Type: application/json" \
  -d '{"orderId": "123", "status": "created"}'

# Check DLQ messages
kubectl exec -it kafka-0 -- kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 \
  --topic orders-dlq \
  --from-beginning
```

## Monitor Pub/Sub Metrics

```bash
# Check Dapr pub/sub drop count
curl -s http://localhost:9090/api/v1/query \
  --data-urlencode 'query=dapr_component_pubsub_egress_count{app_id="orderpublisher",success="false"}'
```

## Summary

Simulating Dapr pub/sub broker failures validates that messages are durably handled, dead letter queues capture unprocessable messages, and subscriber services reconnect automatically after broker recovery. Using Chaos Mesh for Kubernetes-level failures and Toxiproxy for local testing provides comprehensive coverage of broker fault scenarios.
