# Deploy Thanos Store Gateway with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Thanos, Store Gateway, Prometheus, S3, Flux CD, GitOps, Kubernetes, Long-Term Metrics

Description: Deploy the Thanos Store Gateway on Kubernetes using Flux CD to serve historical metric blocks from S3 object storage to Thanos Querier. This guide covers sharding, caching, and production deployment patterns.

---

## Introduction

The Thanos Store Gateway is the component responsible for serving historical metric blocks from object storage (S3) to the Thanos Querier. When Grafana runs a query spanning weeks or months, the Querier contacts the Store Gateway to read blocks that have already been compacted and uploaded by the Thanos Sidecar or Ruler.

Without the Store Gateway, the Thanos Querier can only access metrics currently held in Prometheus's local storage. The Store Gateway is what makes truly long-term metric retention possible in a Thanos architecture.

This guide deploys the Store Gateway with index caching for improved query performance, managed via Flux CD.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- Thanos Sidecar deployed and uploading blocks to S3
- S3 bucket with existing metric blocks
- `flux` and `kubectl` CLIs installed

## Step 1: Create the Object Storage Secret

```yaml
# clusters/my-cluster/thanos/store-gateway/objstore-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: thanos-objstore-config
  namespace: monitoring
type: Opaque
stringData:
  # S3 object store configuration — encrypt with SOPS before committing
  objstore.yaml: |
    type: S3
    config:
      bucket: my-thanos-metrics
      endpoint: s3.us-east-1.amazonaws.com
      region: us-east-1
      access_key: AKIAIOSFODNN7EXAMPLE
      secret_key: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

## Step 2: Deploy the Store Gateway via HelmRelease

Configure the Store Gateway with an in-memory index cache and persistent data directory.

```yaml
# clusters/my-cluster/thanos/store-gateway/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: thanos-storegateway
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
    # Enable only the Store Gateway component
    storegateway:
      enabled: true
      replicaCount: 2

      # Mount the object store configuration from the Secret
      existingObjstoreSecret: thanos-objstore-config
      existingObjstoreSecretItems:
        - key: objstore.yaml
          path: objstore.yaml

      extraFlags:
        # In-memory index cache reduces S3 reads for repeated queries
        - --index-cache.config=type: IN-MEMORY
          config:
            max_size: 1GB
        # Maximum time window for block queries per request
        - --store.grpc.series-max-concurrency=20
        # Sync the list of available blocks from S3 every 15 minutes
        - --sync-block-duration=15m

      # Persistent cache directory for downloaded index headers
      persistence:
        enabled: true
        size: 50Gi
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

      # Pod disruption budget to ensure availability during rolling updates
      pdb:
        create: true
        minAvailable: 1

    # Disable all other Thanos components
    query:
      enabled: false
    compactor:
      enabled: false
    queryFrontend:
      enabled: false
```

## Step 3: Configure Store Gateway Sharding for Large Buckets

For large deployments with many blocks, shard the Store Gateway to distribute bucket scanning load.

```yaml
# Additional flags for Store Gateway sharding (add to extraFlags above)
# Each replica handles a subset of blocks based on consistent hashing
- --store.enable-index-header-lazy-reader
- --experimental.enable-vertical-compaction-for-deduplication
# Hash ring configuration for sharding
- --store.grpc.series-download-concurrency=10
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/thanos/store-gateway/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: thanos-storegateway
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/thanos/store-gateway
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  dependsOn:
    - name: thanos-compactor
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: thanos-storegateway
      namespace: monitoring
```

## Best Practices

- Use an in-memory index cache sized to ~10% of your total block index data to significantly reduce S3 GET requests.
- Deploy at least 2 Store Gateway replicas for HA; configure a PodDisruptionBudget to ensure at least 1 is always available.
- Use SSDs for the persistent cache directory; the Store Gateway downloads block index headers that it reads frequently.
- Monitor `thanos_store_bucket_operations_total` to track S3 API call rates and associated costs.
- Use `dependsOn: thanos-compactor` so the compactor finishes compacting blocks before the Store Gateway syncs and serves them.

## Conclusion

The Thanos Store Gateway, managed via Flux CD, completes the Thanos long-term storage architecture by making historical metric blocks queryable from S3. With index caching and horizontal scaling configured in Git, your long-range Prometheus queries remain fast and reliable without manual intervention.
