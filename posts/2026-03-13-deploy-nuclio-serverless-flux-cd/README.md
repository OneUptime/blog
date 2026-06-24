# How to Deploy Nuclio Serverless with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Nuclio, Serverless, High Performance, FaaS, Real-Time

Description: Deploy Nuclio high-performance serverless platform using Flux CD to run real-time event-driven functions with nanosecond latency on Kubernetes.

---

## Introduction

Nuclio is a high-performance serverless framework purpose-built for real-time event processing and data science. Unlike general-purpose serverless frameworks, Nuclio is designed for CPU-intensive and data-intensive workloads, offering advanced features like GPU support, Kubernetes placement controls, and support for Kafka, Kinesis, and MQTT triggers natively.

Managing Nuclio through Flux CD provides a reproducible, version-controlled deployment of the Nuclio control plane and enables GitOps-driven function management. Platform teams can govern function resources, triggers, and scaling policies through pull requests.

This guide covers deploying Nuclio on Kubernetes using Flux CD HelmRelease and defining functions declaratively.

## Prerequisites

- Kubernetes cluster (1.25+)
- Flux CD v2 bootstrapped to your Git repository
- A container registry accessible from the cluster for function images
- kubectl access

## Step 1: Create the Namespace and HelmRepository

```yaml
# clusters/my-cluster/nuclio/namespace.yaml

apiVersion: v1
kind: Namespace
metadata:
  name: nuclio
  labels:
    app.kubernetes.io/managed-by: flux
---
# clusters/my-cluster/nuclio/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: nuclio
  namespace: flux-system
spec:
  interval: 12h
  url: https://nuclio.github.io/nuclio/charts
```

## Step 2: Deploy Nuclio via HelmRelease

```yaml
# clusters/my-cluster/nuclio/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: nuclio
  namespace: nuclio
spec:
  interval: 1h
  chart:
    spec:
      chart: nuclio
      version: "0.21.*"
      sourceRef:
        kind: HelmRepository
        name: nuclio
        namespace: flux-system
      interval: 12h
  values:
    # Controller configuration
    controller:
      enabled: true
      resources:
        requests:
          cpu: 250m
          memory: 128Mi
        limits:
          cpu: 1
          memory: 512Mi
    # Dashboard (UI) configuration
    dashboard:
      enabled: true
      replicas: 1
      containerBuilderKind: kaniko
    # Registry configuration for built function images
    registry:
      pushPullUrl: myregistry.io
    # Autoscaler for scale-to-zero
    autoscaler:
      enabled: true
    # DLX (dead letter exchange) for event handling
    dlx:
      enabled: true
```

## Step 3: Create the Flux Kustomization for Nuclio

```yaml
# clusters/my-cluster/nuclio/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
---
# clusters/my-cluster/flux-kustomization-nuclio.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: nuclio
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/nuclio
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: nuclio-controller
      namespace: nuclio
```

## Step 4: Deploy a Nuclio Function

```yaml
# clusters/my-cluster/nuclio-functions/event-processor.yaml
apiVersion: nuclio.io/v1beta1
kind: NuclioFunction
metadata:
  name: event-processor
  namespace: nuclio
spec:
  # Runtime environment
  runtime: python:3.12
  handler: main:handler
  # Function handler source, encoded as base64 as required by Nuclio
  build:
    functionSourceCode: "aW1wb3J0IGpzb24KCgpkZWYgaGFuZGxlcihjb250ZXh0LCBldmVudCk6CiAgICBjb250ZXh0LmxvZ2dlci5pbmZvKGYiUHJvY2Vzc2luZyBldmVudDoge2V2ZW50LmJvZHl9IikKICAgIGRhdGEgPSBqc29uLmxvYWRzKGV2ZW50LmJvZHkpCiAgICByZXN1bHQgPSB7InByb2Nlc3NlZCI6IFRydWUsICJpbnB1dCI6IGRhdGF9CiAgICByZXR1cm4gY29udGV4dC5SZXNwb25zZSgKICAgICAgICBib2R5PWpzb24uZHVtcHMocmVzdWx0KSwKICAgICAgICBjb250ZW50X3R5cGU9ImFwcGxpY2F0aW9uL2pzb24iLAogICAgICAgIHN0YXR1c19jb2RlPTIwMCwKICAgICkK"
    # Dependencies
    commands:
      - pip install requests

  # Trigger configuration - HTTP + Kafka
  triggers:
    http:
      kind: http
      numWorkers: 4
      attributes:
        port: 8080
    kafka-events:
      kind: kafka-cluster
      numWorkers: 8
      attributes:
        brokers:
          - kafka.kafka.svc.cluster.local:9092
        topics:
          - raw-events
        consumerGroup: event-processor-group
        initialOffset: latest

  # Resource configuration
  resources:
    requests:
      cpu: "500m"
      memory: "256Mi"
    limits:
      cpu: "2"
      memory: "512Mi"

  # Scaling configuration
  minReplicas: 1
  maxReplicas: 20
  targetCPU: 75
```

## Step 5: Create Flux Kustomization for Functions

```yaml
# clusters/my-cluster/flux-kustomization-nuclio-functions.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: nuclio-functions
  namespace: flux-system
spec:
  interval: 5m
  dependsOn:
    - name: nuclio
  path: ./clusters/my-cluster/nuclio-functions
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
```

## Step 6: Test the Function

```bash
# Verify Nuclio deployment
flux get kustomizations

# Check function status
kubectl get nucliofunctions -n nuclio

# Port-forward the dashboard
kubectl port-forward -n nuclio svc/nuclio-dashboard 8070:8070
# Open http://localhost:8070 in your browser

# Test HTTP trigger
kubectl port-forward -n nuclio svc/nuclio-event-processor 8080:8080
curl -X POST http://localhost:8080 \
  -H "Content-Type: application/json" \
  -d '{"eventType": "user.signup", "userId": "123"}'
```

## Best Practices

- Use the `NuclioFunction` CRD to declare all functions in Git rather than using the Nuclio dashboard, which is imperative and not GitOps-compatible.
- For GPU workloads, add `spec.resources.limits["nvidia.com/gpu"]` to functions running on GPU nodes.
- Configure Kafka triggers directly in the function spec for high-throughput event processing - Nuclio handles consumer group management automatically.
- Enable the Nuclio autoscaler for scale-to-zero on cost-sensitive functions that have bursty, intermittent traffic.
- Use Kubernetes priority classes with Nuclio's `priorityClassName` and `preemptionPolicy` fields for batch functions that should yield resources to higher-priority inference functions during peak demand.

## Conclusion

Nuclio deployed and managed by Flux CD provides a high-performance serverless platform for real-time event processing with full GitOps lifecycle management. Function definitions, triggers, and scaling policies are version-controlled, and Nuclio's advanced features - GPU support, native messaging triggers, and high-throughput runtimes - make it an excellent choice for data-intensive serverless workloads.
