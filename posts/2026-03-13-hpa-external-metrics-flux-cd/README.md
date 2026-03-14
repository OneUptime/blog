# How to Configure HPA Based on External Metrics with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, HPA, External Metrics, Kubernetes, Autoscaling, SQS, Datadog

Description: Learn how to configure Kubernetes HPA with external metrics from cloud services like AWS SQS, Google Pub/Sub, and Azure Service Bus using Flux CD.

---

## Introduction

External metrics HPA allows Kubernetes to scale based on metrics from sources outside the cluster-like AWS SQS queue depth, Google Pub/Sub backlog, or Azure Service Bus message count. The Kubernetes External Metrics API requires an adapter that bridges cloud service metrics to Kubernetes. KEDA is the most popular solution for this, but Prometheus Adapter can also bridge external metrics when using Prometheus with cloud exporters.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- KEDA installed (recommended for external metrics)
- Cloud provider credentials (AWS, GCP, or Azure)
- A message queue or external event source

## Step 1: Deploy KEDA via Flux (Recommended for External Metrics)

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
      resources:
        limits:
          memory: 1000Mi
        requests:
          cpu: 100m
          memory: 100Mi
    metricsServer:
      resources:
        limits:
          memory: 1000Mi
        requests:
          cpu: 100m
          memory: 100Mi
```

## Step 2: KEDA ScaledObject for AWS SQS

```yaml
# apps/worker/keda-sqs-scaler.yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: worker-sqs-scaler
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: job-worker
  minReplicaCount: 0  # Scale to zero when queue is empty
  maxReplicaCount: 50
  pollingInterval: 15   # Check queue every 15 seconds
  cooldownPeriod: 300   # Wait 5 min after last message before scaling to 0
  triggers:
    - type: aws-sqs-queue
      metadata:
        queueURL: https://sqs.us-east-1.amazonaws.com/123456789/my-job-queue
        queueLength: "5"  # Target: 5 messages per worker pod
        awsRegion: us-east-1
        # Scale based on approximate visible messages
        identityOwner: pod  # Use pod's IRSA for AWS credentials
```

## Step 3: Use Native HPA External Metrics (via Adapter)

If you prefer using native HPA instead of KEDA ScaledObject:

```yaml
# First, configure your metrics adapter to expose SQS metrics
# Then use HPA external metrics:
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: worker-sqs-hpa
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: job-worker
  minReplicas: 1
  maxReplicas: 50
  metrics:
    - type: External
      external:
        metric:
          name: sqs_queue_depth  # Metric exposed by your adapter
          selector:
            matchLabels:
              queue_name: "my-job-queue"
        target:
          type: AverageValue
          averageValue: "5"  # 5 messages per worker pod
```

## Step 4: Google Pub/Sub External Metrics with KEDA

```yaml
# KEDA ScaledObject for Google Pub/Sub
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: pubsub-worker-scaler
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: pubsub-worker
  minReplicaCount: 1
  maxReplicaCount: 30
  triggers:
    - type: gcp-pubsub
      authenticationRef:
        name: gcp-workload-identity
      metadata:
        subscriptionName: projects/your-project/subscriptions/my-subscription
        subscriptionSize: "100"  # Scale when subscription backlog > 100
```

## Step 5: Azure Service Bus with KEDA

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: servicebus-worker
  namespace: myapp
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: servicebus-worker
  minReplicaCount: 0
  maxReplicaCount: 20
  triggers:
    - type: azure-servicebus
      metadata:
        queueName: my-queue
        namespace: myapp-servicebus
        messageCount: "10"  # Scale when queue has > 10 messages per pod
      authenticationRef:
        name: azure-workload-identity
```

## Step 6: Flux Kustomization for External Metrics Setup

```yaml
# clusters/production/apps/worker-scaling.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: worker-scaling
  namespace: flux-system
spec:
  interval: 5m
  path: ./apps/worker
  prune: true
  sourceRef:
    kind: GitRepository
    name: fleet-repo
  dependsOn:
    - name: keda  # KEDA must be installed before ScaledObjects
  targetNamespace: myapp
```

## Step 7: Verify External Metrics Scaling

```bash
# Check KEDA ScaledObject status
kubectl get scaledobject -n myapp

# View KEDA operator logs
kubectl logs -n keda deployment/keda-operator --tail=30

# Check the HPA created by KEDA
kubectl get hpa -n myapp

# Trigger scaling by adding messages to the queue
# AWS SQS example:
aws sqs send-message-batch \
  --queue-url https://sqs.us-east-1.amazonaws.com/123456789/my-job-queue \
  --entries file://messages.json

# Watch scaling
kubectl get pods -n myapp --watch
```

## Best Practices

- Use KEDA for external metrics autoscaling rather than implementing a custom metrics adapter; KEDA supports 50+ scalers out of the box.
- Enable scale-to-zero (`minReplicaCount: 0`) for batch workloads that only need to run when there are messages.
- Set `cooldownPeriod` to avoid premature scale-to-zero when a queue briefly empties between bursts.
- Use cloud-native authentication (IRSA for AWS, Workload Identity for GCP/Azure) instead of static credentials in secrets.
- Monitor KEDA metrics server latency; external metrics polling adds overhead compared to in-cluster metrics.
- Set queue-length targets based on your worker's processing rate, not arbitrary numbers.

## Conclusion

External metrics HPA enables Kubernetes workloads to scale in response to cloud services like message queues, enabling true event-driven autoscaling. KEDA simplifies this dramatically with its broad scaler support. Managing ScaledObjects through Flux CD keeps the scaling policy in Git, providing complete visibility into why and how your workloads scale in response to external events.
