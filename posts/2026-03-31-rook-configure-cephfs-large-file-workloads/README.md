# How to Configure CephFS for Large File Workloads

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CephFS, Performance, Storage

Description: Configure CephFS in Rook for large file workloads by tuning striping, readahead, and OSD placement to maximize sequential throughput for media and data pipelines.

---

## Large File Workload Characteristics

Large file workloads - media transcoding, HPC data pipelines, database backups, genomics datasets - are dominated by sequential reads and writes of files ranging from hundreds of MB to tens of GB. The bottleneck shifts from metadata (MDS) to OSD I/O throughput.

## Striping for Throughput

CephFS can stripe files across multiple OSD objects. Configure default striping at the directory level using extended attributes. Set the layout on the root directory to apply defaults filesystem-wide:

```bash
# Set stripe unit to 4 MB and stripe count to 8 for new files
setfattr -n ceph.dir.layout.stripe_unit -v 4194304 /mnt/cephfs/
setfattr -n ceph.dir.layout.stripe_count -v 8 /mnt/cephfs/
```

For a specific subdirectory:

```bash
setfattr -n ceph.dir.layout.stripe_unit -v 4194304 /mnt/cephfs/large-files
setfattr -n ceph.dir.layout.stripe_count -v 8 /mnt/cephfs/large-files
setfattr -n ceph.dir.layout.object_size -v 33554432 /mnt/cephfs/large-files
```

## Readahead Configuration

Increase readahead for clients that do sequential access:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_readahead_max_bytes 67108864

kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set client client_readahead_min 1048576
```

## Pool Design for Large Files

Use high-throughput HDD OSDs with erasure coding for cost-efficient large file storage:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephFilesystem
metadata:
  name: mediafs
  namespace: rook-ceph
spec:
  metadataPool:
    replicated:
      size: 3
    deviceClass: ssd
  dataPools:
    - name: ec-data
      erasureCoded:
        dataChunks: 6
        codingChunks: 2
      parameters:
        compression_mode: none
  metadataServer:
    activeCount: 1
    activeStandby: true
    resources:
      requests:
        memory: "2Gi"
```

Disable compression for already-compressed media:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph osd pool set mediafs-ec-data compression_mode none
```

## OSD and Network Tuning

For large sequential transfers, increase the OSD op thread count:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  ceph config set osd osd_op_num_threads_per_shard 2
```

Ensure your Kubernetes nodes have 10 GbE or better networking. Large file workloads quickly saturate 1 GbE links.

## StorageClass for Large File Workloads

```yaml
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: cephfs-largefile
provisioner: rook-ceph.cephfs.csi.ceph.com
parameters:
  clusterID: rook-ceph
  fsName: mediafs
  pool: mediafs-ec-data
  csi.storage.k8s.io/provisioner-secret-name: rook-csi-cephfs-provisioner
  csi.storage.k8s.io/provisioner-secret-namespace: rook-ceph
  csi.storage.k8s.io/node-stage-secret-name: rook-csi-cephfs-node
  csi.storage.k8s.io/node-stage-secret-namespace: rook-ceph
mountOptions:
  - noacl
  - noatime
```

## Benchmarking with fio

Verify throughput after tuning:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- \
  fio --name=seqread --rw=read --bs=1m --size=10g \
      --filename=/mnt/cephfs/bench/testfile --numjobs=4 --iodepth=8
```

## Summary

CephFS large file performance depends on configuring stripe unit and count to distribute data across many OSDs, increasing client readahead, and selecting erasure coding for cost efficiency. Using HDD OSDs for the data pool and SSD for metadata provides the best price-to-performance ratio for bulk file workloads.
