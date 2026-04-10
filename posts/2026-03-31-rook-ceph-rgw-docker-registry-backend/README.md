# How to Use Ceph RGW as Docker Registry Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, Docker Registry, S3, Container Image

Description: Configure Ceph RGW as the S3-compatible storage backend for a Docker Registry (Harbor or distribution) to store container images in Ceph object storage.

---

Running a Docker registry backed by Ceph RGW combines the scalability of object storage with local control over container images. The Docker distribution registry natively supports S3-compatible backends, making Ceph RGW a natural fit.

## Set Up an RGW User for the Registry

Create a dedicated S3 user for the registry:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=registry \
  --display-name="Docker Registry" \
  --access-key=REGISTRY_ACCESS_KEY \
  --secret-key=REGISTRY_SECRET_KEY

# Create a bucket for registry data via S3 API
aws s3 mb s3://docker-registry \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc:80
```

## Configure the Docker Distribution Registry

Create a `config.yml` for the registry pointing to Ceph RGW:

```yaml
version: 0.1
log:
  level: info
storage:
  s3:
    accesskey: REGISTRY_ACCESS_KEY
    secretkey: REGISTRY_SECRET_KEY
    regionendpoint: http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80
    bucket: docker-registry
    region: us-east-1
    secure: false
    v4auth: true
    chunksize: 5242880
    rootdirectory: /registry
  delete:
    enabled: true
  cache:
    blobdescriptor: inmemory
http:
  addr: :5000
  debug:
    addr: :5001
    prometheus:
      enabled: true
      path: /metrics
```

## Deploy the Registry in Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: docker-registry
  namespace: registry
spec:
  replicas: 2
  selector:
    matchLabels:
      app: docker-registry
  template:
    metadata:
      labels:
        app: docker-registry
    spec:
      containers:
      - name: registry
        image: registry:2
        ports:
        - containerPort: 5000
        volumeMounts:
        - name: config
          mountPath: /etc/docker/registry
      volumes:
      - name: config
        configMap:
          name: registry-config
---
apiVersion: v1
kind: Service
metadata:
  name: docker-registry
  namespace: registry
spec:
  selector:
    app: docker-registry
  ports:
  - port: 5000
    targetPort: 5000
  type: ClusterIP
```

## Push and Pull Images

Configure Docker to use the registry:

```bash
# Add to /etc/docker/daemon.json for insecure registry
{
  "insecure-registries": ["registry.example.com:5000"]
}

# Tag and push
docker tag myapp:latest registry.example.com:5000/myapp:latest
docker push registry.example.com:5000/myapp:latest

# Pull
docker pull registry.example.com:5000/myapp:latest
```

## Verify Images in Ceph

Check that image layers are stored in RGW:

```bash
AWS_ACCESS_KEY_ID=REGISTRY_ACCESS_KEY \
AWS_SECRET_ACCESS_KEY=REGISTRY_SECRET_KEY \
aws s3 ls s3://docker-registry/registry/ \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph:80 \
  --recursive | head -20
```

## Use Harbor with Ceph Backend

For a full registry UI, deploy Harbor with Ceph as the S3 backend:

```yaml
# In harbor.yml
storage_service:
  s3:
    accesskey: REGISTRY_ACCESS_KEY
    secretkey: REGISTRY_SECRET_KEY
    regionendpoint: http://rook-ceph-rgw-my-store.rook-ceph:80
    bucket: harbor-registry
    region: us-east-1
    secure: false
```

## Summary

Ceph RGW serves as a drop-in S3 backend for the Docker distribution registry and Harbor. Create a dedicated RGW user and bucket for the registry, configure the registry's S3 storage driver to point to the RGW endpoint, and deploy the registry as a standard Kubernetes workload. Multiple registry replicas can share the same Ceph backend, providing horizontal scalability for image serving.
