# How to Deploy KEDA with Kafka Trigger with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, KEDA, Kafka, Autoscaling, Event-Driven, Messaging

Description: Deploy KEDA with Apache Kafka trigger for event-driven scaling using Flux CD to automatically scale consumers based on Kafka topic lag.

---

## Introduction

Kafka is one of the most common event streaming platforms in modern architectures. When Kafka consumer lag grows — meaning more messages are arriving than consumers can process — you need to scale up consumer replicas quickly. KEDA's Kafka scaler does exactly this, monitoring consumer group lag and scaling your deployments accordingly.

Managing KEDA's Kafka ScaledObjects through Flux CD ensures your scaling policies are version-controlled alongside your application code. Adjusting lag thresholds, consumer group names, or bootstrap server addresses flows through a pull request review process.

This guide covers configuring KEDA with a Kafka trigger using Flux CD, including authentication for secured Kafka clusters.

## Prerequisites

- KEDA deployed on your Kubernetes cluster (see the companion post)
- Apache Kafka cluster accessible from Kubernetes (self-hosted or MSK/Confluent Cloud)
- Flux CD v2 bootstrapped to your Git repository
- A Kafka consumer deployment to scale

## Step 1: Create TriggerAuthentication for Kafka

For clusters using SASL authentication:

```yaml
# clusters/my-cluster/keda-kafka/trigger-auth.yaml
apiVersion: v1
kind: Secret
metadata:
  name: kafka-sasl-secret
  namespace: app
type: Opaque
stringData:
  sasl: "plaintext"
  username: "kafka-user"
  password: "kafka-password"   # Use SOPS encryption in production
---
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: kafka-trigger-auth
  namespace: app
spec:
  secretTargetRef:
    - parameter: sasl
      name: kafka-sasl-secret
      key: sasl
    - parameter: username
      name: kafka-sasl-secret
      key: username
    - parameter: password
      name: kafka-sasl-secret
      key: password
```

## Step 2: Create the ScaledObject with Kafka Trigger

```yaml
# clusters/my-cluster/keda-kafka/scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: order-consumer
  # Keep at least 1 replica for low-latency response
  minReplicaCount: 1
  maxReplicaCount: 50
  pollingInterval: 15
  cooldownPeriod: 120
  triggers:
    - type: kafka
      metadata:
        # Kafka bootstrap servers
        bootstrapServers: kafka.kafka.svc.cluster.local:9092
        # Consumer group to monitor for lag
        consumerGroup: order-processor-group
        # Topic to monitor
        topic: orders
        # Scale 1 replica per N messages of lag
        lagThreshold: "100"
        # Scale based on average lag per partition
        offsetResetPolicy: latest
        # Use SASL auth
        sasl: plaintext
        tls: disable
      authenticationRef:
        name: kafka-trigger-auth
```

## Step 3: Deploy the Consumer Application

```yaml
# clusters/my-cluster/keda-kafka/consumer-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-consumer
  namespace: app
spec:
  replicas: 1   # KEDA will override this
  selector:
    matchLabels:
      app: order-consumer
  template:
    metadata:
      labels:
        app: order-consumer
    spec:
      containers:
        - name: consumer
          image: myregistry/order-consumer:v1.3.0
          env:
            - name: KAFKA_BOOTSTRAP_SERVERS
              value: "kafka.kafka.svc.cluster.local:9092"
            - name: KAFKA_GROUP_ID
              value: "order-processor-group"
            - name: KAFKA_TOPIC
              value: "orders"
            - name: KAFKA_USERNAME
              valueFrom:
                secretKeyRef:
                  name: kafka-sasl-secret
                  key: username
            - name: KAFKA_PASSWORD
              valueFrom:
                secretKeyRef:
                  name: kafka-sasl-secret
                  key: password
          resources:
            requests:
              cpu: "500m"
              memory: "256Mi"
            limits:
              cpu: "2"
              memory: "512Mi"
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/keda-kafka/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - trigger-auth.yaml
  - consumer-deployment.yaml
  - scaledobject.yaml
---
# clusters/my-cluster/flux-kustomization-keda-kafka.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: keda-kafka
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: keda
  path: ./clusters/my-cluster/keda-kafka
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 5: Verify Kafka-Based Autoscaling

```bash
# Check ScaledObject status
kubectl get scaledobject kafka-consumer-scaler -n app -w

# Check HPA created by KEDA
kubectl get hpa -n app

# View current consumer lag
kubectl exec -n kafka kafka-0 -- kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --group order-processor-group \
  --describe

# Produce test messages to trigger scaling
kubectl exec -n kafka kafka-0 -- kafka-producer-perf-test.sh \
  --topic orders \
  --num-records 10000 \
  --record-size 1024 \
  --throughput 1000 \
  --producer-props bootstrap.servers=localhost:9092

# Watch pods scale up
kubectl get pods -n app -l app=order-consumer -w
```

## Best Practices

- Set `lagThreshold` based on your consumer throughput per pod — if each pod processes 100 messages/second and you want lag cleared within 10 seconds, set `lagThreshold: "1000"`.
- Use `minReplicaCount: 1` rather than 0 for Kafka consumers to keep one replica subscribed to partitions, avoiding partition reassignment delays on scale-up.
- Encrypt Kafka credentials at rest using Flux's SOPS integration — never commit plain-text passwords to your Git repository.
- Configure `cooldownPeriod` to be longer than your maximum message processing time to prevent premature scale-down mid-batch.
- Use KEDA's multi-trigger feature to combine Kafka lag with CPU metrics, scaling up on either condition for comprehensive autoscaling coverage.

## Conclusion

KEDA with a Kafka trigger managed by Flux CD gives your team an automated, GitOps-governed approach to Kafka consumer scaling. Consumer group lag thresholds, authentication configuration, and scaling bounds are all in Git, enabling your application to absorb traffic spikes automatically while maintaining cost efficiency during low-traffic periods.
