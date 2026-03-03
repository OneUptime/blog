# How to Set Up KEDA for Event-Driven Autoscaling on Talos

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Talos Linux, Kubernetes, KEDA, Autoscaling, Event-Driven, Scaling

Description: A complete guide to deploying and configuring KEDA on Talos Linux for event-driven autoscaling based on external metrics and event sources.

---

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes autoscaling beyond the built-in HPA capabilities. While the standard HPA requires you to set up a Prometheus Adapter and custom metrics pipeline, KEDA provides out-of-the-box integrations with dozens of event sources like message queues, databases, cloud services, and more. On Talos Linux, KEDA is a natural fit for workloads that need to respond to external events rather than just CPU and memory pressure.

This guide covers installing KEDA on Talos Linux and configuring it for various event-driven scaling scenarios.

## What Is KEDA?

KEDA is a lightweight component that sits alongside the standard Kubernetes HPA. It provides two key features:

1. **Scaling to and from zero** - Unlike the standard HPA which requires at least one replica, KEDA can scale workloads down to zero replicas when there are no events to process, saving resources.
2. **Event source scalers** - KEDA includes built-in scalers for 60+ event sources, eliminating the need to configure custom metrics adapters.

KEDA does not replace the HPA. Instead, it creates and manages HPA objects on your behalf, adding the ability to scale to zero and integrating with external event sources.

## Installing KEDA on Talos Linux

The recommended installation method is Helm:

```bash
# Add the KEDA Helm repository
helm repo add kedacore https://kedacore.github.io/charts
helm repo update

# Install KEDA
helm install keda kedacore/keda \
  --namespace keda \
  --create-namespace \
  --set resources.operator.requests.cpu=100m \
  --set resources.operator.requests.memory=128Mi \
  --set resources.metricServer.requests.cpu=50m \
  --set resources.metricServer.requests.memory=64Mi
```

Verify the installation:

```bash
# Check KEDA pods
kubectl get pods -n keda

# Verify CRDs are installed
kubectl get crd | grep keda

# You should see:
# scaledobjects.keda.sh
# scaledjobs.keda.sh
# triggerauthentications.keda.sh
# clustertriggerauthentications.keda.sh
```

## Core Concepts

KEDA uses two main custom resources:

- **ScaledObject** - Defines how a Deployment or StatefulSet should scale based on event triggers
- **ScaledJob** - Defines how Kubernetes Jobs should be created based on events

And two authentication resources:

- **TriggerAuthentication** - Namespace-scoped authentication for event sources
- **ClusterTriggerAuthentication** - Cluster-wide authentication for event sources

## Scaling Based on RabbitMQ Queue Length

One of the most common use cases is scaling workers based on message queue depth:

```yaml
# rabbitmq-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: rabbitmq-auth
  namespace: default
spec:
  secretTargetRef:
  - parameter: host
    name: rabbitmq-credentials
    key: connection-string
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: order-processor-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: order-processor
  minReplicaCount: 0    # Scale to zero when queue is empty
  maxReplicaCount: 20
  pollingInterval: 15   # Check every 15 seconds
  cooldownPeriod: 60    # Wait 60 seconds before scaling to zero
  triggers:
  - type: rabbitmq
    metadata:
      queueName: orders
      queueLength: "5"  # Each replica handles 5 messages
      protocol: amqp
    authenticationRef:
      name: rabbitmq-auth
```

Create the required secret:

```bash
# Create the RabbitMQ connection secret
kubectl create secret generic rabbitmq-credentials \
  --from-literal=connection-string="amqp://user:password@rabbitmq.default.svc.cluster.local:5672/"
```

Deploy the worker and the ScaledObject:

```yaml
# order-processor.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: order-processor
spec:
  replicas: 0  # KEDA will manage replicas
  selector:
    matchLabels:
      app: order-processor
  template:
    metadata:
      labels:
        app: order-processor
    spec:
      containers:
      - name: processor
        image: order-processor:latest
        resources:
          requests:
            cpu: "200m"
            memory: "256Mi"
```

```bash
kubectl apply -f order-processor.yaml
kubectl apply -f rabbitmq-scaledobject.yaml
```

## Scaling Based on Kafka Topic Lag

```yaml
# kafka-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer-scaler
spec:
  scaleTargetRef:
    name: kafka-consumer
  minReplicaCount: 1
  maxReplicaCount: 30
  triggers:
  - type: kafka
    metadata:
      bootstrapServers: kafka.default.svc.cluster.local:9092
      consumerGroup: my-consumer-group
      topic: events
      lagThreshold: "10"
      offsetResetPolicy: latest
```

## Scaling Based on Redis List Length

```yaml
# redis-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: redis-auth
spec:
  secretTargetRef:
  - parameter: address
    name: redis-credentials
    key: address
  - parameter: password
    name: redis-credentials
    key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: redis-worker-scaler
spec:
  scaleTargetRef:
    name: redis-worker
  minReplicaCount: 0
  maxReplicaCount: 10
  triggers:
  - type: redis
    metadata:
      listName: job-queue
      listLength: "10"
      databaseIndex: "0"
      enableTLS: "false"
    authenticationRef:
      name: redis-auth
```

## Scaling Based on Prometheus Metrics

KEDA can also use Prometheus as a metric source, which simplifies the setup compared to the Prometheus Adapter:

```yaml
# prometheus-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: webapp-prometheus-scaler
spec:
  scaleTargetRef:
    name: webapp
  minReplicaCount: 2
  maxReplicaCount: 20
  triggers:
  - type: prometheus
    metadata:
      serverAddress: http://prometheus-kube-prometheus-prometheus.monitoring.svc:9090
      metricName: http_requests_per_second
      query: sum(rate(http_requests_total{deployment="webapp"}[2m]))
      threshold: "100"
      activationThreshold: "5"  # Scale from zero only when above 5
```

## Scaling Based on Cron Schedule

For workloads with predictable traffic patterns, use cron-based scaling:

```yaml
# cron-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: webapp-cron-scaler
spec:
  scaleTargetRef:
    name: webapp
  minReplicaCount: 2
  maxReplicaCount: 50
  triggers:
  # Business hours - scale up
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 8 * * 1-5    # 8 AM weekdays
      end: 0 18 * * 1-5     # 6 PM weekdays
      desiredReplicas: "10"
  # After hours - scale down
  - type: cron
    metadata:
      timezone: America/New_York
      start: 0 18 * * 1-5
      end: 0 8 * * 2-6
      desiredReplicas: "2"
```

## Multiple Triggers

You can combine multiple triggers. KEDA will scale to the highest value recommended by any trigger:

```yaml
# multi-trigger-scaledobject.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: webapp-multi-scaler
spec:
  scaleTargetRef:
    name: webapp
  minReplicaCount: 1
  maxReplicaCount: 30
  triggers:
  # Scale based on HTTP traffic
  - type: prometheus
    metadata:
      serverAddress: http://prometheus.monitoring.svc:9090
      query: sum(rate(http_requests_total{deployment="webapp"}[2m]))
      threshold: "100"
  # Also scale based on queue depth
  - type: rabbitmq
    metadata:
      queueName: background-jobs
      queueLength: "10"
    authenticationRef:
      name: rabbitmq-auth
  # And ensure minimum during business hours
  - type: cron
    metadata:
      timezone: UTC
      start: 0 8 * * *
      end: 0 20 * * *
      desiredReplicas: "5"
```

## Scaling Jobs with ScaledJob

For batch processing, KEDA can create Kubernetes Jobs instead of scaling Deployments:

```yaml
# scaled-job.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: image-processor
spec:
  jobTargetRef:
    template:
      spec:
        containers:
        - name: processor
          image: image-processor:latest
          resources:
            requests:
              cpu: "500m"
              memory: "512Mi"
        restartPolicy: Never
    backoffLimit: 3
  pollingInterval: 10
  maxReplicaCount: 20
  successfulJobsHistoryLimit: 10
  failedJobsHistoryLimit: 5
  triggers:
  - type: rabbitmq
    metadata:
      queueName: image-processing
      queueLength: "1"
    authenticationRef:
      name: rabbitmq-auth
```

## Monitoring KEDA

```bash
# Check ScaledObject status
kubectl get scaledobject
kubectl describe scaledobject webapp-prometheus-scaler

# View the HPA that KEDA created
kubectl get hpa

# Check KEDA operator logs
kubectl logs -n keda -l app=keda-operator --tail=50

# Check KEDA metrics server logs
kubectl logs -n keda -l app=keda-operator-metrics-apiserver --tail=50

# View scaling events
kubectl get events --field-selector source=keda-operator
```

## Wrapping Up

KEDA on Talos Linux makes event-driven autoscaling accessible without the complexity of setting up custom metrics pipelines. Its ability to scale to zero saves resources for workloads that do not need to run constantly, and its extensive library of scalers means you can connect to almost any event source out of the box. Start with a simple queue-based scaler, verify the behavior, then expand to more sophisticated multi-trigger configurations as your needs grow.
