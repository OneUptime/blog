# How to Plan CephFS for Web Content Serving

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Web, Storage

Description: Design a CephFS deployment optimized for web content serving, including read-caching, MDS tuning, and Kubernetes integration for shared static assets.

---

## CephFS for Web Content Use Cases

Web content serving typically involves many small-to-medium reads from static assets such as images, CSS, JavaScript, and HTML files. Multiple web server pods read the same files concurrently. CephFS with RWX volumes is a natural fit.

Key requirements for web serving:
- High read throughput with low latency
- Many concurrent readers
- Shared access across replicated pods

## Filesystem Design

Create a dedicated filesystem with a data pool using SSD-backed OSDs for lower latency:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: webfs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
    deviceClass: ssd
  dataPools:
    - name: data0
      replicated:
        size: 3
      deviceClass: ssd
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      requests:
        memory: "2Gi"
        cpu: "1"
      limits:
        memory: "4Gi"
```

## Tuning for Read Performance

Enable MDS cache to hold hot metadata in memory. Increase the MDS cache memory limit in the CephFS configuration:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set mds mds_cache_memory_limit 4294967296
```

For web workloads, also increase the readahead size:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_readahead_max_bytes 8388608
```

## StorageClass and PVC Configuration

Define a StorageClass with read-optimized mount options:

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs-web
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: webfs
  pool: webfs-data0
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
reclaimPolicy: Retain
mountOptions:
  - noacl
  - noatime
```

Create a shared PVC for web assets:

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: web-content
  namespace: web
spec:
  accessModes:
    - ReadWriteMany
  storageClassName: cephfs-web
  resources:
    requests:
      storage: 100Gi
```

## Deploying Web Servers with Shared Volume

Mount the shared CephFS volume into multiple nginx replicas:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-web
  namespace: web
spec:
  replicas: 5
  selector:
    matchLabels:
      app: nginx-web
  template:
    metadata:
      labels:
        app: nginx-web
    spec:
      containers:
        - name: nginx
          image: nginx:1.25
          volumeMounts:
            - name: content
              mountPath: /usr/share/nginx/html
      volumes:
        - name: content
          persistentVolumeClaim:
            claimName: web-content
```

## Monitoring and Capacity Planning

Track read throughput from the MDS perspective:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph fs status webfs
```

Watch OSD read IOPS via the Ceph dashboard or Prometheus metrics exposed by Rook. Set capacity alerts at 75% utilization to allow time for expansion.

## Summary

Planning CephFS for web content serving centers on SSD-backed data pools, a well-sized MDS cache, and read-optimized mount options. Using RWX PVCs allows all web server replicas to share a single volume without duplication, and tuning readahead improves throughput for sequential file reads.
