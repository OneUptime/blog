# How to Configure Storage Devices in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, OSD, Storage, BlueStore, Device

Description: Learn how to configure storage devices for Ceph OSDs using BlueStore, including data, WAL, and DB device placement for optimal performance.

---

## Storage Device Architecture in Ceph

Ceph's BlueStore OSD backend divides storage into three logical components:

- **Data device**: Stores the main object data. Typically an HDD or NVMe.
- **DB device** (optional): Stores RocksDB metadata (SST files containing object metadata and OSD state). Using an SSD/NVMe for DB dramatically improves IOPS.
- **WAL device** (optional): Stores the RocksDB write-ahead log. Fastest device available (NVMe preferred).

Using separate devices for DB and WAL allows you to co-locate the performance-critical metadata on fast flash storage while keeping bulk data on cheaper HDDs.

## Listing Available Devices

```bash
# In cephadm-managed cluster
ceph orch device ls --wide

# In Rook
kubectl exec -it rook-ceph-tools -n rook-ceph -- ceph-volume inventory
```

A device must be zapped (no existing partitions) before Ceph can use it.

## Zapping Devices Before Use

```bash
# Zap a device (WARNING: destroys all data)
ceph orch device zap node2 /dev/sdb --force

# Or use ceph-volume directly
ceph-volume lvm zap /dev/sdb --destroy
```

## Deploying OSDs with cephadm Service Spec

Define separate device roles in the OSD service spec:

```yaml
# osd-tiered.yaml
service_type: osd
service_id: tiered-osds
placement:
  hosts:
    - node2
    - node3
data_devices:
  rotational: 1       # Select only spinning disks (HDDs)
db_devices:
  rotational: 0       # Select SSDs for DB
  size: "200G:"       # SSDs larger than 200GB
wal_devices:
  model: Samsung_SSD_980_PRO  # NVMe by model
```

```bash
ceph orch apply -i osd-tiered.yaml
```

## Rook CephCluster Storage Configuration

In Rook, configure storage devices in the CephCluster CRD:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  storage:
    useAllNodes: false
    useAllDevices: false
    nodes:
      - name: "worker1"
        devices:
          - name: "sdb"
            config:
              osdsPerDevice: "1"
              metadataDevice: "nvme0n1"
      - name: "worker2"
        devices:
          - name: "sdc"
```

## Device Selection Filters

cephadm supports multiple device selection strategies:

```yaml
# Select all devices
data_devices:
  all: true

# Select by rotation status (0=SSD/NVMe, 1=HDD)
data_devices:
  rotational: 1

# Select by size range
data_devices:
  size: "1T:10T"      # Between 1TB and 10TB

# Select by vendor
data_devices:
  vendor: "SEAGATE"

# Select by model
data_devices:
  model: "ST4000NM"

# Select specific paths
data_devices:
  paths:
    - /dev/sdb
    - /dev/sdc
    - /dev/sdd
```

## Configuring OSDs per Device

For NVMe drives with sufficient IOPS, multiple OSDs per device can improve parallelism:

```yaml
service_type: osd
service_id: nvme-osds
placement:
  hosts: [node2]
data_devices:
  paths:
    - /dev/nvme0n1
osds_per_device: 4
```

## Verifying OSD Deployment

```bash
# Check OSD tree after deployment
ceph osd tree

# Verify BlueStore is in use
ceph osd metadata osd.0 | grep osd_objectstore

# Check device allocation per OSD
ceph-volume lvm list
```

## Summary

Ceph BlueStore allows you to optimize OSD performance by placing data, DB (RocksDB metadata), and WAL components on different storage tiers. HDD data devices paired with SSD or NVMe DB devices improve random I/O performance significantly. Both cephadm service specs and Rook CephCluster CRDs support granular device selection using path, model, vendor, size, and rotation filters. Proper device configuration is one of the most impactful tuning levers available for Ceph cluster performance.
