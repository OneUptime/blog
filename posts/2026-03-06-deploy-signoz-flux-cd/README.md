# How to Deploy Signoz with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, SigNoz, Observability, Tracing, Metrics, Logs, GitOps, Kubernetes, OpenTelemetry

Description: A step-by-step guide to deploying Signoz, an open-source observability platform, on Kubernetes using Flux CD and GitOps principles.

---

## Introduction

Signoz is an open-source observability platform that provides metrics, traces, and logs in a single pane of glass. Built on top of OpenTelemetry and ClickHouse, Signoz offers a powerful alternative to commercial observability tools like Datadog and New Relic. Deploying Signoz with Flux CD ensures your observability stack is managed through GitOps, making upgrades and configuration changes trackable and reversible.

This guide walks you through deploying Signoz on Kubernetes using Flux CD, including configuring the OpenTelemetry collector, ClickHouse storage, and the Signoz query service.

## Prerequisites

Before starting, ensure you have:

- A Kubernetes cluster (v1.26 or later) with at least 8 GB of available memory
- Flux CD installed and bootstrapped
- A Git repository connected to Flux CD
- kubectl configured for your cluster
- At least 50 GB of available persistent storage

## Repository Structure

```text
clusters/
  my-cluster/
    signoz/
      namespace.yaml
      helmrepository.yaml
      helmrelease.yaml
      kustomization.yaml
```

## Step 1: Create the Namespace

```yaml
# clusters/my-cluster/signoz/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: signoz
  labels:
    toolkit.fluxcd.io/tenant: observability
```

## Step 2: Add the Helm Repository

Register the Signoz Helm chart repository with Flux.

```yaml
# clusters/my-cluster/signoz/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: signoz
  namespace: signoz
spec:
  interval: 1h
  url: https://charts.signoz.io
```

## Step 3: Create the HelmRelease

Deploy Signoz with all its components through a HelmRelease resource.

```yaml
# clusters/my-cluster/signoz/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: signoz
  namespace: signoz
spec:
  interval: 30m
  chart:
    spec:
      chart: signoz
      version: "0.52.x"
      sourceRef:
        kind: HelmRepository
        name: signoz
      interval: 12h
  # Signoz has many components, allow extra time for deployment
  timeout: 15m
  values:
    # Frontend configuration for the Signoz web UI
    frontend:
      replicaCount: 1
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi

    # Query service processes and returns observability data
    queryService:
      replicaCount: 1
      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: "1"
          memory: 1Gi

    # Alert manager handles alerting rules and notifications
    alertmanager:
      replicaCount: 1
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi

    # ClickHouse is the storage backend for all observability data
    clickhouse:
      replicaCount: 1
      resources:
        requests:
          cpu: 500m
          memory: 1Gi
        limits:
          cpu: "2"
          memory: 4Gi
      persistence:
        enabled: true
        size: 50Gi
        storageClass: standard
      # Cold storage configuration for long-term retention
      coldStorage:
        enabled: false

    # OpenTelemetry Collector receives, processes, and exports telemetry data
    otelCollector:
      replicaCount: 1
      resources:
        requests:
          cpu: 250m
          memory: 512Mi
        limits:
          cpu: "1"
          memory: 1Gi
      # Configure the collector to accept OTLP data
      config:
        receivers:
          otlp:
            protocols:
              grpc:
                endpoint: 0.0.0.0:4317
              http:
                endpoint: 0.0.0.0:4318

    # OpenTelemetry Collector running as a DaemonSet for node-level collection
    otelCollectorMetrics:
      enabled: true
      resources:
        requests:
          cpu: 100m
          memory: 128Mi
        limits:
          cpu: 500m
          memory: 256Mi
```

## Step 4: Create the Kustomization

Bundle all Signoz resources together.

```yaml
# clusters/my-cluster/signoz/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - namespace.yaml
  - helmrepository.yaml
  - helmrelease.yaml
```

## Step 5: Create the Flux Kustomization

Tell Flux to reconcile the Signoz directory.

```yaml
# clusters/my-cluster/signoz-sync.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: signoz
  namespace: flux-system
spec:
  interval: 10m
  targetNamespace: signoz
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./clusters/my-cluster/signoz
  prune: true
  wait: true
  timeout: 15m
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: signoz
      namespace: signoz
```

## Step 6: Configure Application Instrumentation

Once Signoz is deployed, configure your applications to send telemetry data to the OpenTelemetry Collector.

```yaml
# Example: Deploying an application with OpenTelemetry instrumentation
apiVersion: apps/v1
kind: Deployment
metadata:
  name: sample-app
  namespace: default
spec:
  replicas: 1
  selector:
    matchLabels:
      app: sample-app
  template:
    metadata:
      labels:
        app: sample-app
    spec:
      containers:
        - name: app
          image: my-app:latest
          env:
            # Point the OTLP exporter to the Signoz collector service
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://signoz-otel-collector.signoz.svc:4317"
            # Set the service name for identification in Signoz
            - name: OTEL_SERVICE_NAME
              value: "sample-app"
            # Configure the resource attributes
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "deployment.environment=production,service.version=1.0.0"
            # Use the OTLP exporter for traces
            - name: OTEL_TRACES_EXPORTER
              value: "otlp"
            # Use the OTLP exporter for metrics
            - name: OTEL_METRICS_EXPORTER
              value: "otlp"
```

## Step 7: Set Up Data Retention

Configure data retention policies to manage storage costs.

```yaml
# clusters/my-cluster/signoz/retention-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: signoz-retention-config
  namespace: signoz
data:
  # Retention settings applied via Signoz API or configuration
  retention.yaml: |
    # Traces retention in hours (7 days)
    traces_ttl: 168
    # Metrics retention in hours (30 days)
    metrics_ttl: 720
    # Logs retention in hours (15 days)
    logs_ttl: 360
```

## Step 8: Configure Ingress for External Access

Expose the Signoz frontend through an Ingress resource.

```yaml
# clusters/my-cluster/signoz/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: signoz-frontend
  namespace: signoz
  annotations:
    # Use cert-manager for automatic TLS certificate provisioning
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - signoz.example.com
      secretName: signoz-tls
  rules:
    - host: signoz.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: signoz-frontend
                port:
                  number: 3301
```

## Verifying the Deployment

After pushing all manifests to your Git repository, verify the deployment.

```bash
# Check Flux reconciliation status
flux get kustomizations signoz

# Check HelmRelease status
flux get helmreleases -n signoz

# Verify all pods are running
kubectl get pods -n signoz

# Check ClickHouse is ready and accepting connections
kubectl logs -n signoz -l app=clickhouse --tail=20

# Port-forward to access the Signoz UI locally
kubectl port-forward -n signoz svc/signoz-frontend 3301:3301
```

After port-forwarding, open your browser and navigate to `http://localhost:3301` to access the Signoz dashboard. On first login, you will be asked to create an admin account.

## Troubleshooting

Common issues when deploying Signoz:

- **ClickHouse pods crashing**: Check memory limits. ClickHouse requires significant memory, especially during data ingestion. Increase limits to at least 4Gi.
- **No data appearing in the UI**: Verify that your applications are sending data to the correct OTLP endpoint. Check the otel-collector logs for connection errors.
- **Slow query performance**: ClickHouse may need more CPU or memory. Consider increasing replica count for the query service.
- **PVC not binding**: Ensure your storage class supports dynamic provisioning and has sufficient capacity.
- **Collector dropping spans**: Increase the collector memory limit and check the batch processor configuration for queue size settings.

## Conclusion

You have successfully deployed Signoz on Kubernetes using Flux CD. Signoz provides a comprehensive observability platform with traces, metrics, and logs powered by OpenTelemetry. With Flux CD managing the deployment, you can version-control your configuration, safely roll back changes, and automate upgrades. As your observability needs grow, you can scale individual components by updating the HelmRelease values in your Git repository.
