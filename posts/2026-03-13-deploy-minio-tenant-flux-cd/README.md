# How to Deploy MinIO Tenant with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Kubernetes, GitOps, MinIO, Tenant, Object Storage, S3, Multi-Tenancy

Description: Deploy a MinIO Tenant for object storage on Kubernetes using Flux CD GitOps for fully declarative S3-compatible storage provisioning.

---

## Introduction

A MinIO Tenant is a dedicated, isolated MinIO object storage cluster managed by the MinIO Operator. Each Tenant has its own credentials, storage pools, and network exposure - enabling multiple application teams to share a single MinIO Operator while having isolated storage environments. This multi-tenancy model is ideal for platform teams that need to provision S3-compatible storage for multiple teams from a single control plane.

Managing MinIO Tenants through Flux CD means application teams can request storage capacity through a Git pull request, and the platform team reviews and approves it. Each Tenant's configuration - storage pool size, drive count, resource limits - is version-controlled and reproducible.

## Prerequisites

- MinIO Operator deployed via Flux CD (see previous post)
- Kubernetes v1.30+ with Flux CD bootstrapped
- `kubectl` and `flux` CLIs installed

## Step 1: Organize Tenant Directory Structure

```plaintext
infrastructure/
  storage/
    minio/
      operator/          # MinIO Operator HelmRelease
      tenants/
        production/      # Production tenant
          namespace.yaml
          credentials.yaml
          tenant.yaml
          policies.yaml
          ingress.yaml
          init-job.yaml
        staging/         # Staging tenant
          namespace.yaml
          credentials.yaml
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
spec:
  image: minio/minio:RELEASE.2024-06-13T22-53-53Z
  imagePullPolicy: IfNotPresent

  configuration:
    name: minio-credentials

  features:
    domains:
      minio:
        - "https://s3.example.com"
      console: "https://console.s3.example.com"

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

  # Prometheus monitoring
  prometheusOperator: true

  # Logging
  logging:
    anonymous: false
    json: true
    quiet: false
```

## Step 5: Store MinIO Bucket Policies as ConfigMap

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
            "s3:ListBucket"
          ],
          "Resource": [
            "arn:aws:s3:::app-team-bucket"
          ]
        },
        {
          "Effect": "Allow",
          "Action": [
            "s3:GetObject",
            "s3:PutObject",
            "s3:DeleteObject"
          ],
          "Resource": [
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
                name: minio
                port:
                  number: 443
---
# Console Ingress
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: minio-production-console
  namespace: minio-production
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/backend-protocol: HTTPS
spec:
  ingressClassName: nginx
  tls:
    - hosts:
        - console.s3.example.com
      secretName: minio-production-console-tls
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
                  number: 9443
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
          volumeMounts:
            - name: bucket-policies
              mountPath: /policies
          command:
            - /bin/sh
            - -c
            - |
              until mc --insecure alias set prod \
                https://minio.minio-production.svc.cluster.local:443 \
                minio-admin SecureRootPassword123!; do
                echo "Waiting for MinIO..."; sleep 10
              done

              # Create default buckets
              mc --insecure mb --ignore-existing prod/application-data
              mc --insecure mb --ignore-existing prod/backups
              mc --insecure mb --ignore-existing prod/logs

              # Set versioning on backups bucket
              mc --insecure version enable prod/backups

              # Create IAM policy from ConfigMap
              mc --insecure admin policy create prod app-team-policy /policies/app-team-policy.json

              # Set lifecycle: delete logs older than 90 days
              mc --insecure ilm rule import prod/logs <<LIFECYCLE
              {"Rules":[{"ID":"delete-old-logs","Status":"Enabled","Filter":{"Prefix":""},"Expiration":{"Days":90}}]}
              LIFECYCLE

              echo "MinIO initialization complete"
      volumes:
        - name: bucket-policies
          configMap:
            name: minio-bucket-policies
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
