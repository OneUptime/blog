# How to Deploy Thanos Sidecar with Prometheus via Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Thanos, Prometheus, Long-term Storage, Object Storage, Observability, HelmRelease

Description: Deploy Thanos sidecar alongside Prometheus for long-term metrics storage using Flux CD, enabling multi-cluster querying and metrics retention beyond Prometheus's local storage limits.

---

## Introduction

Prometheus is excellent for real-time metrics and short-term storage, but its local storage model has practical limits: typically 15-30 days of data before disk costs become prohibitive. Thanos solves this by adding a sidecar to Prometheus that continuously uploads metric blocks to object storage (S3, GCS, or Azure Blob), enabling indefinite retention at storage costs orders of magnitude cheaper than Prometheus's local disk.

Thanos also enables global querying across multiple Prometheus instances — essential for multi-cluster observability where you want a single dashboard showing metrics from all your clusters. The Thanos Sidecar is the first component in this architecture, acting as the bridge between Prometheus and the Thanos ecosystem.

This guide deploys the Thanos Sidecar alongside Prometheus using Flux CD, configuring S3 object storage for long-term metrics retention and setting up the Thanos store components for serving historical data.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- Prometheus deployed (kube-prometheus-stack recommended)
- S3-compatible object storage (AWS S3, MinIO, or GCS with S3 API)
- kubectl with cluster-admin access
- A Git repository connected to Flux CD

## Step 1: Create Object Storage Configuration Secret

Thanos needs credentials to write to object storage. Store them securely.

```bash
# Create the Thanos object storage configuration secret
# Use Sealed Secrets or ESO in production - never commit credentials to Git
kubectl create secret generic thanos-objstore-config \
  --from-file=objstore.yml=thanos-objstore.yml \
  -n monitoring
```

```yaml
# thanos-objstore.yml (create locally, store as secret - never commit)
type: S3
config:
  bucket: my-thanos-metrics
  endpoint: s3.amazonaws.com
  region: us-east-1
  # Use IRSA or IAM roles in production instead of access keys
  access_key: AKIAIOSFODNN7EXAMPLE
  secret_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
  # Enable compression for storage efficiency
  sse_config:
    type: SSE-S3
```

## Step 2: Configure Prometheus with Thanos Sidecar

Update the kube-prometheus-stack HelmRelease to include the Thanos Sidecar container.

```yaml
# infrastructure/monitoring/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: kube-prometheus-stack
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: kube-prometheus-stack
      version: ">=67.0.0 <68.0.0"
      sourceRef:
        kind: HelmRepository
        name: prometheus-community
        namespace: flux-system
  values:
    prometheus:
      prometheusSpec:
        # Minimum storage for recent data (Thanos uploads older blocks)
        retention: 2h  # Short local retention - Thanos handles long-term
        retentionSize: "10GiB"

        # Required for Thanos: enable block uploads
        enableFeatures:
          - exemplar-storage

        # Thanos sidecar configuration
        thanos:
          image: quay.io/thanos/thanos:v0.35.0
          version: v0.35.0
          objectStorageConfig:
            # Reference the pre-created secret
            key: objstore.yml
            name: thanos-objstore-config

        # Storage for Prometheus's local WAL and recent blocks
        storageSpec:
          volumeClaimTemplate:
            spec:
              storageClassName: standard
              accessModes: ["ReadWriteOnce"]
              resources:
                requests:
                  storage: 20Gi

        resources:
          requests:
            cpu: 200m
            memory: 2Gi
          limits:
            cpu: "2"
            memory: 8Gi

        # Prometheus external labels for multi-cluster identification
        externalLabels:
          cluster: production-us-east-1
          region: us-east-1
          env: production
```

## Step 3: Expose Thanos Sidecar gRPC Service

Create a Service for the Thanos Query component to connect to the sidecar.

```yaml
# infrastructure/monitoring/thanos-sidecar-service.yaml
apiVersion: v1
kind: Service
metadata:
  name: thanos-prometheus-sidecar
  namespace: monitoring
  labels:
    app.kubernetes.io/managed-by: flux
    app: thanos-sidecar
spec:
  ports:
    # gRPC port for Thanos Query to connect
    - name: grpc
      port: 10901
      targetPort: 10901
    # HTTP port for metrics and health
    - name: http
      port: 10902
      targetPort: 10902
  selector:
    # Target the Prometheus pod which includes the Thanos sidecar
    app.kubernetes.io/name: prometheus
    prometheus: kube-prometheus-stack-prometheus
```

## Step 4: Deploy Thanos Query Component

Add the Thanos Query component to enable global querying across the sidecar and any other Thanos stores.

```yaml
# infrastructure/monitoring/thanos-query-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: thanos-query
  namespace: monitoring
spec:
  interval: 30m
  chart:
    spec:
      chart: thanos
      version: ">=14.0.0 <15.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
      interval: 12h
  values:
    query:
      enabled: true
      replicaCount: 2
      # Connect to the Prometheus Thanos sidecar
      stores:
        - thanos-prometheus-sidecar.monitoring.svc.cluster.local:10901
      # Deduplicate metrics from replicated Prometheus instances
      replicaLabel: prometheus_replica
      resources:
        requests:
          cpu: 100m
          memory: 256Mi
        limits:
          cpu: 500m
          memory: 1Gi

    # Disable components we are deploying separately
    queryFrontend:
      enabled: false
    bucketweb:
      enabled: false
    compactor:
      enabled: false
    storegateway:
      enabled: false
    ruler:
      enabled: false
```

## Step 5: Apply with Flux Kustomization

Deploy Thanos components with proper ordering.

```yaml
# clusters/production/thanos-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: thanos
  namespace: flux-system
spec:
  interval: 10m
  path: ./infrastructure/monitoring/thanos
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: monitoring  # Prometheus must be running first
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: thanos-query
      namespace: monitoring
  timeout: 10m
```

## Step 6: Verify Thanos Sidecar Operation

Confirm that Thanos is uploading metric blocks to object storage.

```bash
# Check Prometheus pods include Thanos sidecar container
kubectl get pods -n monitoring | grep prometheus
kubectl describe pod prometheus-kube-prometheus-stack-prometheus-0 -n monitoring | grep thanos

# Verify Thanos sidecar logs show block uploads
kubectl logs prometheus-kube-prometheus-stack-prometheus-0 \
  -n monitoring -c thanos-sidecar | grep "upload"

# Check Thanos Query is connecting to the sidecar
kubectl port-forward -n monitoring svc/thanos-query-query 10902:10902 &
curl http://localhost:10902/api/v1/stores

# Query metrics through Thanos Query (should show same data as Prometheus)
curl "http://localhost:10902/api/v1/query?query=up"

# Verify blocks are appearing in S3
aws s3 ls s3://my-thanos-metrics/production-us-east-1/ --recursive | head -20

# Check Flux reconciliation
flux get helmrelease thanos-query -n monitoring
```

## Best Practices

- Set a short local Prometheus retention (2-6 hours) when using Thanos Sidecar; longer retention wastes local disk on data that will be uploaded to object storage anyway.
- Always set `externalLabels` on Prometheus with at minimum `cluster` and `env` labels; without these, Thanos cannot identify the source of metrics in multi-cluster queries.
- Enable Thanos's block upload verification by checking the Thanos Sidecar logs regularly; failed uploads silently lose metric history.
- Use IRSA (IAM Roles for Service Accounts) on EKS or Workload Identity on GKE instead of static credentials for S3 access; this eliminates the need to rotate access keys.
- Deploy Thanos Query with at least 2 replicas for high availability; Thanos Query is stateless and horizontally scalable.
- Monitor the age of the most recent block in object storage; if it is more than 2 hours old, the sidecar may be failing to upload.

## Conclusion

Thanos Sidecar with Prometheus, deployed through Flux CD, transforms Prometheus from a short-term metrics store into the entry point of a long-term observability platform. Metric blocks flow automatically from Prometheus to object storage, where they can be queried years later through the Thanos Query layer. This architecture provides indefinite metrics retention at a fraction of local storage costs while maintaining the Prometheus query interface your team already knows.
