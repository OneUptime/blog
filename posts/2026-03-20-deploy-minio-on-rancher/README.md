# How to Deploy Minio on Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, MinIO, S3, Object Storage, Kubernetes, Helm

Description: Deploy MinIO distributed object storage on Rancher with multi-node erasure coding, TLS encryption, and S3-compatible API access.

## Introduction

MinIO is a high-performance, S3-compatible object storage system. Deploying it on Rancher provides on-premises S3-compatible storage for ML artifacts, application backups, log archives, and media files-without the cost and data sovereignty concerns of cloud storage.

## Step 1: Deploy MinIO with Helm

```bash
helm repo add minio https://charts.min.io/
helm repo update
```

```yaml
# minio-values.yaml

mode: distributed    # Enable distributed mode for HA

replicas: 4          # Minimum 4 for distributed mode
drivesPerNode: 2     # 2 drives per node (8 total drives)

# Erasure coding: with 8 drives, MinIO defaults to EC:4 (4 data, 4 parity)
# Can lose up to 4 drives and still function

persistence:
  enabled: true
  storageClass: longhorn
  size: 500Gi    # Per drive

resources:
  requests:
    memory: "2Gi"
    cpu: "500m"
  limits:
    memory: "8Gi"
    cpu: "4"

rootUser: minioadmin
rootPassword: "securepassword"

ingress:
  enabled: true
  ingressClassName: nginx
  hosts:
    - minio.example.com
  tls:
    - secretName: minio-tls
      hosts:
        - minio.example.com
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod

consoleIngress:
  enabled: true
  ingressClassName: nginx
  hosts:
    - minio-console.example.com
```

```bash
kubectl create namespace minio

helm install minio minio/minio \
  --namespace minio \
  --values minio-values.yaml
```

## Step 2: Verify Distributed Cluster

```bash
# Check all pods are running
kubectl get pods -n minio

# Check MinIO health
kubectl exec -it minio-0 -n minio -- \
  mc admin info local/

# View server, pool, and erasure set details
kubectl exec -it minio-0 -n minio -- \
  mc admin info --json local/
```

## Step 3: Create Buckets and Policies

```bash
# Port-forward or use the console at minio-console.example.com
mc alias set myminio https://minio.example.com minioadmin securepassword

# Create buckets
mc mb myminio/mlflow-artifacts
mc mb myminio/application-backups
mc mb myminio/log-archive

# Allow anonymous read-only (download) access on a bucket
mc anonymous set download myminio/mlflow-artifacts
```

## Step 4: Create Service Account for Applications

```bash
# Create access key for application use
mc admin user add myminio myapp myapppassword
mc admin policy attach myminio readwrite --user=myapp
```

## Step 5: Configure Lifecycle Policies

```bash
# Auto-delete objects older than 90 days in the log archive
mc ilm rule add \
  --expire-days 90 \
  myminio/log-archive
```

## Conclusion

MinIO on Rancher provides production-grade S3-compatible object storage with no cloud dependency. The distributed mode with erasure coding provides fault tolerance comparable to cloud storage, and the S3-compatible API means any application that supports S3 works with MinIO without code changes.
