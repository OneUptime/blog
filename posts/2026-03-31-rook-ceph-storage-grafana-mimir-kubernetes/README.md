# How to Set Up Ceph Storage for Grafana Mimir on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Grafana, Mimir, Kubernetes, Storage, Metric

Description: Use Ceph RGW as the S3-compatible object store backend for Grafana Mimir on Kubernetes to enable scalable, long-term metrics storage on-premises.

---

## Overview

Grafana Mimir is a horizontally scalable, multi-tenant time-series database. It uses object storage for blocks and an optional index cache. Ceph RGW provides an S3-compatible endpoint that Mimir can use without any proprietary cloud dependency.

## Prepare Ceph Object Store

Create a CephObjectStore in Rook:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: mimir-store
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
  gateway:
    port: 80
    instances: 2
```

Create user credentials and buckets:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=mimir \
  --display-name="Mimir User" \
  --access-key=mimiraccesskey \
  --secret-key=mimirsecretkey

# Create required Mimir buckets
export AWS_ACCESS_KEY_ID=mimiraccesskey
export AWS_SECRET_ACCESS_KEY=mimirsecretkey
for bucket in mimir-blocks mimir-ruler mimir-alertmanager; do
  aws s3 mb s3://$bucket \
    --endpoint-url http://rook-ceph-rgw-mimir-store.rook-ceph:80
done
```

## Configure Mimir Helm Values

Create `mimir-values.yaml`:

```yaml
mimir:
  structuredConfig:
    common:
      storage:
        backend: s3
        s3:
          endpoint: rook-ceph-rgw-mimir-store.rook-ceph:80
          region: us-east-1
          access_key_id: mimiraccesskey
          secret_access_key: mimirsecretkey
          insecure: true
    blocks_storage:
      s3:
        bucket_name: mimir-blocks
    ruler_storage:
      s3:
        bucket_name: mimir-ruler
    alertmanager_storage:
      s3:
        bucket_name: mimir-alertmanager
```

Install with Helm:

```bash
helm repo add grafana https://grafana.github.io/helm-charts
helm install mimir grafana/mimir-distributed \
  --namespace mimir \
  --create-namespace \
  -f mimir-values.yaml
```

## Verify Connectivity

Check Mimir ingester and compactor pods:

```bash
kubectl -n mimir get pods
kubectl -n mimir logs deploy/mimir-ingester | grep -i "object storage"
```

Push a test metric via remote-write from Prometheus:

```yaml
remoteWrite:
  - url: http://mimir-nginx.mimir.svc:80/api/v1/push
    headers:
      X-Scope-OrgID: "demo"
```

## Scaling Storage

As metrics volume grows, increase Ceph data pool replicas or add OSDs:

```bash
ceph osd pool set mimir-store.rgw.buckets.data size 4
```

Monitor bucket utilization:

```bash
radosgw-admin bucket stats --bucket=mimir-blocks
```

## Summary

Grafana Mimir's S3-native design pairs seamlessly with Ceph RGW for on-premises long-term metrics storage. Rook manages the Ceph lifecycle declaratively, and Mimir's horizontal scaling means you can grow capacity by expanding the Ceph cluster without downtime.
