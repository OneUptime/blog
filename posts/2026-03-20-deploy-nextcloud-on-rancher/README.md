# How to Deploy Nextcloud on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Nextcloud, File Sharing, Kubernetes, Helm, Collaboration

Description: Deploy Nextcloud on Rancher for self-hosted file sharing and collaboration with PostgreSQL backend, persistent storage, and Ingress configuration.

## Introduction

Nextcloud is an open-source file sharing and collaboration platform-a self-hosted alternative to Dropbox, Google Drive, and Microsoft 365. Deploying it on Rancher gives organizations full control over their data with enterprise features.

## Step 1: Deploy Nextcloud with Helm

```bash
helm repo add nextcloud https://nextcloud.github.io/helm/
helm repo update
```

```yaml
# nextcloud-values.yaml

nextcloud:
  host: nextcloud.example.com
  username: admin
  password: "securepassword"
  extraEnv:
    - name: NEXTCLOUD_TRUSTED_DOMAINS
      value: "nextcloud.example.com"

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/proxy-body-size: "10g"    # Allow large file uploads
  tls:
    - secretName: nextcloud-tls
      hosts:
        - nextcloud.example.com

persistence:
  enabled: true
  storageClass: longhorn
  size: 500Gi    # Persistent volume for Nextcloud

internalDatabase:
  enabled: false

externalDatabase:
  enabled: true
  type: postgresql
  host: nextcloud-postgresql:5432    # If the Helm release name is nextcloud
  database: nextcloud
  user: nextcloud
  password: "dbpassword"

postgresql:
  enabled: true
  global:
    postgresql:
      auth:
        database: nextcloud
        username: nextcloud
        password: "dbpassword"
  primary:
    persistence:
      enabled: true
      storageClass: longhorn
      size: 20Gi

resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "2"
```

```bash
kubectl create namespace nextcloud
helm install nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --values nextcloud-values.yaml
```

## Step 2: Configure S3-Compatible Object Storage as Primary Storage

For large deployments, configure S3-compatible object storage as Nextcloud's primary storage before users upload data:

```yaml
# Add under the existing nextcloud: block in nextcloud-values.yaml
objectStore:
  s3:
    enabled: true
    bucket: nextcloud-data
    region: us-east-1
    accessKey: ACCESS_KEY
    secretKey: SECRET_KEY
    # host: s3.amazonaws.com   # Only required for non-AWS S3 endpoints
    # port: "443"
    # ssl: true
```

```bash
helm upgrade nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --values nextcloud-values.yaml
```

## Step 3: Configure Background Jobs

```yaml
# Add to nextcloud-values.yaml
cronjob:
  enabled: true
  type: sidecar
```

```bash
helm upgrade nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --values nextcloud-values.yaml
```

## Step 4: Enable Redis for Caching and File Locking

```yaml
# Add to nextcloud-values.yaml
redis:
  enabled: true
  auth:
    password: "redispassword"
```

```bash
helm upgrade nextcloud nextcloud/nextcloud \
  --namespace nextcloud \
  --values nextcloud-values.yaml
```

## Conclusion

Nextcloud on Rancher provides a self-hosted collaboration platform with full data sovereignty. The combination of S3-compatible primary object storage and Redis for caching and locking helps support larger deployments while maintaining data consistency.
