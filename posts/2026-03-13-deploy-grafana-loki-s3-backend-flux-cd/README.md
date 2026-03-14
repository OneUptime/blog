# Deploy Grafana Loki with S3 Backend Using Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Grafana, Loki, S3, Object Storage, Flux CD, GitOps, Kubernetes, Logging

Description: Deploy Grafana Loki in Simple Scalable mode with an S3-compatible object storage backend on Kubernetes using Flux CD. This guide covers chunk storage, ruler configuration, and production-ready GitOps patterns.

---

## Introduction

Grafana Loki is a horizontally scalable log aggregation system designed to be cost-effective by indexing only metadata (labels) while storing log chunks in object storage. Running Loki with an S3 backend decouples storage from compute, allowing you to scale ingesters and queriers independently.

Deploying Loki via Flux CD ensures your storage configuration, retention policies, and scaling parameters are all version-controlled. Changes to chunk size, retention period, or S3 bucket configuration flow through a pull request and are applied automatically.

This guide uses Loki's Simple Scalable deployment mode, which provides a good balance between simplicity and scalability for mid-sized environments.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- An S3-compatible bucket (AWS S3, MinIO, GCS with S3 emulation, etc.)
- AWS credentials or an IAM role with `s3:GetObject`, `s3:PutObject`, `s3:DeleteObject`, `s3:ListBucket`
- `flux` and `kubectl` CLIs installed

## Step 1: Create the S3 Credentials Secret

Store AWS credentials as a Kubernetes Secret, encrypted with SOPS before committing.

```yaml
# clusters/my-cluster/loki/s3-secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: loki-s3-credentials
  namespace: monitoring
type: Opaque
stringData:
  # AWS credentials for S3 bucket access — encrypt with SOPS
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

## Step 2: Add the Grafana HelmRepository

```yaml
# clusters/my-cluster/loki/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 12h
  url: https://grafana.github.io/helm-charts
```

## Step 3: Deploy Loki with S3 Backend via HelmRelease

Configure the HelmRelease with Simple Scalable mode and S3 storage configuration.

```yaml
# clusters/my-cluster/loki/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2beta2
kind: HelmRelease
metadata:
  name: loki
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: loki
      version: ">=6.0.0 <7.0.0"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  valuesFrom:
    # Inject S3 credentials from the Secret into Helm values
    - kind: Secret
      name: loki-s3-credentials
      valuesKey: AWS_ACCESS_KEY_ID
      targetPath: loki.storage.s3.accessKeyId
    - kind: Secret
      name: loki-s3-credentials
      valuesKey: AWS_SECRET_ACCESS_KEY
      targetPath: loki.storage.s3.secretAccessKey
  values:
    # Use Simple Scalable deployment mode (read/write/backend components)
    deploymentMode: SimpleScalable

    loki:
      auth_enabled: false
      commonConfig:
        replication_factor: 2
      storage:
        type: s3
        s3:
          region: us-east-1
          bucketnames: my-loki-chunks
          s3ForcePathStyle: false
      schemaConfig:
        configs:
          - from: "2024-01-01"
            store: tsdb
            object_store: s3
            schema: v13
            index:
              prefix: loki_index_
              period: 24h
      limits_config:
        # Retain logs for 30 days
        retention_period: 720h

    # Scale write path
    write:
      replicas: 2

    # Scale read path
    read:
      replicas: 2

    # Single backend component
    backend:
      replicas: 1
```

## Step 4: Create the Flux Kustomization

```yaml
# clusters/my-cluster/loki/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: loki
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/loki
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: apps/v1
      kind: StatefulSet
      name: loki-write
      namespace: monitoring
    - apiVersion: apps/v1
      kind: Deployment
      name: loki-read
      namespace: monitoring
```

## Best Practices

- Use schema version `v13` with TSDB index for best performance on Loki 3.x.
- Set `replication_factor: 2` or higher for production; single-replica clusters lose data if an ingester crashes.
- Configure S3 lifecycle rules to expire old chunks; Loki's compactor handles index expiry but relies on S3 object expiry for chunk deletion.
- Use `valuesFrom` to inject S3 credentials from Secrets rather than embedding them directly in HelmRelease values.
- Enable `auth_enabled: true` in multi-tenant environments and use Grafana datasource per-tenant headers.

## Conclusion

Grafana Loki with an S3 backend provides a scalable, cost-effective log aggregation solution that separates storage concerns from compute. Managing it with Flux CD gives you GitOps-driven lifecycle management, making storage migrations, retention changes, and scaling operations as simple as a Git commit.
