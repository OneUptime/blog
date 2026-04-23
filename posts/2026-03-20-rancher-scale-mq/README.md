# How to Scale Message Queue Clusters in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Message Queue, Scaling, RabbitMQ, Kafka

Description: Scale RabbitMQ, Kafka, and NATS message queue clusters in Rancher to handle increased throughput and storage demands without service interruption.

## Introduction

Scaling message queues requires careful consideration of data rebalancing, partition assignment, and consumer group coordination. This guide covers horizontal and vertical scaling of RabbitMQ, Kafka, and NATS in Rancher, including how to rebalance data after adding nodes and how to use Kubernetes HPA for consumer scaling.

## Prerequisites

- Existing message queue deployments (RabbitMQ, Kafka, or NATS)
- Rancher-managed cluster with available capacity
- kubectl with admin access

## Section 1: Scaling RabbitMQ

### Horizontal Scale-Up

```bash
# Scale RabbitMQ cluster from 3 to 5 nodes using kubectl

kubectl patch rabbitmqcluster rabbitmq-prod \
  -n messaging \
  --type merge \
  -p '{"spec": {"replicas": 5}}'

# Watch the scale-up
kubectl get pods -n messaging -l app.kubernetes.io/name=rabbitmq-prod -w

# Verify new nodes joined the cluster
kubectl exec -n messaging rabbitmq-prod-server-0 -- \
  rabbitmqctl cluster_status
```

### Rebalance Quorum Queues After Scale-Up

```bash
# Look up the RabbitMQ node name for the new pod
NEW_NODE=$(kubectl exec -n messaging rabbitmq-prod-server-4 -- \
  rabbitmqctl -q eval 'node().' | tr -d "'")

# Add the new node as a replica host for all quorum queues
kubectl exec -n messaging rabbitmq-prod-server-0 -- \
  rabbitmq-queues grow "$NEW_NODE" all
```

### Vertical Scaling

```bash
# Update resource requests/limits
kubectl patch rabbitmqcluster rabbitmq-prod \
  -n messaging \
  --type merge \
  -p '{
    "spec": {
      "resources": {
        "requests": {"memory": "2Gi", "cpu": "1"},
        "limits": {"memory": "4Gi", "cpu": "2"}
      }
    }
  }'
```

## Section 2: Scaling Apache Kafka

### Add Kafka Brokers

```bash
# Scale Kafka brokers using Strimzi
kubectl patch kafka kafka-prod \
  -n kafka \
  --type merge \
  -p '{"spec": {"kafka": {"replicas": 5}}}'

# Watch scale-up
kubectl get pods -n kafka -l strimzi.io/component-type=kafka -w
```

### Rebalance Partitions After Scale-Up

```yaml
# kafka-rebalance-add-brokers.yaml - generate a Cruise Control proposal for the new brokers
apiVersion: kafka.strimzi.io/v1
kind: KafkaRebalance
metadata:
  name: kafka-scale-up
  namespace: kafka
  labels:
    strimzi.io/cluster: kafka-prod
spec:
  mode: add-brokers
  brokers: [3, 4]
```

```bash
# Create the rebalance proposal
kubectl apply -f kafka-rebalance-add-brokers.yaml

# Wait for the proposal to become ready
kubectl get kafkarebalance kafka-scale-up -n kafka -o wide -w

# Review the proposed movements
kubectl describe kafkarebalance kafka-scale-up -n kafka

# Approve the rebalance
kubectl annotate kafkarebalance kafka-scale-up -n kafka \
  strimzi.io/rebalance=approve --overwrite

# Monitor progress until the status becomes Ready
kubectl get kafkarebalance kafka-scale-up -n kafka -o wide -w
```

### Use Strimzi KafkaRebalance

```yaml
# kafka-rebalance-template.yaml - template for Cruise Control auto-rebalancing
apiVersion: kafka.strimzi.io/v1
kind: KafkaRebalance
metadata:
  name: kafka-rebalance-template
  namespace: kafka
  annotations:
    strimzi.io/rebalance-template: "true"
spec:
  goals:
    - NetworkInboundCapacityGoal
    - DiskCapacityGoal
    - RackAwareGoal
    - NetworkOutboundCapacityGoal
    - CpuCapacityGoal
    - ReplicaCapacityGoal
    - ReplicaDistributionGoal
    - TopicReplicaDistributionGoal
    - LeaderReplicaDistributionGoal
    - LeaderBytesInDistributionGoal
  skipHardGoalCheck: false
```

```bash
# Create the auto-rebalance template
kubectl apply -f kafka-rebalance-template.yaml

# Configure Kafka to use the template when brokers are added
kubectl patch kafka kafka-prod \
  -n kafka \
  --type merge \
  -p '{
    "spec": {
      "cruiseControl": {
        "autoRebalance": [
          {
            "mode": "add-brokers",
            "template": {"name": "kafka-rebalance-template"}
          }
        ]
      }
    }
  }'
```

## Section 3: Scaling NATS

```bash
# Scale NATS cluster
kubectl patch statefulset nats \
  -n messaging \
  --type merge \
  -p '{"spec": {"replicas": 5}}'

# With clustering routes configured, new nodes join automatically.
# Verify the servers are reachable from the nats-box utility pod
kubectl exec -n messaging deployment/nats-box -- \
  nats --server nats://nats.messaging.svc:4222 server ping
```

## Section 4: Scale Consumers Automatically with HPA

```yaml
# consumer-hpa.yaml - HPA for message queue consumers
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: order-consumer-hpa
  namespace: production
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-consumer
  minReplicas: 2
  maxReplicas: 20
  metrics:
    # Scale based on RabbitMQ queue depth (custom metric)
    - type: External
      external:
        metric:
          name: rabbitmq_queue_messages
          selector:
            matchLabels:
              queue: orders
        target:
          type: AverageValue
          averageValue: "500"  # Scale when > 500 messages per consumer
```

## Section 5: KEDA for Queue-Based Autoscaling

KEDA (Kubernetes Event-Driven Autoscaling) enables scaling based on queue depth:

```yaml
# keda-scaledobject.yaml - KEDA scaling based on Kafka consumer lag
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: order-processor
  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 1
  maxReplicaCount: 50
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka-prod-kafka-bootstrap.kafka.svc.cluster.local:9092
        consumerGroup: order-processor-group
        topic: orders-topic
        lagThreshold: "100"  # Scale when lag > 100 messages per replica
        offsetResetPolicy: latest
---
# KEDA RabbitMQ scaling
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-consumer-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: message-handler
  minReplicaCount: 2
  maxReplicaCount: 30
  triggers:
    - type: rabbitmq
      metadata:
        host: "amqp://guest:guest@rabbitmq.messaging.svc.cluster.local:5672/"
        queueName: orders
        mode: QueueLength
        value: "10"  # Target messages per consumer
```

## Section 6: Monitor Scaling Events

```bash
# Watch scaling events
kubectl events -n production --for=deployment/order-processor --watch

# Check HPA status
kubectl get hpa order-consumer-hpa -n production

# Check KEDA scaler
kubectl get scaledobject kafka-consumer-scaler -n production
kubectl describe scaledobject kafka-consumer-scaler -n production
```

## Conclusion

Scaling message queue infrastructure in Rancher involves both scaling the brokers/servers (horizontal and vertical) and scaling the consumer applications. Use KEDA for elegant event-driven autoscaling of consumers based on actual queue depth. When scaling Kafka, always rebalance partitions to distribute load evenly across new brokers. For RabbitMQ, use quorum queue growth commands to include new nodes in your quorum queues, and monitor rebalancing progress to ensure it completes before the next scaling event.
