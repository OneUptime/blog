# How to Set Up External Access to Rook-Ceph RGW

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, RGW, S3, External Access, Kubernetes, Object Storage

Description: Configure external access to the Rook-Ceph RADOS Gateway (RGW) for S3-compatible object storage access from outside the Kubernetes cluster.

---

## Overview

The Rook-Ceph RADOS Gateway (RGW) provides an S3-compatible API for object storage. By default it is only accessible within the cluster. This guide covers configuring external access via LoadBalancer, NodePort, or Ingress.

## Option 1: LoadBalancer Service (Recommended)

The simplest approach for cloud or MetalLB environments:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: my-store
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
    securePort: 443
    instances: 2
    service:
      type: LoadBalancer
```

Get the external IP:

```bash
kubectl -n rook-ceph get svc rook-ceph-rgw-my-store
```

Test S3 access:

```bash
aws s3 ls --endpoint-url http://<external-ip> --no-verify-ssl
```

## Option 2: NodePort Service

For environments without LoadBalancer support:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: rgw-nodeport
  namespace: rook-ceph
spec:
  type: NodePort
  selector:
    app: rook-ceph-rgw
    rook_object_store: my-store
  ports:
  - port: 80
    targetPort: 8080
    nodePort: 30080
```

Access via any node IP:

```bash
aws s3 ls --endpoint-url http://<node-ip>:30080
```

## Option 3: Ingress with TLS

For HTTPS access with custom domain:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: ceph-rgw
  namespace: rook-ceph
  annotations:
    nginx.ingress.kubernetes.io/proxy-body-size: "0"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "600"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "600"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - s3.example.com
    secretName: rgw-tls
  rules:
  - host: s3.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: rook-ceph-rgw-my-store
            port:
              number: 80
```

## Creating S3 Users for External Access

Create an S3 user:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
  --uid=external-user \
  --display-name="External User" \
  --access-key=myaccesskey \
  --secret-key=mysecretkey
```

## Configure AWS CLI for RGW

```bash
aws configure set aws_access_key_id myaccesskey
aws configure set aws_secret_access_key mysecretkey
aws configure set default.region us-east-1

# Create a bucket
aws s3 mb s3://my-bucket --endpoint-url http://s3.example.com

# Upload a file
aws s3 cp myfile.txt s3://my-bucket/ --endpoint-url http://s3.example.com
```

## Verify RGW Health

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph status | grep rgw

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin bucket list
```

## Summary

External access to Rook-Ceph RGW is best achieved via LoadBalancer for cloud and MetalLB environments, NodePort for bare-metal without LB support, or Ingress for HTTPS with custom domains. Always configure appropriate proxy timeouts in Ingress for large object uploads and create dedicated S3 users with minimal permissions for external clients.
