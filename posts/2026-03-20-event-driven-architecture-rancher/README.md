# How to Set Up Event-Driven Architecture on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Event-Driven, Kafka, NATS, Kubernetes, Microservice

Description: Guide to building event-driven architectures on Rancher using Kafka, NATS, and Knative Eventing for decoupled microservices.

## Introduction

Event-driven architecture (EDA) enables loosely coupled, highly scalable systems where components communicate through events rather than direct API calls. Rancher provides the platform to run the messaging infrastructure and event consumers at scale.

## EDA Components on Rancher

- **Event Broker**: Kafka, NATS, RabbitMQ
- **Event Sources**: Applications producing events
- **Event Consumers**: Functions and services processing events
- **Event Routing and Autoscaling**: Knative Eventing, KEDA

## Step 1: Deploy Apache Kafka

```bash
# Install Strimzi Kafka Operator

kubectl create namespace kafka
kubectl apply -f https://strimzi.io/install/latest?namespace=kafka -n kafka

# Wait for operator
kubectl wait deployment/strimzi-cluster-operator \
  --for=condition=Available \
  --namespace kafka \
  --timeout=300s
```

```yaml
# kafka-cluster.yaml
apiVersion: kafka.strimzi.io/v1
kind: KafkaNodePool
metadata:
  name: dual-role
  namespace: kafka
  labels:
    strimzi.io/cluster: production-kafka
spec:
  replicas: 3               # 3 dual-role nodes for a small HA cluster
  roles:
  - controller
  - broker
  storage:
    type: jbod
    volumes:
    - id: 0
      type: persistent-claim
      size: 100Gi
      class: longhorn
---
apiVersion: kafka.strimzi.io/v1
kind: Kafka
metadata:
  name: production-kafka
  namespace: kafka
spec:
  kafka:
    version: 4.2.0
    listeners:
    - name: plain
      port: 9092
      type: internal
      tls: false
    - name: tls
      port: 9093
      type: internal
      tls: true
    config:
      offsets.topic.replication.factor: 3
      transaction.state.log.replication.factor: 3
      transaction.state.log.min.isr: 2
      default.replication.factor: 3
      min.insync.replicas: 2
  entityOperator:
    topicOperator: {}
    userOperator: {}
```

## Step 2: Create Kafka Topics

```yaml
# kafka-topics.yaml
apiVersion: kafka.strimzi.io/v1
kind: KafkaTopic
metadata:
  name: user-events
  namespace: kafka
  labels:
    strimzi.io/cluster: production-kafka
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: 604800000    # 7 days
    segment.bytes: 1073741824  # 1GB segments
---
apiVersion: kafka.strimzi.io/v1
kind: KafkaTopic
metadata:
  name: order-events
  namespace: kafka
  labels:
    strimzi.io/cluster: production-kafka
spec:
  partitions: 24               # More partitions for higher throughput
  replicas: 3
```

## Step 3: Set Up NATS as Lightweight Broker

```bash
# Install NATS with JetStream
helm repo add nats https://nats-io.github.io/k8s/helm/charts/
helm repo update

helm install nats nats/nats \
  --namespace messaging \
  --create-namespace \
  --set config.cluster.enabled=true \
  --set config.cluster.replicas=3 \
  --set config.jetstream.enabled=true \
  --set config.jetstream.fileStore.pvc.size=50Gi
```

## Step 4: Configure Knative Eventing Brokers

```yaml
# knative-broker.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-channel
  namespace: knative-eventing
data:
  channel-template-spec: |
    apiVersion: messaging.knative.dev/v1beta1
    kind: KafkaChannel
    spec:
      numPartitions: 3
      replicationFactor: 3
---
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: default
  namespace: production
  annotations:
    eventing.knative.dev/broker.class: MTChannelBasedBroker
spec:
  config:
    apiVersion: v1
    kind: ConfigMap
    name: kafka-channel
    namespace: knative-eventing
  delivery:
    backoffDelay: PT2S         # Retry after 2 seconds
    backoffPolicy: exponential
    retry: 5                   # Retry 5 times
    deadLetterSink:
      ref:
        apiVersion: v1
        kind: Service
        name: dead-letter-handler
```

## Step 5: Create Event Sources

```yaml
# kafka-event-source.yaml
apiVersion: sources.knative.dev/v1beta1
kind: KafkaSource
metadata:
  name: order-source
  namespace: production
spec:
  consumerGroup: knative-order-consumer
  bootstrapServers:
  - production-kafka-kafka-bootstrap.kafka:9092
  topics:
  - order-events
  sink:
    ref:
      apiVersion: eventing.knative.dev/v1
      kind: Broker
      name: default
```

## Step 6: Create Event Triggers

```yaml
# order-trigger.yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: process-orders
  namespace: production
spec:
  broker: default
  filter:
    attributes:
      type: com.example.order.created  # Filter by event type
      source: order-service
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: send-notifications
  namespace: production
spec:
  broker: default
  filter:
    attributes:
      type: com.example.order.created
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: notification-service
```

## Step 7: Event Schema Registry

```yaml
# schema-registry.yaml
apiVersion: v1
kind: Service
metadata:
  name: schema-registry
  namespace: kafka
spec:
  selector:
    app: schema-registry
  ports:
  - port: 8081
    targetPort: 8081
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: schema-registry
  namespace: kafka
spec:
  replicas: 1
  selector:
    matchLabels:
      app: schema-registry
  template:
    metadata:
      labels:
        app: schema-registry
    spec:
      containers:
      - name: schema-registry
        image: confluentinc/cp-schema-registry:8.2.0
        ports:
        - containerPort: 8081
        env:
        - name: SCHEMA_REGISTRY_KAFKASTORE_BOOTSTRAP_SERVERS
          value: PLAINTEXT://production-kafka-kafka-bootstrap.kafka.svc.cluster.local:9092
        - name: SCHEMA_REGISTRY_HOST_NAME
          value: schema-registry.kafka.svc.cluster.local
        - name: SCHEMA_REGISTRY_LISTENERS
          value: http://0.0.0.0:8081
        - name: SCHEMA_REGISTRY_KAFKASTORE_TOPIC_REPLICATION_FACTOR
          value: "3"
```

```bash
# Deploy Schema Registry
kubectl apply -f schema-registry.yaml

# Register an event schema
curl -X POST http://schema-registry.kafka.svc.cluster.local:8081/subjects/order-events-value/versions \
  -H "Content-Type: application/vnd.schemaregistry.v1+json" \
  -d '{
    "schema": "{\"type\":\"record\",\"name\":\"OrderEvent\",\"fields\":[{\"name\":\"orderId\",\"type\":\"string\"},{\"name\":\"customerId\",\"type\":\"string\"},{\"name\":\"amount\",\"type\":\"double\"}]}"
  }'
```

## Conclusion

Event-driven architecture on Rancher enables building resilient, decoupled systems that scale independently. By combining Kafka or NATS as the event backbone with Knative Eventing for routing and serverless functions for processing, you create a powerful EDA platform. Start with a simple event producer-consumer pattern and evolve towards complex event choreography as your system grows.
