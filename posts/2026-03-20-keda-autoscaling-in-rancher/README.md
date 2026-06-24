# How to Configure KEDA Autoscaling in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, KEDA, Autoscaling, Kubernetes, Event-Driven, Scale-to-Zero

Description: Install KEDA in Rancher and configure event-driven autoscaling for Deployments and Jobs using Kafka, RabbitMQ, Redis, and custom metric scalers.

## Introduction

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes HPA with event-source-aware autoscaling. It can scale deployments and jobs based on Kafka consumer lag, RabbitMQ queue depth, Redis list length, Prometheus metrics, and dozens of other event sources-including scaling to zero replicas when idle.

## Step 1: Install KEDA

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace \
  --set metricsServer.replicaCount=2    # HA metrics server

kubectl get pods -n keda
```

## Step 2: Scale on Kafka Consumer Lag

```yaml
# kafka-scaler.yaml

apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 0       # Allows scale-to-zero after lag returns to 0
  maxReplicaCount: 30
  pollingInterval: 10
  cooldownPeriod: 60

  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka.messaging.svc.cluster.local:9092
        consumerGroup: order-processors
        topic: orders
        lagThreshold: "100"       # One pod per 100 messages of lag
        offsetResetPolicy: latest # New consumer groups stay active until an offset is committed
```

## Step 3: Scale on RabbitMQ Queue Depth

```yaml
# rabbitmq-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: rabbitmq-auth
  namespace: production
spec:
  secretTargetRef:
    - parameter: host
      name: rabbitmq-credentials
      key: connection-string
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: email-worker
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
    - type: rabbitmq
      authenticationRef:
        name: rabbitmq-auth
      metadata:
        protocol: amqp
        queueName: email-queue
        mode: QueueLength
        value: "50"    # One pod per 50 queued messages
```

## Step 4: Scale on Prometheus Metrics

```yaml
# prometheus-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: prometheus-scaler
  namespace: production
spec:
  scaleTargetRef:
    name: api-server
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus.monitoring.svc.cluster.local:9090
        metricName: http_requests_per_second
        query: |
          sum(rate(http_requests_total{namespace="production",service="api-server"}[1m]))
        threshold: "100"    # Scale when total RPS exceeds 100
```

## Step 5: Scale Kubernetes Jobs (Batch Workloads)

```yaml
# job-scaler.yaml - Create a new Job for each batch of messages
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: batch-processor
  namespace: production
spec:
  jobTargetRef:
    template:
      spec:
        containers:
          - name: processor
            image: myregistry/batch-processor:latest
        restartPolicy: Never
  maxReplicaCount: 20
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka.messaging.svc.cluster.local:9092
        consumerGroup: batch-processors
        topic: batch-jobs
        lagThreshold: "1"    # One job per pending message
```

## Step 6: Monitor KEDA

```bash
# Check ScaledObject status
kubectl get scaledobject -n production

# Describe to see current replicas and conditions
kubectl describe scaledobject kafka-consumer-scaler -n production

# Check KEDA operator logs
kubectl logs -n keda deployment/keda-operator -f
```

## Conclusion

KEDA transforms Rancher into a true event-driven compute platform. The ability to scale to zero eliminates idle resource costs, while rapid scale-up from external event source metrics ensures responsiveness. KEDA's 50+ built-in scalers cover virtually every message queue, streaming platform, and monitoring system in common use.
