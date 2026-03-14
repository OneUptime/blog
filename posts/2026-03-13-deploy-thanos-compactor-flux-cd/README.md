# Deploy Thanos Compactor with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Thanos, Prometheus, Compactor, S3, Flux CD, GitOps, Kubernetes, Long-Term Storage

Description: Deploy the Thanos Compactor component on Kubernetes using Flux CD to compact and downsample Prometheus metric blocks in object storage. This guide covers retention configuration, downsampling, and GitOps management.

---

## Introduction

The Thanos Compactor is responsible for compacting and downsampling the Prometheus metric blocks that Thanos Sidecar or Ruler upload to object storage. Without the compactor, your object storage fills with small, uncompacted blocks and queries become progressively slower as Thanos Store Gateway must read many small files.

The compactor runs as a single-replica component (it requires exclusive access to the bucket) and performs three key functions: compaction of overlapping or small blocks, downsampling to create 5-minute and 1-hour resolution copies for fast range queries, and enforcing block retention policies.

Managing the compactor via Flux CD ensures its retention configuration and S3 access credentials are version-controlled.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Thanos Sidecar or Ruler already writing blocks to an S3 bucket
- S3 bucket credentials with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`
- `flux` and `kubectl` CLIs installed

## Step 1: Create the Object Storage Configuration Secret

Store S3 credentials as an encrypted Kubernetes Secret for the compactor to use.

```yaml
# clusters/my-cluster/thanos/compactor-objstore-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore-config
  namespace: monitoring
type: Opaque
stringData:
  # Thanos object store configuration — encrypt with SOPS before committing
  objstore.yaml: |
    type: S3
    config:
      bucket: my-thanos-metrics
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      access_key: AKIAIOSFODNN7EXAMPLE
      secret_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 2: Deploy the Thanos Compactor via HelmRelease

```yaml
# clusters/my-cluster/thanos/compactor-helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: bitnami
  namespace: flux-system
spec:
  interval: 12h
  url: https://charts.bitnami.com/bitnami
---
# clusters/my-cluster/thanos/compactor-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: thanos-compactor
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: thanos
      version: ">=13.0.0 <14.0.0"
      sourceRef:
        kind: HelmRepository
        name: bitnami
        namespace: flux-system
  values:
    # Deploy only the compactor component
    compactor:
      enabled: true
      # Retention for raw (non-downsampled) blocks — keep 30 days
      retentionResolutionRaw: 30d
      # Retention for 5-minute downsampled blocks — keep 90 days
      retentionResolution5m: 90d
      # Retention for 1-hour downsampled blocks — keep 365 days
      retentionResolution1h: 365d
      # Compact on a schedule (every 2 hours) using wait mode
      extraFlags:
        - --wait
        - --wait-interval=2h
        - --compact.enable-vertical-compaction
        - --deduplication.replica-label=prometheus_replica
      # Mount the object store configuration from the Secret
      existingObjstoreSecret: thanos-objstore-config
      existingObjstoreSecretItems:
        - key: objstore.yaml
          path: objstore.yaml
      persistence:
        # Local scratch space for the compactor working directory
        enabled: true
        size: 100Gi
        storageClass: fast-ssd
      resources:
        requests:
          cpu: "500m"
          memory: "2Gi"
        limits:
          cpu: "2"
          memory: "8Gi"
      serviceMonitor:
        enabled: true

    # Disable all other Thanos components in this release
    query:
      enabled: false
    queryFrontend:
      enabled: false
    storegateway:
      enabled: false
    ruler:
      enabled: false
```

## Step 3: Create the Flux Kustomization

```yaml
# clusters/my-cluster/thanos/compactor-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: thanos-compactor
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/thanos/compactor
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: thanos-compactor
      namespace: monitoring
```

## Best Practices

- The compactor must be a single replica with exclusive bucket access; never run two compactors against the same bucket.
- Set `--deduplication.replica-label=prometheus_replica` to deduplicate metrics from HA Prometheus pairs before compaction.
- Allocate a large local PVC for the compactor's working directory; it downloads blocks for compaction before re-uploading.
- Set generous memory limits; compacting many small blocks in parallel is memory-intensive.
- Monitor compactor metrics—especially `thanos_compact_halted`—which indicates the compactor stopped due to an error.

## Conclusion

The Thanos Compactor, deployed and managed via Flux CD, keeps your object storage efficient and your long-term queries fast by continuously compacting and downsampling metric blocks. Its retention configuration lives in Git, making storage policy changes auditable and consistent across environments.
