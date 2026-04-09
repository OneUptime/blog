# How to Configure osdsPerDevice in Rook-Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, OSD, BlueStore, Storage

Description: Use the osdsPerDevice field in Rook to provision multiple OSDs from a single large NVMe or SSD device, improving parallelism and CPU utilization on high-capacity drives.

---

## Why Run Multiple OSDs Per Device

While Ceph OSD processes are multi-threaded (an SSD-backed OSD runs up to 16 op worker threads by default), a single OSD may not fully utilize all the IOPS of a high-performance NVMe device due to internal lock contention and per-PG serialization. A single NVMe drive capable of 500K IOPS can saturate one OSD process long before exhausting the physical device. Running two or four OSDs per device distributes placement groups across independent processes, improving parallelism and getting closer to the device's real throughput ceiling.

This technique is most useful for:
- Large NVMe drives (4 TB or more)
- Workloads with high concurrency (many clients, many small I/Os)
- Clusters where CPU and network are not the bottleneck

## Setting osdsPerDevice

Add `osdsPerDevice` to the node or cluster-wide `config` block:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    config:
      osdsPerDevice: "2"   # global default: 2 OSDs on every device
    nodes:
      - name: "worker-1"
        devices:
          - name: "nvme0n1"
            config:
              osdsPerDevice: "4"   # override for this specific device
          - name: "nvme1n1"
            # inherits global osdsPerDevice: "2"
```

Values are strings in the Rook CRD. When `osdsPerDevice` is greater than 1, Rook uses LVM mode to create logical volumes on each device and assigns a separate OSD process to each logical volume.

## Choosing the Right Number

General guidance for NVMe drives:

```text
Drive size   | Recommended osdsPerDevice
-------------|--------------------------
< 1 TB       | 1
1 TB - 4 TB  | 2
4 TB - 8 TB  | 4
> 8 TB       | 4-8 (test for diminishing returns)
```

More OSDs per device also means more memory and CPU overhead. Each OSD process consumes roughly 1-4 GiB of RAM depending on cache configuration. Plan node resources accordingly.

## Verifying OSD Count

After the cluster reconciles, list OSDs to confirm the expected count:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd tree
```

For a node with one NVMe and `osdsPerDevice: 4` you should see four separate OSD entries under that host.

Check the LVM layout directly from an OSD pod (note: `ceph-volume` is not available in the toolbox pod):

```bash
kubectl -n rook-ceph exec -it <osd-pod-name> -- ceph-volume lvm list
```

Each OSD appears as a separate logical volume with its own OSD ID.

## Combining with metadataDevice

You can combine `osdsPerDevice` with a dedicated metadata device:

```yaml
config:
  osdsPerDevice: "4"
  metadataDevice: "sda"  # SSD for DB/WAL of all 4 NVMe OSDs
```

Each of the four OSDs gets its own DB logical volume on the metadata device (WAL is co-located with DB by default). Size the metadata device to accommodate all logical volumes (roughly 20-30 GiB per OSD).

## Impact on CRUSH Map

Each OSD created from a single physical device appears as an independent OSD in the CRUSH map. Ceph treats them as separate failure buckets at the OSD level but they share the same physical host bucket. For true fault tolerance, ensure your pool replication still spans multiple hosts, not just multiple OSDs on one disk.

## Summary

`osdsPerDevice` is a simple knob that unlocks the full performance potential of modern high-capacity NVMe drives in Rook-Ceph. Start with 2 for drives above 1 TB and benchmark your workload before committing to higher values, since the memory and CPU cost scales linearly with OSD count.
