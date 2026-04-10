# How to Configure Ceph Storage for Elastic APM on Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Elastic, APM, Kubernetes, Storage, Observability

Description: Back Elasticsearch for Elastic APM with Ceph RBD block storage on Kubernetes using Rook, providing durable, scalable storage for application performance data.

---

## Overview

Elastic APM collects application traces, errors, and metrics, storing them in Elasticsearch. On Kubernetes, pairing Elasticsearch with Ceph RBD volumes via Rook ensures APM data survives pod restarts and node failures.

## Create a CephBlockPool for Elasticsearch

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: elastic-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 3
  parameters:
    pg_num: "128"
```

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: ceph-rbd-elastic
provisioner: rook-ceph.rbd.csi.ceph.com
parameters:
  clusterID: rook-ceph
  pool: elastic-pool
  imageFormat: "2"
  imageFeatures: layering
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-rbd-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-rbd-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
allowVolumeExpansion: true
```

## Deploy Elasticsearch with Ceph Storage

Use the Elastic Cloud on Kubernetes (ECK) operator:

```bash
kubectl create -f https://download.elastic.co/downloads/eck/2.12.1/crds.yaml
kubectl apply -f https://download.elastic.co/downloads/eck/2.12.1/operator.yaml
```

Deploy an Elasticsearch cluster:

```yaml
apiVersion: elasticsearch.k8s.elastic.co/v1
kind: Elasticsearch
metadata:
  name: apm-elasticsearch
  namespace: elastic
spec:
  version: 8.13.0
  nodeSets:
    - name: default
      count: 3
      config:
        node.store.allow_mmap: false
      volumeClaimTemplates:
        - metadata:
            name: elasticsearch-data
          spec:
            accessModes:
              - ReadWriteOnce
            resources:
              requests:
                storage: 50Gi
            storageClassName: ceph-rbd-elastic
```

## Deploy Elastic APM Server

```yaml
apiVersion: apm.k8s.elastic.co/v1
kind: ApmServer
metadata:
  name: elastic-apm
  namespace: elastic
spec:
  version: 8.13.0
  count: 1
  elasticsearchRef:
    name: apm-elasticsearch
```

## Send Test APM Data

Install the Elastic APM Python agent and send a test transaction:

```python
import elasticapm

client = elasticapm.Client(
    service_name="my-app",
    server_url="http://elastic-apm-apm-http.elastic.svc:8200",
    secret_token="your-token"
)

client.begin_transaction("request")
with elasticapm.capture_span("test-span"):
    print("Hello from Elastic APM on Ceph!")
client.end_transaction("test-transaction", "success")
client.close()
```

## Verify Storage

```bash
kubectl -n elastic get pvc
# elasticsearch-data-apm-elasticsearch-es-default-0   Bound   50Gi  ceph-rbd-elastic
```

Check Elasticsearch index health:

```bash
PASSWORD=$(kubectl -n elastic get secret apm-elasticsearch-es-elastic-user -o go-template='{{.data.elastic | base64decode}}')
kubectl -n elastic exec -it apm-elasticsearch-es-default-0 -- \
  curl -s -k -u "elastic:$PASSWORD" https://localhost:9200/_cat/indices?v | grep apm
```

## Summary

Ceph RBD provides reliable block storage for Elasticsearch clusters backing Elastic APM on Kubernetes. The dedicated storage class and pool isolate APM I/O from other workloads, and ECK's volume claim templates automate PVC provisioning for each Elasticsearch node.
