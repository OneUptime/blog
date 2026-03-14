# How to Deploy MinIO Tenant with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MinIO, Tenant, Object Storage, S3, Multi-tenancy

Description: Deploy a MinIO Tenant for object storage on Kubernetes using Flux CD GitOps for fully declarative S3-compatible storage provisioning.

---

## Introduction

A MinIO Tenant is a dedicated, isolated MinIO object storage cluster managed by the MinIO Operator. Each Tenant has its own credentials, storage pools, and network exposure — enabling multiple application teams to share a single MinIO Operator while having isolated storage environments. This multi-tenancy model is ideal for platform teams that need to provision S3-compatible storage for multiple teams from a single control plane.

Managing MinIO Tenants through Flux CD means application teams can request storage capacity through a Git pull request, and the platform team reviews and approves it. Each Tenant's configuration — storage pool size, drive count, resource limits — is version-controlled and reproducible.

## Prerequisites

- MinIO Operator deployed via Flux CD (see previous post)
- Kubernetes v1.26+ with Flux CD bootstrapped
- `kubectl` and `flux` CLIs installed

## Step 1: Organize Tenant Directory Structure

```
infrastructure/
  storage/
    minio/
      operator/          # MinIO Operator HelmRelease
      tenants/
        production/      # Production tenant
          namespace.yaml
          tenant.yaml
          policies.yaml
          ingress.yaml
        staging/         # Staging tenant
          namespace.yaml
          tenant.yaml
```

## Step 2: Create the Tenant Namespace

```yaml
# infrastructure/storage/minio/tenants/production/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: minio-production
  labels:
    app.kubernetes.io/managed-by: flux
    team: platform
    environment: production
```

## Step 3: Create Tenant Credentials Secret

```yaml
# infrastructure/storage/minio/tenants/production/credentials.yaml (use SealedSecret)
apiVersion: v1
kind: Secret
metadata:
  name: minio-credentials
  namespace: minio-production
type: Opaque
stringData:
  config.env: |
    export MINIO_ROOT_USER=minio-admin
    export MINIO_ROOT_PASSWORD=SecureRootPassword123!
    # Enable Identity and Access Management
    export MINIO_IDENTITY_PLUGIN_URL=""
    # Enable audit logging
    export MINIO_AUDIT_WEBHOOK_ENABLE="on"
    export MINIO_AUDIT_WEBHOOK_ENDPOINT="http://audit-service.monitoring.svc.cluster.local/minio"
```

## Step 4: Deploy the Production Tenant

```yaml
# infrastructure/storage/minio/tenants/production/tenant.yaml
apiVersion: minio.min.io/v2
kind: Tenant
metadata:
  name: minio-production
  namespace: minio-production
  annotations:
    flux.weave.works/automated: "false"  # don't auto-update image
spec:
  image: minio/minio:RELEASE.2024-06-13T22-53-53Z
  imagePullPolicy: IfNotPresent

  configuration:
    name: minio-credentials

  # Production pool: 4 servers × 4 drives × 100 GiB = 1.6 TiB raw
  pools:
    - name: production-pool-0
      servers: 4
      volumesPerServer: 4
      volumeClaimTemplate:
        metadata:
          name: data
        spec:
          accessModes:
            - ReadWriteOnce
          resources:
            requests:
              storage: 100Gi
          storageClassName: premium-ssd
      resources:
        requests:
          cpu: "1"
          memory: "2Gi"
        limits:
          cpu: "4"
          memory: "8Gi"
      # Spread across availability zones
      topologySpreadConstraints:
        - maxSkew: 1
          topologyKey: topology.kubernetes.io/zone
          whenUnsatisfiable: DoNotSchedule
          labelSelector:
            matchLabels:
              v1.min.io/tenant: minio-production

  # Auto-generate TLS certificates
  requestAutoCert: true

  # Enable CSR-based certificate generation
  certConfig:
    commonName: "minio-production"
    organizationName: ["my-company"]
    dnsNames:
      - "minio.minio-production.svc.cluster.local"
      - "*.minio-production.svc.cluster.local"

  mountPath: /export

  subPath: /data

  serviceMetadata:
    minioServiceAnnotations:
      service.beta.kubernetes.io/aws-load-balancer-internal: "true"

  # Prometheus monitoring
  prometheusOperator: true

  # Logging
  logging:
    anonymous: false
    json: true
    quiet: false

  # Lifecycle management
  lifecycle:
    expiry:
      days: 0   # no default expiry; set per bucket
```

## Step 5: Configure MinIO Bucket Policies as ConfigMap

```yaml
# infrastructure/storage/minio/tenants/production/policies.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: minio-bucket-policies
  namespace: minio-production
data:
  # Allow application team to read/write their bucket
  app-team-policy.json: |
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Action": [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject",
            "s3:ListBucket"
          ],
          "Resource": [
            "arn:aws:s3:::app-team-bucket",
            "arn:aws:s3:::app-team-bucket/*"
          ]
        }
      ]
    }
```

## Step 6: Create Ingress for the Tenant

```yaml
# infrastructure/storage/minio/tenants/production/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minio-production-s3
  namespace: minio-production
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
    nginx.ingress.kubernetes.io/ssl-passthrough: "false"
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - s3.example.com
      secretName: minio-production-tls
  rules:
    - host: s3.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: minio-production-hl
                port:
                  number: 9000
---
# Console Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minio-production-console
  namespace: minio-production
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
spec:
  ingressClassName: nginx
  rules:
    - host: console.s3.example.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: minio-production-console
                port:
                  number: 9090
```

## Step 7: Initialize Tenant via Job

```yaml
# infrastructure/storage/minio/tenants/production/init-job.yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: minio-init
  namespace: minio-production
spec:
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: OnFailure
      containers:
        - name: mc-init
          image: minio/mc:latest
          command:
            - /bin/sh
            - -c
            - |
              until mc alias set prod \
                https://minio-production-hl.minio-production.svc.cluster.local:9000 \
                minio-admin SecureRootPassword123! \
                --insecure; do
                echo "Waiting for MinIO..."; sleep 10
              done

              # Create default buckets
              mc mb prod/application-data --insecure 2>/dev/null || true
              mc mb prod/backups --insecure 2>/dev/null || true
              mc mb prod/logs --insecure 2>/dev/null || true

              # Set versioning on backups bucket
              mc version enable prod/backups --insecure

              # Set lifecycle: delete logs older than 90 days
              mc ilm import prod/logs --insecure <<LIFECYCLE
              {"Rules":[{"ID":"delete-old-logs","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":90}}]}
              LIFECYCLE

              echo "MinIO initialization complete"
```

## Step 8: Flux Kustomization

```yaml
# clusters/production/minio-tenant-kustomization.yaml
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: minio-production-tenant
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: GitRepository
    name: flux-system
  path: ./infrastructure/storage/minio/tenants/production
  prune: true
  dependsOn:
    - name: minio-operator
```

## Best Practices

- Use separate namespaces for each Tenant to enforce network isolation and RBAC.
- Set resource `limits` on pool containers to prevent a single Tenant from consuming all node resources.
- Enable versioning on buckets containing important data to protect against accidental deletion.
- Configure ILM (lifecycle) rules to automatically expire old objects and control storage growth.
- Create per-application MinIO service accounts with least-privilege bucket policies rather than sharing root credentials.

## Conclusion

MinIO Tenants deployed via Flux CD provide isolated, S3-compatible object storage for multiple teams from a single MinIO Operator installation. Each Tenant's configuration is version-controlled in Git, making it easy for platform teams to review and approve storage requests. Initialization Jobs ensure buckets, versioning, and lifecycle policies are consistently configured on every deployment, giving application teams a ready-to-use object storage environment from day one.
