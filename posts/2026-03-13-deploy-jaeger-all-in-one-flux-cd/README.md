# Deploy Jaeger All-in-One with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Jaeger, Distributed Tracing, Flux CD, GitOps, Kubernetes, OpenTelemetry, Observability

Description: Deploy Jaeger in all-in-one mode on Kubernetes using Flux CD for GitOps-managed distributed tracing. This guide is ideal for development and small production environments that need a quick, self-contained tracing backend.

---

## Introduction

Jaeger is an open-source distributed tracing system originally built by Uber. The all-in-one deployment bundles the agent, collector, query service, and in-memory storage into a single container, making it an excellent choice for development clusters, testing environments, or small production workloads where operational simplicity is the priority.

Deploying Jaeger all-in-one via Flux CD keeps your tracing infrastructure versioned alongside your application deployments. When you're ready to scale to a persistent backend, the migration to Cassandra or Elasticsearch is a Git commit away.

This guide deploys Jaeger all-in-one using the Jaeger Operator and configures OTLP ingestion for modern OpenTelemetry-instrumented applications.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- `flux` and `kubectl` CLIs installed
- Applications instrumented with OpenTelemetry or Jaeger client libraries

## Step 1: Install cert-manager (Required by Jaeger Operator)

The Jaeger Operator's webhook requires cert-manager for TLS certificate generation.

```yaml
# clusters/my-cluster/cert-manager/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: cert-manager
  namespace: cert-manager
spec:
  interval: 15m
  chart:
    spec:
      chart: cert-manager
      version: ">=1.13.0 <2.0.0"
      sourceRef:
        kind: HelmRepository
        name: jetstack
        namespace: flux-system
  values:
    # Install CRDs as part of the Helm release
    installCRDs: true
```

## Step 2: Deploy the Jaeger Operator via HelmRelease

```yaml
# clusters/my-cluster/jaeger/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: jaegertracing
  namespace: flux-system
spec:
  interval: 12h
  url: https://jaegertracing.github.io/helm-charts
---
# clusters/my-cluster/jaeger/helmrelease-operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: jaeger-operator
  namespace: observability
spec:
  interval: 15m
  chart:
    spec:
      chart: jaeger-operator
      version: ">=2.49.0 <3.0.0"
      sourceRef:
        kind: HelmRepository
        name: jaegertracing
        namespace: flux-system
  values:
    # Watch all namespaces for Jaeger custom resources
    rbac:
      clusterRole: true
    # Enable Prometheus metrics for the operator
    metrics:
      prometheusRule:
        enabled: true
      serviceMonitor:
        enabled: true
```

## Step 3: Create the Jaeger All-in-One Instance

Use the Jaeger CR to create a fully self-contained tracing backend.

```yaml
# clusters/my-cluster/jaeger/jaeger-instance.yaml
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: jaeger-allinone
  namespace: observability
spec:
  # All-in-one mode: collector, query, and agent in one pod
  strategy: allInOne
  allInOne:
    image: jaegertracing/all-in-one:latest
    options:
      # Set log level to info for production-like environments
      log-level: info
    metricsStorage:
      type: prometheus

  storage:
    # In-memory storage — data is lost on pod restart
    # Use this for dev/test only; switch to Cassandra/ES for production
    type: memory
    options:
      memory:
        max-traces: 100000

  ingress:
    enabled: true
    hosts:
      - jaeger.example.com
    annotations:
      cert-manager.io/cluster-issuer: letsencrypt-prod
    tls:
      - hosts:
          - jaeger.example.com
        secretName: jaeger-tls
```

## Step 4: Configure OTLP Ingestion

Expose the OTLP gRPC and HTTP ports so OpenTelemetry applications can send traces directly.

```yaml
# clusters/my-cluster/jaeger/otlp-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: jaeger-otlp
  namespace: observability
spec:
  selector:
    app.kubernetes.io/instance: jaeger-allinone
    app.kubernetes.io/component: all-in-one
  ports:
    # OTLP gRPC port
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    # OTLP HTTP port
    - name: otlp-http
      port: 4318
      targetPort: 4318
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/jaeger/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: jaeger
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/jaeger
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    # Ensure cert-manager is healthy before deploying Jaeger operator
    - name: cert-manager
```

## Best Practices

- Use all-in-one mode for development and staging only; the in-memory store loses all traces on pod restart.
- Set `max-traces` in memory storage to prevent unbounded memory growth.
- Migrate to a persistent backend (Cassandra or Elasticsearch) before running in production.
- Use `dependsOn` in the Kustomization to ensure cert-manager is ready before the Jaeger Operator installs its webhook.
- Enable Prometheus metrics and the ServiceMonitor to track span ingestion rates and query latency.

## Conclusion

Jaeger all-in-one deployed via Flux CD gives development and small teams a zero-friction distributed tracing setup that is fully version-controlled. When tracing requirements grow, the path to a persistent production backend is a controlled Git change rather than a manual migration.
