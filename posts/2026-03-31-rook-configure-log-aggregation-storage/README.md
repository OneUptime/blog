# How to Configure Rook-Ceph for Log Aggregation Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Logging, Storage, Kubernetes, Observability

Description: Learn how to configure Rook-Ceph as the persistent storage backend for log aggregation systems like Loki, Elasticsearch, and OpenSearch on Kubernetes.

---

Log aggregation systems on Kubernetes need durable, scalable storage to retain logs for compliance, debugging, and analytics. Rook-Ceph provides both block storage for single-node log stores and object storage for multi-tier retention architectures.

## Choosing the Right Ceph Storage Type

Different log systems have different storage requirements:
- **Elasticsearch/OpenSearch** - Uses RBD block storage (ReadWriteOnce per shard)
- **Loki** - Object storage (S3-compatible via RGW) or CephFS for the ruler
- **Fluentd/Fluentbit** - Typically writes to an S3 backend (RGW)
- **ClickHouse** - Block storage (ReadWriteOnce)

## Setting Up Loki with Rook Object Storage

Create a dedicated bucket and user for Loki:

```bash
# Create object store user for Loki
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin user create \
    --uid=loki \
    --display-name="Loki Log Storage" \
    --access-key=loki-access-key \
    --secret-key=loki-secret-key

# Create the log storage bucket
aws s3 mb s3://loki-chunks \
  --endpoint-url http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local:80
```

Configure Loki to use RGW as the backend:

```yaml
loki:
  storage:
    type: s3
    s3:
      endpoint: http://rook-ceph-rgw-my-store.rook-ceph.svc.cluster.local
      bucketnames: loki-chunks
      access_key_id: loki-access-key
      secret_access_key: loki-secret-key
      region: us-east-1
      s3forcepathstyle: true
  storage_config:
    boltdb_shipper:
      shared_store: s3
```

## Setting Up Elasticsearch with Rook RBD

Create a StorageClass for Elasticsearch data nodes:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-logs
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: log-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/controller-expand-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/controller-expand-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

Use it in ECK (Elastic Cloud on Kubernetes):

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: logs
  namespace: logging
spec:
  version: 8.12.0
  nodeSets:
    - name: data
      count: 3
      config:
        node.roles: ["data", "ingest"]
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 500Gi
            storageClassName: rook-ceph-logs
```

## Configuring a Dedicated Log Pool

Create a pool optimized for sequential write patterns common in logging:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create log-pool 64 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set log-pool compression_mode aggressive

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set log-pool compression_algorithm snappy
```

## Setting Retention and Quotas

Prevent log storage from consuming unlimited space:

```bash
# Set pool quota
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set-quota log-pool max_bytes 10995116277760

# Set per-user quota for RGW
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin quota set --uid=loki --quota-scope=user \
    --max-size=5T

# Enable the quota
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  radosgw-admin quota enable --uid=loki --quota-scope=user
```

## Summary

Rook-Ceph supports log aggregation workloads through both RBD block storage for single-node log systems like Elasticsearch and object storage (RGW) for distributed log systems like Loki. Dedicated log pools with compression enabled reduce storage consumption for high-volume log streams. Quotas at the pool and RGW user level prevent runaway log growth from impacting cluster stability.
