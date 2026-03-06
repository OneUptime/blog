# How to Deploy KEDA Event-Driven Autoscaler with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: flux cd, keda, autoscaling, event-driven, kubernetes, gitops, scaling

Description: A practical guide to deploying KEDA for event-driven autoscaling on Kubernetes using Flux CD to scale workloads based on external metrics.

---

## Introduction

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes with event-driven autoscaling capabilities. While the standard Horizontal Pod Autoscaler (HPA) scales based on CPU and memory, KEDA can scale workloads based on external event sources like message queues, databases, HTTP traffic, cron schedules, and many more. KEDA can even scale deployments to zero when there are no events to process.

This guide covers deploying KEDA with Flux CD and configuring ScaledObjects for various event sources.

## Prerequisites

- A Kubernetes cluster (v1.25+)
- Flux CD installed and bootstrapped
- kubectl and flux CLI tools installed
- Event sources to scale against (e.g., RabbitMQ, Kafka, Prometheus)

## Architecture Overview

```mermaid
graph TB
    A[Flux CD GitOps] --> B[KEDA Operator]
    A --> C[KEDA Metrics Server]
    B --> D[ScaledObject]
    B --> E[ScaledJob]
    D --> F[HPA]
    F --> G[Deployment]
    D --> H[External Metrics Source]
    H --> I[RabbitMQ]
    H --> J[Kafka]
    H --> K[Prometheus]
    H --> L[AWS SQS]
```

## Repository Structure

```
clusters/
  my-cluster/
    keda/
      namespace.yaml
      helmrepository.yaml
      helmrelease.yaml
      kustomization.yaml
    apps/
      scaled-objects/
        rabbitmq-consumer.yaml
        kafka-consumer.yaml
        prometheus-scaler.yaml
        cron-scaler.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/keda/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: keda
  labels:
    app.kubernetes.io/managed-by: flux
```

## Step 2: Add the KEDA Helm Repository

```yaml
# clusters/my-cluster/keda/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kedacore
  namespace: keda
spec:
  interval: 1h
  # Official KEDA Helm chart repository
  url: https://kedacore.github.io/charts
```

## Step 3: Deploy KEDA with HelmRelease

```yaml
# clusters/my-cluster/keda/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: keda
  namespace: keda
spec:
  interval: 30m
  chart:
    spec:
      chart: keda
      version: "2.16.x"
      sourceRef:
        kind: HelmRepository
        name: kedacore
        namespace: keda
      interval: 12h
  values:
    # KEDA Operator configuration
    operator:
      # Number of operator replicas for HA
      replicaCount: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 1000m
          memory: 512Mi

    # Metrics server configuration
    metricsServer:
      replicaCount: 2
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi

    # Admission webhooks for validation
    webhooks:
      enabled: true
      resources:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 128Mi

    # Prometheus monitoring
    prometheus:
      metricServer:
        enabled: true
        serviceMonitor:
          enabled: true
      operator:
        enabled: true
        serviceMonitor:
          enabled: true

    # Pod disruption budgets for HA
    podDisruptionBudget:
      operator:
        minAvailable: 1
      metricServer:
        minAvailable: 1

    # Logging configuration
    logging:
      operator:
        level: info
        format: json
      metricServer:
        level: "0"
```

## Step 4: Scale Based on RabbitMQ Queue Length

```yaml
# clusters/my-cluster/apps/scaled-objects/rabbitmq-consumer.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-consumer
  namespace: default
spec:
  # Target deployment to scale
  scaleTargetRef:
    name: rabbitmq-consumer
  # Minimum number of replicas (0 enables scale-to-zero)
  minReplicaCount: 0
  # Maximum number of replicas
  maxReplicaCount: 30
  # Cooldown period before scaling down (seconds)
  cooldownPeriod: 60
  # Polling interval for checking metrics (seconds)
  pollingInterval: 15
  triggers:
    - type: rabbitmq
      metadata:
        # RabbitMQ queue to monitor
        queueName: orders-queue
        # Host connection string
        host: amqp://guest:guest@rabbitmq.default.svc:5672/
        # Scale when queue length exceeds this value per replica
        queueLength: "10"
        # Use the ready message count
        mode: QueueLength
      # Authentication reference for RabbitMQ credentials
      authenticationRef:
        name: rabbitmq-auth
---
# Authentication trigger for RabbitMQ
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
```

## Step 5: Scale Based on Kafka Consumer Lag

```yaml
# clusters/my-cluster/apps/scaled-objects/kafka-consumer.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer
  namespace: default
spec:
  scaleTargetRef:
    name: kafka-consumer
  minReplicaCount: 1
  maxReplicaCount: 50
  cooldownPeriod: 120
  pollingInterval: 30
  triggers:
    - type: kafka
      metadata:
        # Kafka bootstrap servers
        bootstrapServers: kafka-bootstrap.kafka.svc:9092
        # Consumer group to monitor
        consumerGroup: my-consumer-group
        # Topic to monitor
        topic: events-topic
        # Lag threshold per partition to trigger scaling
        lagThreshold: "100"
        # Offset reset policy
        offsetResetPolicy: earliest
        # Allow idle consumers (no messages)
        allowIdleConsumers: "false"
        # Version of Kafka
        version: "3.6.0"
      authenticationRef:
        name: kafka-auth
---
# TLS authentication for Kafka
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: kafka-auth
  namespace: default
spec:
  secretTargetRef:
    - parameter: sasl
      name: kafka-credentials
      key: sasl-mechanism
    - parameter: username
      name: kafka-credentials
      key: username
    - parameter: password
      name: kafka-credentials
      key: password
```

## Step 6: Scale Based on Prometheus Metrics

```yaml
# clusters/my-cluster/apps/scaled-objects/prometheus-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: web-api-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: web-api
  minReplicaCount: 2
  maxReplicaCount: 20
  cooldownPeriod: 60
  pollingInterval: 15
  # Advanced scaling behavior
  advanced:
    restoreToOriginalReplicaCount: false
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 300
          policies:
            - type: Percent
              value: 25
              periodSeconds: 60
        scaleUp:
          stabilizationWindowSeconds: 0
          policies:
            - type: Percent
              value: 100
              periodSeconds: 15
  triggers:
    # Scale based on HTTP request rate
    - type: prometheus
      metadata:
        # Prometheus server address
        serverAddress: http://prometheus-server.monitoring.svc:9090
        # PromQL query for requests per second
        query: |
          sum(rate(http_requests_total{service="web-api"}[2m]))
        # Scale when RPS exceeds this threshold per replica
        threshold: "100"
        # Activation threshold (only activate scaling above this)
        activationThreshold: "10"
    # Additional CPU-based trigger
    - type: cpu
      metricType: Utilization
      metadata:
        # Target CPU utilization percentage
        value: "70"
```

## Step 7: Scale Based on Cron Schedule

```yaml
# clusters/my-cluster/apps/scaled-objects/cron-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: business-hours-scaler
  namespace: default
spec:
  scaleTargetRef:
    name: web-frontend
  minReplicaCount: 2
  maxReplicaCount: 20
  triggers:
    # Scale up during business hours
    - type: cron
      metadata:
        timezone: America/New_York
        # Scale to 10 replicas during business hours
        start: "0 8 * * 1-5"
        end: "0 18 * * 1-5"
        desiredReplicas: "10"
    # Scale up during peak hours
    - type: cron
      metadata:
        timezone: America/New_York
        # Scale to 15 during lunch peak
        start: "0 11 * * 1-5"
        end: "0 14 * * 1-5"
        desiredReplicas: "15"
```

## Step 8: ScaledJob for Batch Processing

```yaml
# clusters/my-cluster/apps/scaled-objects/batch-job-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: batch-processor
  namespace: default
spec:
  jobTargetRef:
    template:
      spec:
        containers:
          - name: processor
            image: batch-processor:latest
            env:
              - name: QUEUE_URL
                value: "amqp://rabbitmq.default.svc:5672/"
        restartPolicy: Never
    backoffLimit: 3
  # How many jobs to run in parallel
  maxReplicaCount: 10
  # How many messages each job should process
  scalingStrategy:
    strategy: accurate
  pollingInterval: 10
  successfulJobsHistoryLimit: 5
  failedJobsHistoryLimit: 3
  triggers:
    - type: rabbitmq
      metadata:
        queueName: batch-queue
        queueLength: "5"
      authenticationRef:
        name: rabbitmq-auth
```

## Step 9: Flux Kustomization

```yaml
# clusters/my-cluster/keda/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: keda
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/keda
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  wait: true
  timeout: 5m
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: keda-operator
      namespace: keda
    - apiVersion: apps/v1
      kind: Deployment
      name: keda-operator-metrics-apiserver
      namespace: keda
```

## Verifying the Deployment

```bash
# Check KEDA operator pods
kubectl get pods -n keda

# Verify KEDA CRDs are installed
kubectl get crd | grep keda

# Check ScaledObjects status
kubectl get scaledobject -A

# Check the HPA created by KEDA
kubectl get hpa -A

# View KEDA operator logs
kubectl logs -n keda -l app=keda-operator --tail=20

# Check current replica count for a scaled workload
kubectl get deployment rabbitmq-consumer -o jsonpath='{.spec.replicas}'

# View scaling events
kubectl describe scaledobject rabbitmq-consumer -n default
```

## Troubleshooting

```bash
# Check KEDA operator logs for scaler errors
kubectl logs -n keda -l app=keda-operator | grep -i error

# Verify metrics server is providing metrics
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1" | jq .

# Check trigger authentication status
kubectl describe triggerauthentication rabbitmq-auth -n default

# Verify the external metric value
kubectl get --raw "/apis/external.metrics.k8s.io/v1beta1/namespaces/default/s0-rabbitmq-orders-queue" | jq .

# Debug a ScaledObject that is not scaling
kubectl describe scaledobject rabbitmq-consumer -n default | grep -A5 "Conditions"
```

## Conclusion

KEDA with Flux CD provides a powerful event-driven autoscaling solution managed through GitOps. By defining ScaledObjects and ScaledJobs as code, you can scale workloads based on real demand from message queues, databases, HTTP traffic, and custom metrics. The scale-to-zero capability helps reduce costs for workloads with variable load, while Flux CD ensures your autoscaling configuration is version-controlled and consistently applied across environments.
