# How to Set Up Ceph Object Storage for Cortex on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Cortex, Kubernetes, Storage, Prometheus, Multi-Tenant

Description: Configure Cortex to use Ceph RGW as its S3-compatible object store on Kubernetes for multi-tenant, long-term Prometheus metrics retention on-premises.

---

## Overview

Cortex is a multi-tenant, horizontally scalable Prometheus-compatible backend. It stores TSDB blocks in object storage. Ceph RGW's S3 interface means you can run Cortex entirely on-premises with the same configuration you would use for AWS S3.

## Set Up Ceph Object Store

Create the CephObjectStore and user:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: cortex-store
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

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=cortex \
  --display-name="Cortex" \
  --access-key=cortexaccesskey \
  --secret-key=cortexsecretkey

for bucket in cortex-blocks cortex-ruler cortex-alertmanager; do
  aws s3 mb s3://$bucket \
    --endpoint-url http://rook-ceph-rgw-cortex-store.rook-ceph:80
done
```

## Configure Cortex

Create a Cortex config ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cortex-config
  namespace: cortex
data:
  cortex.yaml: |
    auth_enabled: true
    blocks_storage:
      backend: s3
      s3:
        bucket_name: cortex-blocks
        endpoint: rook-ceph-rgw-cortex-store.rook-ceph:80
        region: us-east-1
        access_key_id: cortexaccesskey
        secret_access_key: cortexsecretkey
        insecure: true
    ruler_storage:
      backend: s3
      s3:
        bucket_name: cortex-ruler
        endpoint: rook-ceph-rgw-cortex-store.rook-ceph:80
        region: us-east-1
        access_key_id: cortexaccesskey
        secret_access_key: cortexsecretkey
        insecure: true
    alertmanager_storage:
      backend: s3
      s3:
        bucket_name: cortex-alertmanager
        endpoint: rook-ceph-rgw-cortex-store.rook-ceph:80
        region: us-east-1
        access_key_id: cortexaccesskey
        secret_access_key: cortexsecretkey
        insecure: true
    compactor:
      data_dir: /data/compactor
      sharding_enabled: true
```

## Deploy Cortex with Helm

```bash
helm repo add cortex-helm https://cortexproject.github.io/cortex-helm-chart
helm install cortex cortex-helm/cortex \
  --namespace cortex \
  --create-namespace
```

## Verify Multi-Tenant Ingestion

Send metrics from Prometheus using a tenant header:

```yaml
remoteWrite:
  - url: http://cortex-nginx.cortex.svc/api/v1/push
    headers:
      X-Scope-OrgID: "tenant-1"
```

Confirm blocks appear in Ceph:

```bash
aws s3 ls s3://cortex-blocks/tenant-1/ \
  --endpoint-url http://rook-ceph-rgw-cortex-store.rook-ceph:80
```

## Summary

Cortex's S3 storage model maps directly to Ceph RGW, making it straightforward to run a fully on-premises multi-tenant metrics platform. Rook simplifies Ceph cluster management, and the combination provides the same API-level compatibility you would expect from cloud object storage.
