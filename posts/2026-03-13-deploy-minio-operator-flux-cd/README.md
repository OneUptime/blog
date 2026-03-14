# How to Deploy MinIO Operator with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MinIO, Object Storage, S3, Operator

Description: Deploy the MinIO Kubernetes Operator for managed MinIO object storage tenants using Flux CD HelmRelease.

---

## Introduction

MinIO is a high-performance, S3-compatible object storage system that can run on Kubernetes as a distributed cluster. The MinIO Operator manages MinIO Tenants through the `Tenant` CRD, providing automated deployment, TLS certificate management, and multi-tenant isolation. Each Tenant gets its own distributed MinIO cluster with configurable pools, storage, and resource limits.

Deploying the MinIO Operator through Flux CD gives you GitOps control over the operator itself and over every MinIO Tenant it manages. Storage pools, capacity, and security settings are all version-controlled, making your object storage infrastructure reproducible and auditable.

## Prerequisites

- Kubernetes v1.26+ with Flux CD bootstrapped
- StorageClass supporting `ReadWriteOnce` PVCs
- cert-manager for TLS certificate management
- `kubectl` and `flux` CLIs installed

## Step 1: Add the MinIO HelmRepository

```yaml
# infrastructure/sources/minio-helm.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: minio-operator
  namespace: flux-system
spec:
  interval: 12h
  url: https://operator.min.io
```

## Step 2: Deploy the MinIO Operator

```yaml
# infrastructure/storage/minio/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: minio-operator
```

```yaml
# infrastructure/storage/minio/operator.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: minio-operator
  namespace: minio-operator
spec:
  interval: 30m
  chart:
    spec:
      chart: operator
      version: "6.0.2"
      sourceRef:
        kind: HelmRepository
        name: minio-operator
        namespace: flux-system
  install:
    crds: Create
  upgrade:
    crds: CreateReplace
  values:
    operator:
      replicaCount: 2
      resources:
        requests:
          cpu: "200m"
          memory: "256Mi"
        limits:
          cpu: "500m"
          memory: "512Mi"
    console:
      enabled: true
      replicaCount: 1
      resources:
        requests:
          cpu: "100m"
          memory: "128Mi"
```

## Step 3: Create MinIO Admin Credentials Secret

```yaml
# infrastructure/storage/minio/tenants/production-tenant-secret.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: minio-admin-credentials
  namespace: minio-tenants
type: Opaque
stringData:
  config.env: |
    export MINIO_ROOT_USER=minioadmin
    export MINIO_ROOT_PASSWORD=MinioAdminPassword123!
```

## Step 4: Deploy a MinIO Tenant

```yaml
# infrastructure/storage/minio/tenants/production-tenant.yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: production
  namespace: minio-tenants
spec:
  # MinIO version
  image: minio/minio:RELEASE.2024-06-13T22-53-53Z

  # Credentials
  configuration:
    name: minio-admin-credentials

  # Number of servers and drives per server
  pools:
    - servers: 4             # 4 MinIO server pods
      name: pool-0
      volumesPerServer: 4    # 4 drives per server = 16 drives total
      volumeClaimTemplate:
        metadata:
          name: data
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 100Gi   # 100 GiB per drive × 16 = 1.6 TiB raw
          storageClassName: premium-ssd
      resources:
        requests:
          cpu: "500m"
          memory: "1Gi"
        limits:
          cpu: "2"
          memory: "4Gi"
      # Spread pods across nodes
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - topologyKey: kubernetes.io/hostname
              labelSelector:
                matchLabels:
                  v1.min.io/tenant: production

  # TLS using cert-manager
  requestAutoCert: true

  # Expose services
  exposeServices:
    minio: true     # expose S3 API
    console: true   # expose web console

  # S3 service
  serviceMetadata:
    minioServiceLabels:
      app: minio-production
    consoleServiceLabels:
      app: minio-console-production

  # Prometheus metrics
  prometheusOperator: true
```

## Step 5: Expose MinIO via Ingress

```yaml
# infrastructure/storage/minio/tenants/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minio-production
  namespace: minio-tenants
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"      # unlimited upload size
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - minio.example.com
      secretName: minio-tls
  rules:
    - host: minio.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: minio
                port:
                  number: 443
```

## Step 6: Flux Kustomization

```yaml
# clusters/production/minio-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: minio-operator
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/minio
  prune: true
  healthChecks:
    - apiVersion: apps/v1
      kind: Deployment
      name: minio-operator
      namespace: minio-operator
```

## Step 7: Verify the Tenant

```bash
# Check operator pods
kubectl get pods -n minio-operator

# Check tenant status
kubectl get tenant production -n minio-tenants

# Check MinIO pods (4 servers)
kubectl get pods -n minio-tenants

# Port-forward S3 API
kubectl port-forward svc/minio 9000:443 -n minio-tenants

# Test S3 access with mc (MinIO Client)
mc alias set prod https://localhost:9000 minioadmin MinioAdminPassword123! --insecure
mc mb prod/my-bucket
mc ls prod/

# Upload a test object
echo "Hello MinIO" | mc pipe prod/my-bucket/hello.txt
mc cat prod/my-bucket/hello.txt
```

## Best Practices

- Use at least 4 servers with 4 drives each (16 drives total) for production MinIO - this is the minimum for erasure coding with good performance.
- Enable `requestAutoCert: true` to have the operator generate TLS certificates via cert-manager automatically.
- Set `proxy-body-size: "0"` on the Ingress to allow large object uploads - the default 1 MiB limit will cause upload failures.
- Monitor MinIO's bucket and drive metrics via Prometheus using the built-in `prometheusOperator: true` integration.
- Use MinIO's Identity and Access Management (IAM) to create service accounts for applications rather than using root credentials.

## Conclusion

The MinIO Operator deployed via Flux CD provides a GitOps-managed, S3-compatible object storage platform that scales from small single-node deployments to large distributed clusters. The `Tenant` CRD gives you a clean API for expressing pool configuration, resource limits, and TLS settings. For teams building cloud-native applications that need S3-compatible storage on-premises or in air-gapped environments, MinIO Operator with Flux CD is the modern approach to object storage management.
