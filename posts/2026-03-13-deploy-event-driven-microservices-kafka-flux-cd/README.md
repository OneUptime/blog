# How to Deploy Event-Driven Microservices with Kafka and Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Kafka, Event-Driven, Microservices, Strimzi

Description: Build and deploy event-driven microservices with Kafka using Flux CD for GitOps-managed, decoupled service architectures.

---

## Introduction

Event-driven architecture (EDA) uses asynchronous events as the primary mechanism for inter-service communication, decoupling producers from consumers. With Kafka as the event backbone and Flux CD managing both the infrastructure and the microservices, you get a fully GitOps-managed EDA platform where topology changes, new event types, and service deployments all flow through version-controlled pull requests.

This post demonstrates a practical event-driven microservices setup: an order service that publishes events to Kafka, an inventory service that consumes them and publishes inventory updates, and an analytics service that streams from both topics. All components — Kafka topics, KafkaUsers, and microservice Deployments — are managed by Flux CD.

## Prerequisites

- Strimzi Kafka cluster deployed via Flux CD (see Strimzi deployment post)
- Container registry for microservice images
- Flux CD with image automation configured
- `kubectl` and `flux` CLIs installed

## Step 1: Define the Event Schema

Store event schemas in Git as documentation and for schema registry use:

```yaml
# events/schemas/order-created.json
{
  "type": "record",
  "name": "OrderCreated",
  "namespace": "com.example.orders",
  "fields": [
    {"name": "orderId", "type": "string"},
    {"name": "customerId", "type": "string"},
    {"name": "items", "type": {"type": "array", "items": {
      "type": "record",
      "name": "OrderItem",
      "fields": [
        {"name": "productId", "type": "string"},
        {"name": "quantity", "type": "int"},
        {"name": "price", "type": "double"}
      ]
    }}},
    {"name": "timestamp", "type": "long", "logicalType": "timestamp-millis"},
    {"name": "status", "type": {"type": "enum", "name": "OrderStatus",
      "symbols": ["CREATED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"]}}
  ]
}
```

## Step 2: Create Kafka Topics for the Event Streams

```yaml
# infrastructure/messaging/topics/order-events.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: order-events
  namespace: kafka
  labels:
    strimzi.io/cluster: production
    domain: orders
    version: v1
spec:
  partitions: 12
  replicas: 3
  config:
    retention.ms: "604800000"
    min.insync.replicas: "2"
    cleanup.policy: delete
    compression.type: snappy
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: inventory-events
  namespace: kafka
  labels:
    strimzi.io/cluster: production
    domain: inventory
spec:
  partitions: 6
  replicas: 3
  config:
    retention.ms: "604800000"
    min.insync.replicas: "2"
    compression.type: snappy
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaTopic
metadata:
  name: order-events-dead-letter
  namespace: kafka
  labels:
    strimzi.io/cluster: production
    purpose: dlq
spec:
  partitions: 3
  replicas: 3
  config:
    retention.ms: "7776000000"   # 90 days
    min.insync.replicas: "2"
```

## Step 3: Create KafkaUsers for Each Service

```yaml
# infrastructure/messaging/users/order-service-user.yaml
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: order-service
  namespace: kafka
  labels:
    strimzi.io/cluster: production
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      - resource:
          type: topic
          name: order-events
          patternType: literal
        operations:
          - Write
          - Describe
      - resource:
          type: transactionalId
          name: order-service
          patternType: literal
        operations:
          - Write
          - Describe
---
apiVersion: kafka.strimzi.io/v1beta2
kind: KafkaUser
metadata:
  name: inventory-service
  namespace: kafka
  labels:
    strimzi.io/cluster: production
spec:
  authentication:
    type: tls
  authorization:
    type: simple
    acls:
      - resource:
          type: topic
          name: order-events
          patternType: literal
        operations:
          - Read
          - Describe
      - resource:
          type: group
          name: inventory-service-group
          patternType: literal
        operations:
          - Read
      - resource:
          type: topic
          name: inventory-events
          patternType: literal
        operations:
          - Write
          - Describe
```

## Step 4: Deploy Microservices

```yaml
# apps/order-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-service
  namespace: orders
  labels:
    app: order-service
    version: v1
spec:
  replicas: 3
  selector:
    matchLabels:
      app: order-service
  template:
    metadata:
      labels:
        app: order-service
    spec:
      volumes:
        - name: kafka-certs
          secret:
            secretName: order-service  # KafkaUser auto-created Secret
      containers:
        - name: order-service
          image: myregistry.example.com/order-service:v1.2.3
          env:
            - name: KAFKA_BOOTSTRAP_SERVERS
              value: "production-kafka-bootstrap.kafka.svc.cluster.local:9093"
            - name: KAFKA_SECURITY_PROTOCOL
              value: "SSL"
            - name: KAFKA_SSL_KEYSTORE_LOCATION
              value: "/kafka/certs/user.p12"
            - name: KAFKA_SSL_KEYSTORE_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: order-service
                  key: user.password
            - name: KAFKA_SSL_TRUSTSTORE_LOCATION
              value: "/kafka/certs/ca.crt"
            - name: KAFKA_TOPIC_ORDERS
              value: "order-events"
            - name: KAFKA_TRANSACTIONAL_ID
              value: "order-service"
          volumeMounts:
            - name: kafka-certs
              mountPath: /kafka/certs
              readOnly: true
          resources:
            requests:
              cpu: "200m"
              memory: "256Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /actuator/health/readiness
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
          livenessProbe:
            httpGet:
              path: /actuator/health/liveness
              port: 8080
            initialDelaySeconds: 60
            periodSeconds: 30
```

## Step 5: Use Flux Image Automation for Service Deployments

```yaml
# clusters/production/order-service-image-policy.yaml
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImageRepository
metadata:
  name: order-service
  namespace: flux-system
spec:
  image: myregistry.example.com/order-service
  interval: 5m
---
apiVersion: image.toolkit.fluxcd.io/v1beta2
kind: ImagePolicy
metadata:
  name: order-service
  namespace: flux-system
spec:
  imageRepositoryRef:
    name: order-service
  policy:
    semver:
      range: ">=1.0.0 <2.0.0"
```

## Step 6: Set Up Flux Kustomizations

```yaml
# clusters/production/event-driven-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: kafka-event-topics
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/messaging/topics
  prune: true
  dependsOn:
    - name: strimzi-kafka
---
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: order-service
  namespace: flux-system
spec:
  interval: 5m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./apps/order-service
  prune: true
  dependsOn:
    - name: kafka-event-topics
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: order-service
      namespace: orders
```

## Step 7: Verify End-to-End Event Flow

```bash
# Check all services are running
kubectl get pods -n orders
kubectl get pods -n inventory

# Monitor Kafka consumer group lag
kubectl exec -n kafka production-kafka-0 -- \
  kafka-consumer-groups.sh \
  --bootstrap-server production-kafka-bootstrap:9092 \
  --describe \
  --group inventory-service-group

# Watch events flowing through Kafka
kubectl exec -n kafka production-kafka-0 -- \
  kafka-console-consumer.sh \
  --bootstrap-server production-kafka-bootstrap:9092 \
  --topic order-events \
  --from-beginning \
  --max-messages 5 | jq .

# Create a test order via the API
kubectl port-forward svc/order-service 8080:8080 -n orders
curl -XPOST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"customerId":"cust123","items":[{"productId":"prod456","quantity":2}]}'
```

## Best Practices

- Use Kafka transactional producers (`enable.idempotence=true`, `transactional.id`) for exactly-once publish semantics.
- Design events with additive schemas (new fields with defaults) to maintain backward compatibility.
- Use a schema registry (Confluent or Apicurio) and enforce schema validation at the topic level.
- Monitor consumer group lag with Prometheus and alert when lag exceeds your acceptable processing delay.
- Use Flux image automation to automatically update service images when new versions are pushed to the registry.

## Conclusion

Event-driven microservices deployed with Kafka and managed by Flux CD give you a decoupled, scalable architecture where every component — topics, users, service deployments — is described in Git. The Kustomization `dependsOn` mechanism ensures services only start after the Kafka infrastructure is ready. Image automation keeps services up-to-date automatically. The result is a fully observable, reproducible event-driven platform where adding a new service or event type is a pull request that your team reviews and Flux applies automatically.
