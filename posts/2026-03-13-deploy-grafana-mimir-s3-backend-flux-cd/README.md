# Deploy Grafana Mimir with S3 Backend Using Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, Grafana Mimir, Prometheus, S3, Observability, HelmRelease

Description: Deploy Grafana Mimir, a horizontally scalable long-term Prometheus-compatible metrics store, with an S3 object storage backend on Kubernetes using Flux CD and GitOps practices.

---

## Introduction

Grafana Mimir is a highly scalable, multi-tenant time-series database that is fully compatible with the Prometheus remote_write API. By offloading metric storage to S3, Mimir decouples retention from cluster storage, enabling years of metric history at a fraction of the cost of local SSDs.

Managing Mimir via Flux CD means your block storage configuration, compaction schedules, and query-sharding parameters are all tracked in Git. Upgrades, scaling events, and storage configuration changes become auditable pull requests.

This guide deploys Mimir with the `mimir-distributed` Helm chart and an S3 backend, which is ideal for teams moving from a single Prometheus instance and looking for longer retention without immediate operational complexity.

## Prerequisites

- Kubernetes cluster with Flux CD bootstrapped
- S3-compatible bucket with appropriate IAM permissions
- `flux` and `kubectl` CLIs installed
- Prometheus or Grafana Alloy configured with `remote_write`

## Step 1: Create the S3 Credentials Secret

Encrypt this Secret with SOPS before committing to your Git repository.

```yaml
# clusters/my-cluster/mimir/s3-secret.yaml

apiVersion: v1
kind: Secret
metadata:
  name: mimir-s3-credentials
  namespace: monitoring
type: Opaque
stringData:
  # S3 access key - must be SOPS-encrypted before committing
  AWS_ACCESS_KEY_ID: "AKIAIOSFODNN7EXAMPLE"
  AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
```

## Step 2: Add the Grafana HelmRepository

```yaml
# clusters/my-cluster/mimir/helmrepository.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: grafana
  namespace: flux-system
spec:
  interval: 12h
  url: https://grafana.github.io/helm-charts
```

## Step 3: Deploy Mimir via HelmRelease

Configure Mimir with S3 blocks, ruler, and alertmanager storage.

```yaml
# clusters/my-cluster/mimir/helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: mimir
  namespace: monitoring
spec:
  interval: 15m
  chart:
    spec:
      chart: mimir-distributed
      version: ">=5.0.0 <6.0.0"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  values:
    # Inject S3 credentials into the Mimir pods as environment variables
    global:
      extraEnvFrom:
        - secretRef:
            name: mimir-s3-credentials
      podAnnotations:
        bucketSecretVersion: "0"

    # Disable the built-in test MinIO deployment when using external S3
    minio:
      enabled: false

    mimir:
      structuredConfig:
        common:
          storage:
            backend: s3
            s3:
              endpoint: s3.us-east-1.amazonaws.com
              region: us-east-1
        blocks_storage:
          backend: s3
          s3:
            bucket_name: my-mimir-blocks
            endpoint: s3.us-east-1.amazonaws.com
            region: us-east-1
            access_key_id: ${AWS_ACCESS_KEY_ID}
            secret_access_key: ${AWS_SECRET_ACCESS_KEY}
        ruler_storage:
          backend: s3
          s3:
            bucket_name: my-mimir-ruler
            endpoint: s3.us-east-1.amazonaws.com
            region: us-east-1
            access_key_id: ${AWS_ACCESS_KEY_ID}
            secret_access_key: ${AWS_SECRET_ACCESS_KEY}
        alertmanager_storage:
          backend: s3
          s3:
            bucket_name: my-mimir-alertmanager
            endpoint: s3.us-east-1.amazonaws.com
            region: us-east-1
            access_key_id: ${AWS_ACCESS_KEY_ID}
            secret_access_key: ${AWS_SECRET_ACCESS_KEY}
        # Retain metrics for 1 year
        limits:
          compactor_blocks_retention_period: 8760h

    # Enable self-monitoring
    metaMonitoring:
      serviceMonitor:
        enabled: true
```

## Step 4: Configure Prometheus remote_write to Mimir

Point your Prometheus or Alloy instance at Mimir's distributor endpoint.

```yaml
# Example prometheus.yaml snippet (not a Flux resource)
remote_write:
  - url: http://mimir-distributor.monitoring.svc:8080/api/v1/push
    # Tenant header required when multi-tenancy is enabled
    headers:
      X-Scope-OrgID: "default"
```

## Step 5: Create the Flux Kustomization

```yaml
# clusters/my-cluster/mimir/kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: mimir
  namespace: flux-system
spec:
  interval: 10m
  path: ./clusters/my-cluster/mimir
  prune: true
  sourceRef:
    kind: GitRepository
    name: flux-system
  healthChecks:
    - apiVersion: helm.toolkit.fluxcd.io/v2
      kind: HelmRelease
      name: mimir
      namespace: monitoring
```

## Best Practices

- Start with the Helm chart defaults and scale individual Mimir components only when query latency or ingestion rate demands it.
- Use separate S3 buckets for blocks, ruler, and alertmanager storage to simplify lifecycle policies.
- Enable `metaMonitoring.serviceMonitor.enabled: true` to scrape Mimir's own metrics with kube-prometheus-stack.
- Set `compactor_blocks_retention_period` to match your data retention SLO; the compactor enforces this automatically.
- Use IAM Roles for Service Accounts (IRSA) on EKS instead of static credentials for better security posture.

## Conclusion

Grafana Mimir with S3 storage provides a production-grade, long-term metrics store that scales horizontally and integrates seamlessly with the Prometheus ecosystem. Deploying and managing it via Flux CD ensures your entire metrics infrastructure is versioned, auditable, and automatically reconciled.
