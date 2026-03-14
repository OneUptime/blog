# How to Deploy KEDA for Event-Driven Autoscaling with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, KEDA, Event-Driven Autoscaling, Kubernetes, GitOps, SQS, Kafka, Redis

Description: Learn how to deploy KEDA (Kubernetes Event-Driven Autoscaling) using Flux CD HelmRelease and configure event-driven pod scaling for queues and message brokers.

---

## Introduction

KEDA (Kubernetes Event-Driven Autoscaling) is a CNCF project that extends Kubernetes HPA with support for over 50 event sources including AWS SQS, Kafka, RabbitMQ, Redis, Azure Service Bus, and more. Unlike standard HPA which requires a metrics adapter, KEDA provides built-in scalers that connect directly to event sources. Managing KEDA and ScaledObjects through Flux CD gives you GitOps-managed event-driven autoscaling.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Access to an event source (SQS, Kafka, Redis, etc.)
- kubectl and flux CLI

## Step 1: Deploy KEDA via Flux HelmRelease

```yaml
# clusters/production/infrastructure/keda.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kedacore
  namespace: flux-system
spec:
  interval: 1h
  url: https://kedacore.github.io/charts
---
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: keda
  namespace: keda
spec:
  interval: 1h
  chart:
    spec:
      chart: keda
      version: "2.14.x"
      sourceRef:
        kind: HelmRepository
        name: kedacore
  values:
    operator:
      name: keda-operator
      replicaCount: 2  # HA
      resources:
        limits:
          memory: 1000Mi
        requests:
          cpu: 100m
          memory: 100Mi
    metricsServer:
      replicaCount: 2  # HA
      resources:
        limits:
          memory: 1000Mi
        requests:
          cpu: 100m
          memory: 100Mi
    webhooks:
      enabled: true  # Enable admission webhooks
    serviceAccount:
      create: true
```

## Step 2: AWS SQS ScaledObject

```yaml
# apps/worker/keda-sqs.yaml

# ClusterTriggerAuthentication for AWS IRSA
apiVersion: keda.sh/v1alpha1
kind: ClusterTriggerAuthentication
metadata:
  name: aws-irsa
spec:
  podIdentity:
    provider: aws  # Uses pod's IRSA annotation
---
# ScaledObject for SQS queue
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: sqs-worker
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: job-worker
  pollingInterval: 15
  cooldownPeriod: 300
  minReplicaCount: 0    # Scale to zero
  maxReplicaCount: 100
  triggers:
    - type: aws-sqs-queue
      authenticationRef:
        name: aws-irsa
        kind: ClusterTriggerAuthentication
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/my-queue
        queueLength: "10"    # Target: 10 messages per pod
        awsRegion: us-east-1
        activationQueueLength: "1"  # Activate (from 0) when queue has >= 1 message
```

## Step 3: Kafka ScaledObject

```yaml
# apps/consumer/keda-kafka.yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: kafka-sasl
  namespace: myapp
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
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: kafka-consumer
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: kafka-consumer
  pollingInterval: 15
  cooldownPeriod: 300
  minReplicaCount: 1
  maxReplicaCount: 30
  triggers:
    - type: kafka
      metadata:
        bootstrapServers: kafka.kafka.svc.cluster.local:9092
        consumerGroup: myapp-consumer-group
        topic: myapp-events
        lagThreshold: "100"  # Scale when consumer lag > 100 messages per pod
        offsetResetPolicy: latest
      authenticationRef:
        name: kafka-sasl
```

## Step 4: Redis ScaledObject

```yaml
# apps/worker/keda-redis.yaml
apiVersion: keda.sh/v1alpha1
kind: TriggerAuthentication
metadata:
  name: redis-auth
  namespace: myapp
spec:
  secretTargetRef:
    - parameter: password
      name: redis-credentials
      key: password
---
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: redis-worker
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: redis-worker
  pollingInterval: 10
  cooldownPeriod: 120
  minReplicaCount: 0
  maxReplicaCount: 20
  triggers:
    - type: redis
      metadata:
        address: redis.cache.svc.cluster.local:6379
        listName: job-queue
        listLength: "5"    # 5 items per worker
        activationListLength: "1"
        enableTLS: "false"
      authenticationRef:
        name: redis-auth
```

## Step 5: Cron-Based Scheduled Scaling

```yaml
# Scale up during business hours, down at night
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: business-hours-scaler
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  minReplicaCount: 1
  maxReplicaCount: 20
  triggers:
    - type: cron
      metadata:
        timezone: "America/New_York"
        start: "0 8 * * 1-5"   # 8 AM weekdays
        end: "0 18 * * 1-5"    # 6 PM weekdays
        desiredReplicas: "10"   # Scale to 10 during business hours
    - type: aws-sqs-queue  # Also scale on queue depth
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/my-queue
        queueLength: "10"
        awsRegion: us-east-1
```

## Step 6: Flux Kustomization for KEDA Resources

```yaml
# clusters/production/apps/worker-keda.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: worker-keda-scaling
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/worker/scaling
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: keda  # KEDA must be installed
  targetNamespace: myapp
  decryption:
    provider: sops
    secretRef:
      name: sops-age  # For encrypted credentials
```

## Best Practices

- Use `ClusterTriggerAuthentication` for cloud-provider authentication (IRSA, Workload Identity) so credentials are shared across namespaces.
- Set `minReplicaCount: 0` only for workloads that can tolerate cold-start latency when scaling from zero.
- Use `activationQueueLength` or `activationListLength` to define the threshold for waking from scale-to-zero separately from the scale-up threshold.
- Combine KEDA with Cluster Autoscaler: KEDA scales pods, Cluster Autoscaler scales nodes to accommodate those pods.
- Monitor KEDA operator and metrics server logs for scaler errors; failed scaler polls can cause stale metric values.
- Store scaler credentials in SOPS-encrypted secrets in your fleet repository and reference via TriggerAuthentication.

## Conclusion

KEDA deployed via Flux CD provides a powerful, GitOps-managed event-driven autoscaling system that supports over 50 event sources. Its native integration with cloud message queues, streaming platforms, and databases enables truly reactive scaling where workload capacity matches event volume in near real-time. The combination of scale-to-zero and fine-grained trigger configuration makes KEDA particularly valuable for cost optimization of batch and event-driven workloads.
