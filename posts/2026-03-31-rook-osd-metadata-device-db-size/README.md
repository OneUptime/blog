# How to Configure OSD Metadata Device and Database Size in Rook

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, OSD, BlueStore, Storage

Description: Configure a dedicated metadata device and tune the RocksDB database size for Ceph OSDs in Rook to improve performance on hybrid HDD and SSD setups.

---

## Why Separate Metadata Storage

BlueStore, the default Ceph OSD backend, stores its internal RocksDB metadata (WAL and DB) alongside object data. On an all-NVMe cluster this is fine. On a hybrid cluster with HDDs holding bulk data, placing the metadata on a fast SSD dramatically reduces latency and improves small-I/O throughput.

Rook exposes this through the `metadataDevice` field and `databaseSizeMB` field on each OSD or storage node.

## Configuring metadataDevice

Set `metadataDevice` at the node level inside the `CephCluster` storage spec:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    nodes:
      - name: "worker-1"
        devices:
          - name: "sdb"   # HDD for bulk data
          - name: "sdc"   # HDD for bulk data
        config:
          metadataDevice: "nvme0n1"  # SSD for BlueStore DB/WAL
      - name: "worker-2"
        devices:
          - name: "sdb"
          - name: "sdc"
        config:
          metadataDevice: "nvme0n1"
```

Rook passes this value directly to `ceph-volume`. Ceph will partition the SSD and allocate DB and WAL partitions per OSD automatically.

## Controlling databaseSizeMB

By default, Ceph calculates the RocksDB DB partition size based on the OSD data device capacity. You can override this with `databaseSizeMB`:

```yaml
config:
  metadataDevice: "nvme0n1"
  databaseSizeMB: "20480"    # 20 GiB per OSD on the metadata device
```

Ceph documentation recommends allocating between 1% and 4% of the data device size for the DB, depending on workload - closer to 1-2% for RBD and up to 4% for RGW. Without an explicit `databaseSizeMB`, ceph-volume divides the available space on the metadata device equally among the OSDs sharing it. Setting an explicit value caps the partition size per OSD and lets multiple HDDs share one SSD more predictably.

## Sizing the Metadata Device

As a rule of thumb, assume 1 GiB of SSD per 1 TB of HDD data with the default BlueStore settings. For large object workloads (block volumes, RBD) the metadata is smaller; for many small objects (RGW workloads) it grows faster.

Example calculation for three 4 TB HDDs sharing one SSD:

```text
3 OSDs x 1 GiB/TB x 4 TB = 12 GiB minimum
Recommended: 30-50 GiB SSD capacity per set of 3 HDDs for headroom
```

## Applying at the StorageClassDeviceSet Level

For PVC-based clusters, add a volume claim template named `metadata` inside the device set:

```yaml
spec:
  storage:
    storageClassDeviceSets:
      - name: set1
        count: 3
        volumeClaimTemplates:
          - metadata:
              name: data
            spec:
              storageClassName: "hdd-storageclass"
              resources:
                requests:
                  storage: 4Ti
          - metadata:
              name: metadata
            spec:
              storageClassName: "nvme-storageclass"
              resources:
                requests:
                  storage: 30Gi
```

The `metadata` volume claim is automatically detected by Rook as the BlueStore DB device.

## Verifying Placement

After the cluster converges, verify device layout in the toolbox:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph-volume lvm list
```

The output will show each OSD with separate `db` and `wal` devices if separation is configured correctly.

## Summary

Separating OSD metadata onto fast SSDs with `metadataDevice` and tuning `databaseSizeMB` provides a cost-effective way to accelerate hybrid Rook-Ceph clusters. HDDs handle bulk capacity while the SSD absorbs random small writes from BlueStore's RocksDB layer, significantly improving tail latency on mixed workloads.
