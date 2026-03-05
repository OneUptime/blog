# How to Use HelmRelease for Deploying Keda with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Helm, HelmRelease, KEDA, Autoscaling, Event-Driven

Description: Learn how to deploy KEDA for event-driven autoscaling on Kubernetes using a Flux HelmRelease.

---

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes with event-driven autoscaling capabilities. It allows you to scale workloads based on external metrics from sources like message queues, databases, and custom APIs, going beyond the CPU and memory metrics supported by the default Horizontal Pod Autoscaler. Deploying KEDA through a Flux HelmRelease ensures your autoscaling infrastructure is managed declaratively in Git.

## Prerequisites

- A Kubernetes cluster with Flux CD installed
- A GitOps repository connected to Flux
- Event sources you plan to scale against (message queues, databases, etc.)

## Creating the HelmRepository

KEDA publishes its Helm charts through the KEDA core repository.

```yaml
# helmrepository-keda.yaml - KEDA Helm chart repository
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: kedacore
  namespace: flux-system
spec:
  interval: 1h
  url: https://kedacore.github.io/charts
```

## Deploying KEDA with HelmRelease

The following HelmRelease deploys KEDA with its operator, metrics API server, and admission webhooks.

```yaml
# helmrelease-keda.yaml - KEDA deployment via Flux
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: keda
  namespace: keda
spec:
  interval: 15m
  chart:
    spec:
      chart: keda
      version: "2.x"
      sourceRef:
        kind: HelmRepository
        name: kedacore
        namespace: flux-system
      interval: 15m
  install:
    createNamespace: true
    atomic: true
    timeout: 10m
    remediation:
      retries: 3
    crds: CreateReplace
  upgrade:
    atomic: true
    timeout: 10m
    cleanupOnFail: true
    remediation:
      retries: 3
      strategy: rollback
    crds: CreateReplace
  values:
    # KEDA Operator configuration
    operator:
      replicaCount: 2

    # Metrics Server configuration
    metricsServer:
      replicaCount: 1

    # Admission Webhooks
    webhooks:
      enabled: true
      replicaCount: 1

    # Resource limits for the operator
    resources:
      operator:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi
      metricServer:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi
      webhooks:
        requests:
          cpu: 50m
          memory: 64Mi
        limits:
          cpu: 200m
          memory: 128Mi

    # Logging configuration
    logging:
      operator:
        level: info
        format: console
      metricServer:
        level: "0"

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

    # Pod disruption budget
    podDisruptionBudget:
      operator:
        minAvailable: 1
```

## Creating ScaledObjects

With KEDA deployed, you can create ScaledObject resources that define how your workloads scale based on external events. Here is an example that scales based on a RabbitMQ queue length.

```yaml
# scaledobject-rabbitmq.yaml - Scale based on RabbitMQ queue depth
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: rabbitmq-consumer
  namespace: apps
spec:
  scaleTargetRef:
    name: queue-consumer
  pollingInterval: 15
  cooldownPeriod: 60
  minReplicaCount: 1
  maxReplicaCount: 30
  triggers:
    - type: rabbitmq
      metadata:
        host: amqp://guest:guest@rabbitmq.rabbitmq.svc.cluster.local:5672/
        queueName: my-queue
        queueLength: "5"
```

## Scaling Based on Prometheus Metrics

KEDA can also scale workloads based on Prometheus query results.

```yaml
# scaledobject-prometheus.yaml - Scale based on Prometheus metrics
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: http-scaler
  namespace: apps
spec:
  scaleTargetRef:
    name: my-web-app
  pollingInterval: 30
  cooldownPeriod: 120
  minReplicaCount: 2
  maxReplicaCount: 20
  triggers:
    - type: prometheus
      metadata:
        serverAddress: http://prometheus-server.monitoring.svc.cluster.local
        metricName: http_requests_per_second
        query: sum(rate(http_requests_total{service="my-web-app"}[2m]))
        threshold: "100"
```

## Using ScaledJobs

For batch workloads, KEDA supports ScaledJob resources that create Kubernetes Jobs based on event triggers.

```yaml
# scaledjob.yaml - Scale Jobs based on queue depth
apiVersion: keda.sh/v1alpha1
kind: ScaledJob
metadata:
  name: batch-processor
  namespace: apps
spec:
  jobTargetRef:
    template:
      spec:
        containers:
          - name: processor
            image: my-processor:latest
        restartPolicy: Never
  pollingInterval: 30
  maxReplicaCount: 10
  triggers:
    - type: rabbitmq
      metadata:
        host: amqp://guest:guest@rabbitmq.rabbitmq.svc.cluster.local:5672/
        queueName: batch-queue
        queueLength: "1"
```

## Verifying the Deployment

```bash
# Check HelmRelease status
flux get helmrelease keda -n keda

# Verify KEDA pods are running
kubectl get pods -n keda

# Check KEDA CRDs are installed
kubectl get crds | grep keda

# List ScaledObjects across all namespaces
kubectl get scaledobjects -A

# Check KEDA operator logs
kubectl logs -n keda -l app.kubernetes.io/name=keda-operator --tail=50
```

## Summary

Deploying KEDA through a Flux HelmRelease from `https://kedacore.github.io/charts` provides event-driven autoscaling for your Kubernetes workloads under full GitOps control. By managing KEDA and its ScaledObject configurations declaratively in Git, you gain a scalable, auditable approach to workload autoscaling that goes well beyond basic CPU and memory metrics.
