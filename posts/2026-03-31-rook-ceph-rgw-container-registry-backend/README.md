# How to Use Ceph RGW as Container Registry Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Docker Registry, Container, S3, Storage, Kubernetes

Description: Configure Docker Distribution Registry (v2) to use Ceph RGW as its S3-compatible storage backend for hosting container images on on-premises Kubernetes clusters.

---

## Overview

Docker Distribution Registry (the engine behind Docker Hub and private registries) supports pluggable storage backends including S3. By configuring it to use Ceph RGW, you get a fully on-premises container registry backed by scalable, durable object storage.

## Prepare Ceph RGW Bucket

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=registry \
  --display-name="Container Registry" \
  --access-key=registryakey \
  --secret-key=registryskey

aws s3 mb s3://container-registry \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80
```

## Deploy Docker Registry with Ceph Backend

Create a registry config secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-config
  namespace: registry
stringData:
  config.yml: |
    version: 0.1
    storage:
      s3:
        accesskey: registryakey
        secretkey: registryskey
        regionendpoint: http://rook-ceph-rgw-my-store.rook-ceph:80
        bucket: container-registry
        region: us-east-1
        secure: false
        v4auth: true
        forcepathstyle: true
    http:
      addr: :5000
      secret: a-random-secret-string
    health:
      storagedriver:
        enabled: true
        interval: 10s
        threshold: 3
```

Deploy the registry:

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
          image: registry:2.8
          ports:
            - containerPort: 5000
          volumeMounts:
            - name: config
              mountPath: /etc/docker/registry
      volumes:
        - name: config
          secret:
            secretName: registry-config
---
apiVersion: v1
kind: Service
metadata:
  name: registry
  namespace: registry
spec:
  selector:
    app: registry
  ports:
    - port: 5000
      targetPort: 5000
```

## Push and Pull Images

Configure Docker to trust the registry:

```bash
# Add to /etc/docker/daemon.json
{
  "insecure-registries": ["registry.registry.svc:5000"]
}
```

Push an image:

```bash
docker tag nginx:latest registry.registry.svc:5000/nginx:latest
docker push registry.registry.svc:5000/nginx:latest
```

Pull from the registry:

```bash
docker pull registry.registry.svc:5000/nginx:latest
```

## Verify Images in Ceph

```bash
aws s3 ls s3://container-registry/docker/registry/v2/repositories/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --recursive | head -20
```

## Summary

Docker Distribution Registry with Ceph RGW as its S3 backend provides a fully on-premises container registry with no single-point-of-failure disk storage. Multiple registry replicas can share the same Ceph bucket, and Rook manages the Ceph cluster lifecycle declaratively.
