# How to Use Rook-Ceph for Container Image Registry Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Container Registry, S3, Storage, Kubernetes

Description: Learn how to use Rook-Ceph object storage as the backend for a container image registry, enabling scalable, highly available image storage on Kubernetes.

---

Running a container image registry on Kubernetes requires scalable, reliable object storage. Rook-Ceph's RADOS Gateway (RGW) provides an S3-compatible interface that integrates with popular registry implementations like Harbor and the Docker Distribution registry.

## Why Use Ceph for Container Registries

- Avoids single-node filesystem bottlenecks
- Supports concurrent reads from multiple registry replicas
- Integrates with S3-compatible storage drivers
- Data is replicated across OSDs for high availability

## Setting Up RGW for Registry Storage

Create a dedicated object store and StorageClass:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: registry-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  preservePoolsOnDelete: true
  gateway:
    port: 80
    instances: 2
    resources:
      requests:
        cpu: 500m
        memory: 512Mi
```

Create an S3 user and bucket for the registry:

```bash
# Create a registry user
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
    --uid=registry \
    --display-name="Container Registry" \
    --access-key=registry-access-key \
    --secret-key=registry-secret-key

# Create the registry bucket
aws s3 mb s3://registry-images \
  --endpoint-url http://rook-ceph-rgw-registry-store.rook-ceph.svc.cluster.local:80
```

## Deploying Harbor with Ceph RGW Backend

Harbor is the most popular enterprise registry. Configure it to use Ceph:

```yaml
# harbor values.yaml for Helm
persistence:
  enabled: true
  imageChartStorage:
    type: s3
    s3:
      region: us-east-1
      bucket: registry-images
      accesskey: registry-access-key
      secretkey: registry-secret-key
      regionendpoint: http://rook-ceph-rgw-registry-store.rook-ceph.svc.cluster.local
      encrypt: false
      secure: false
      v4auth: true
      chunksize: "5242880"
      rootdirectory: /
  persistentVolumeClaim:
    database:
      storageClass: rook-ceph-block
      size: 10Gi
    redis:
      storageClass: rook-ceph-block
      size: 1Gi
    jobservice:
      storageClass: rook-ceph-block
      size: 1Gi
```

## Deploying Docker Distribution with Ceph

Use the standard Docker Distribution registry with S3 backend:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: registry
  namespace: registry
spec:
  replicas: 2
  selector:
    matchLabels:
      app: registry
  template:
    metadata:
      labels:
        app: registry
    spec:
      containers:
        - name: registry
          image: registry:2
          env:
            - name: REGISTRY_STORAGE
              value: s3
            - name: REGISTRY_STORAGE_S3_REGION
              value: us-east-1
            - name: REGISTRY_STORAGE_S3_BUCKET
              value: registry-images
            - name: REGISTRY_STORAGE_S3_REGIONENDPOINT
              value: http://rook-ceph-rgw-registry-store.rook-ceph.svc.cluster.local
            - name: REGISTRY_STORAGE_S3_ACCESSKEY
              valueFrom:
                secretKeyRef:
                  name: registry-s3-creds
                  key: accessKey
            - name: REGISTRY_STORAGE_S3_SECRETKEY
              valueFrom:
                secretKeyRef:
                  name: registry-s3-creds
                  key: secretKey
            - name: REGISTRY_STORAGE_S3_V4AUTH
              value: "true"
```

## Enabling Object Versioning for Image Safety

Enable bucket versioning to prevent accidental layer deletion:

```bash
aws s3api put-bucket-versioning \
  --bucket registry-images \
  --versioning-configuration Status=Enabled \
  --endpoint-url http://rook-ceph-rgw-registry-store.rook-ceph.svc.cluster.local
```

## Summary

Rook-Ceph RGW provides a scalable S3-compatible backend for container image registries. Both Harbor and the Docker Distribution registry support S3 storage drivers that connect seamlessly to Ceph RGW. Using a dedicated object store with dedicated users, quotas, and bucket versioning provides the reliability and isolation required for a production registry serving a Kubernetes cluster.
