# How to Set Up Ceph for Harbor Container Registry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Harbor, Container Registry, Kubernetes, S3, Storage

Description: Configure Harbor container registry to use Ceph RGW as its S3-compatible object storage backend for image blobs and chart storage on Kubernetes.

---

## Overview

Harbor is a cloud-native container registry with security scanning, RBAC, and replication. It supports pluggable storage backends including S3-compatible stores. Using Ceph RGW as Harbor's blob storage backend provides on-premises, scalable image storage without cloud dependency.

## Prepare Ceph RGW for Harbor

Create dedicated user and buckets:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=harbor \
  --display-name="Harbor Registry" \
  --access-key=harborakey \
  --secret-key=harborskey

export AWS_ACCESS_KEY_ID=harborakey
export AWS_SECRET_ACCESS_KEY=harborskey

aws s3 mb s3://harbor-registry \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
```

## Install Harbor with Helm

Add the Harbor Helm repository and configure values:

```bash
helm repo add harbor https://helm.goharbor.io
helm repo update
```

Create `harbor-values.yaml`:

```yaml
expose:
  type: ingress
  ingress:
    hosts:
      core: harbor.example.com

externalURL: https://harbor.example.com

persistence:
  enabled: true
  imageChartStorage:
    type: s3
    s3:
      bucket: harbor-registry
      region: us-east-1
      regionendpoint: http://rook-ceph-rgw-my-store.rook-ceph:80
      accesskey: harborakey
      secretkey: harborskey
      secure: false
      v4auth: true
  # Use Ceph RBD for Harbor's database, Redis, and Trivy PVCs
  persistentVolumeClaim:
    database:
      storageClass: ceph-rbd
    redis:
      storageClass: ceph-rbd
    trivy:
      storageClass: ceph-rbd

database:
  type: internal

redis:
  type: internal
```

Install Harbor:

```bash
helm install harbor harbor/harbor \
  --namespace harbor \
  --create-namespace \
  -f harbor-values.yaml
```

## Verify Harbor is Using Ceph Storage

Check Harbor pods are running:

```bash
kubectl -n harbor get pods
```

Verify image storage in Ceph:

```bash
aws s3 ls s3://harbor-registry/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --recursive | head -10
```

## Push an Image to Harbor

```bash
docker login harbor.example.com -u admin -p Harbor12345

docker tag nginx:latest harbor.example.com/library/nginx:latest
docker push harbor.example.com/library/nginx:latest

docker pull harbor.example.com/library/nginx:latest
```

## Configure Replication to Another Harbor or Registry

```bash
curl -u admin:Harbor12345 \
  -X POST https://harbor.example.com/api/v2.0/replication/policies \
  -H "Content-Type: application/json" \
  -d '{
    "name": "replicate-to-backup",
    "src_registry": {"id": 0},
    "dest_registry": {"id": 1},
    "dest_namespace": "backup",
    "trigger": {"type": "event_based"},
    "enabled": true
  }'
```

## Summary

Harbor with Ceph RGW provides a complete on-premises container registry solution where image blobs are stored in Ceph object storage and registry metadata uses Ceph RBD-backed PostgreSQL. Rook manages the full Ceph lifecycle, giving you a secure, scalable registry without any cloud storage dependency.
