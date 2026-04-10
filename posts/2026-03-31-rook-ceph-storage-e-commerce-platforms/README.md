# How to Configure Ceph Storage for E-Commerce Platforms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, E-Commerce, Object Storage, Product Image, Catalog, S3, Storage

Description: Configure Rook/Ceph storage to power e-commerce platform needs including product image storage, order database persistence, session storage, and CDN origin backends.

---

## E-Commerce Storage Requirements

E-commerce platforms need storage for several distinct use cases:
- **Product catalog images**: High-read, S3-compatible image storage
- **Order databases**: Low-latency, durable PostgreSQL/MySQL persistence
- **User session data**: Fast key-value store persistence
- **Transaction logs**: Immutable, append-only records
- **Search indexes**: Fast SSD-backed storage for Elasticsearch

## Product Image Storage with RGW

Product images are served at high volume and need S3-compatible storage for CDN integration:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephObjectStore
metadata:
  name: product-media
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
  dataPool:
    replicated:
      size: 3
    parameters:
      compression_mode: passive  # Compress compressible images
  gateway:
    instances: 4
    securePort: 443
    sslCertificateRef: ecommerce-tls-cert
```

## Configuring Public Read Access for Product Images

Make the product-images bucket publicly readable:

```bash
# Apply a public read bucket policy
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  aws --endpoint-url http://rook-ceph-rgw-product-media:80 \
  s3api put-bucket-policy \
  --bucket product-images \
  --policy '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::product-images/*"
    }]
  }'
```

## Database Storage for Orders

Use NVMe-backed RBD for the order management database:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: orders-db-data
  namespace: ecommerce
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: rook-ceph-block
  resources:
    requests:
      storage: 500Gi
```

## Session Storage Backend

Configure Redis persistence with Ceph for durable sessions:

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: redis-sessions
  namespace: ecommerce
spec:
  serviceName: redis
  replicas: 3
  volumeClaimTemplates:
    - metadata:
        name: redis-data
      spec:
        accessModes: ["ReadWriteOnce"]
        storageClassName: rook-ceph-block
        resources:
          requests:
            storage: 50Gi
```

## Handling Peak Traffic (Black Friday / Cyber Monday)

Use horizontal scaling of RGW during peak events:

```bash
# Scale RGW instances before peak traffic
kubectl patch cephobjectstore product-media -n rook-ceph \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/gateway/instances", "value": 8}]'

# Monitor throughput during the event
kubectl exec -n rook-ceph deploy/rook-ceph-tools -- \
  ceph status | grep -A5 "io:"
```

## Uploading Product Images via SDK

```python
import boto3

s3 = boto3.client(
    's3',
    endpoint_url='https://media.myecommerce.com',  # Point to RGW via load balancer
    aws_access_key_id='CATALOG_UPLOAD_KEY',
    aws_secret_access_key='CATALOG_UPLOAD_SECRET'
)

# Upload product image with metadata
s3.upload_file(
    'product-001-hero.webp',
    'product-images',
    'products/001/hero.webp',
    ExtraArgs={
        'ContentType': 'image/webp',
        'CacheControl': 'max-age=86400',
        'Metadata': {
            'product-id': '001',
            'variant': 'hero'
        }
    }
)
```

## Monitoring E-Commerce Storage Health

Track RGW metrics during peak events:

```promql
# RGW request rate during sales events
rate(ceph_rgw_req{namespace="rook-ceph"}[1m])

# Error rate - alert if > 0.1%
rate(ceph_rgw_failed_req[1m]) / rate(ceph_rgw_req[1m]) * 100 > 0.1
```

## Summary

Ceph on Rook provides a unified storage platform for e-commerce applications: RGW S3 for product image hosting with public bucket policies and CDN integration, and RBD block storage for order databases and session caches. During high-traffic events, scaling up RGW instances and monitoring request rates ensures storage keeps pace with demand.
