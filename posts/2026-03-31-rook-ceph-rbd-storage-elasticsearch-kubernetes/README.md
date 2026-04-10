# How to Set Up Ceph RBD Storage for Elasticsearch on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Elasticsearch, RBD, Kubernetes, Search

Description: Learn how to provision Ceph RBD block storage for Elasticsearch on Kubernetes using ECK, including shard allocation, JVM heap sizing, and index lifecycle management.

---

Elasticsearch running on Kubernetes needs per-node block storage for index shards and translog. Rook-Ceph RBD provides the ReadWriteOnce volumes that Elasticsearch requires, with each node managing its own data independently.

## Why RBD for Elasticsearch

Elasticsearch uses a local storage model where each node owns its shards. RBD's ReadWriteOnce semantics match this model perfectly - each Elasticsearch pod gets its own dedicated block device with no sharing.

## Creating the Block Pool and StorageClass

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool create elasticsearch-pool 64 64

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  rbd pool init elasticsearch-pool
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: rook-ceph-elasticsearch
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: elasticsearch-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
volumeBindingMode: WaitForFirstConsumer
```

## Deploying Elasticsearch with ECK

Use the Elastic Cloud on Kubernetes (ECK) operator:

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: elasticsearch
  namespace: logging
spec:
  version: 8.12.0
  nodeSets:
    - name: master
      count: 3
      config:
        node.roles: ["master"]
        xpack.security.enabled: true
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 10Gi
            storageClassName: rook-ceph-elasticsearch
    - name: data
      count: 3
      config:
        node.roles: ["data", "ingest"]
        xpack.security.enabled: true
      podTemplate:
        spec:
          containers:
            - name: elasticsearch
              resources:
                requests:
                  memory: 4Gi
                limits:
                  memory: 8Gi
              env:
                - name: ES_JAVA_OPTS
                  value: "-Xms4g -Xmx4g"
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 500Gi
            storageClassName: rook-ceph-elasticsearch
```

## Tuning Elasticsearch for RBD Storage

Configure Elasticsearch I/O settings via cluster settings:

```bash
# Configure disk allocation watermarks
curl -X PUT "http://elasticsearch-es-http:9200/_cluster/settings" \
  -H "Content-Type: application/json" \
  -d '{
    "persistent": {
      "cluster.routing.allocation.disk.threshold_enabled": true,
      "cluster.routing.allocation.disk.watermark.low": "85%",
      "cluster.routing.allocation.disk.watermark.high": "90%",
      "cluster.routing.allocation.disk.watermark.flood_stage": "95%"
    }
  }'
```

Preload specific Lucene file extensions into memory by setting `index.store.preload` in your index template:

```bash
curl -X PUT "http://elasticsearch-es-http:9200/_index_template/logs-template" \
  -H "Content-Type: application/json" \
  -d '{
    "index_patterns": ["logs-*"],
    "template": {
      "settings": {
        "index.store.preload": ["nvd", "dvd"]
      }
    }
  }'
```

## Index Lifecycle Management

Set up ILM to manage storage consumption:

```bash
curl -X PUT "http://elasticsearch-es-http:9200/_ilm/policy/logs-policy" \
  -H "Content-Type: application/json" \
  -d '{
    "policy": {
      "phases": {
        "hot": {"actions": {"rollover": {"max_size": "50gb", "max_age": "7d"}}},
        "warm": {"min_age": "7d", "actions": {"shrink": {"number_of_shards": 1}}},
        "delete": {"min_age": "30d", "actions": {"delete": {}}}
      }
    }
  }'
```

## Summary

Ceph RBD is an ideal storage backend for Elasticsearch on Kubernetes because both use a local-storage model where each node manages its own data. ECK operator simplifies deployment and references Rook StorageClasses via `volumeClaimTemplates`. Index Lifecycle Management policies control storage consumption and prevent Ceph pools from filling up with stale indices.
