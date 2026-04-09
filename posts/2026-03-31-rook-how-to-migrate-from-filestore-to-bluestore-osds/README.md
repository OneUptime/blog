# How to Migrate from FileStore to BlueStore OSDs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, BlueStore, Filestore, Migration

Description: Migrate Ceph OSDs from the legacy FileStore backend to BlueStore for improved performance, checksumming, and compression support.

---

## Why Migrate from FileStore to BlueStore

BlueStore is the default and recommended OSD storage backend since Ceph Luminous (12.x). Compared to FileStore, BlueStore provides:

- Better write performance through direct disk writes without a filesystem layer
- Built-in data checksums for improved data integrity
- Native compression support
- Better performance for erasure-coded pools
- ~20-30% improvement in raw throughput on typical workloads

FileStore OSDs should be migrated to BlueStore, especially in Rook-Ceph environments where BlueStore is the only officially supported backend.

## Checking Current OSD Backend

First, identify which OSDs are still using FileStore:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd metadata | python3 -c "
import sys, json
osds = json.load(sys.stdin)
for osd in osds:
    osd_id = osd.get('id', 'unknown')
    backend = osd.get('osd_objectstore', 'unknown')
    host = osd.get('hostname', 'unknown')
    print(f'osd.{osd_id} on {host}: {backend}')
" | grep filestore
```

Output showing FileStore OSDs:

```text
osd.3 on node2: filestore
osd.4 on node2: filestore
```

Or using the simpler command:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd metadata osd.3 | grep osd_objectstore
```

Output:

```text
    "osd_objectstore": "filestore",
```

## Migration Strategy: One OSD at a Time

The safest approach is to migrate OSDs one at a time, allowing Ceph to rebalance data between each migration.

### Step 1: Mark the OSD Out

```bash
OSD_ID=3

# Safely remove the OSD from the cluster
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd out osd.$OSD_ID
```

Wait for Ceph to rebalance the data off the OSD:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph status
```

Wait until you see `active+clean` for all PGs.

### Step 2: Stop and Remove the FileStore OSD

In Rook, delete the OSD deployment:

```bash
# Find and delete the OSD pod/deployment
kubectl -n rook-ceph get deployment | grep osd-$OSD_ID
kubectl -n rook-ceph delete deployment rook-ceph-osd-$OSD_ID
```

Remove the OSD from the cluster:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd purge osd.$OSD_ID --yes-i-really-mean-it
```

### Step 3: Wipe the Disk

SSH into the node that hosted the FileStore OSD and wipe the disk:

```bash
# Replace with the actual device path
DISK=/dev/sdb

# Remove FileStore data
wipefs -a $DISK
sgdisk --zap-all $DISK
dd if=/dev/zero of=$DISK bs=1M count=100
```

### Step 4: Allow Rook to Recreate as BlueStore

After wiping the disk, the Rook operator will automatically discover the clean disk and create a new BlueStore OSD:

```bash
# Watch for the new OSD to be provisioned
kubectl -n rook-ceph get pods -w | grep osd
```

Output:

```text
rook-ceph-osd-prepare-node2-xxxxx   0/1   Pending    0   0s
rook-ceph-osd-prepare-node2-xxxxx   1/1   Running    0   5s
rook-ceph-osd-prepare-node2-xxxxx   0/1   Completed  0   90s
rook-ceph-osd-3-xxxxxxxxxx          1/1   Running    0   2m
```

### Step 5: Verify the New OSD is BlueStore

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd metadata osd.$OSD_ID | grep osd_objectstore
```

Output:

```text
    "osd_objectstore": "bluestore",
```

## Automating the Migration

Script to migrate all FileStore OSDs iteratively:

```bash
#!/bin/bash
# migrate-filestore-to-bluestore.sh

NAMESPACE="rook-ceph"

# Get list of FileStore OSDs
FILESTORE_OSDS=$(kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- ceph osd metadata 2>/dev/null | \
  python3 -c "
import sys, json
osds = json.load(sys.stdin)
for osd in osds:
    if osd.get('osd_objectstore') == 'filestore':
        print(osd['id'])
")

if [ -z "$FILESTORE_OSDS" ]; then
  echo "No FileStore OSDs found - all OSDs are BlueStore!"
  exit 0
fi

echo "FileStore OSDs to migrate: $FILESTORE_OSDS"

for OSD_ID in $FILESTORE_OSDS; do
  echo "Migrating osd.$OSD_ID..."
  
  # Mark out
  kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- ceph osd out osd.$OSD_ID
  
  # Wait for clean
  echo "Waiting for cluster to rebalance..."
  while true; do
    STATUS=$(kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- ceph health --format json | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])")
    if [ "$STATUS" = "HEALTH_OK" ] || [ "$STATUS" = "HEALTH_WARN" ]; then
      UNCLEAN=$(kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- ceph pg stat --format json | python3 -c "
import sys, json
d = json.load(sys.stdin)
states = d.get('num_pg_by_state', [])
unclean = sum(s['num'] for s in states if 'active' not in s['name'] or 'clean' not in s['name'])
print(unclean)")
      if [ "$UNCLEAN" = "0" ]; then
        echo "Cluster is balanced, proceeding with migration"
        break
      fi
    fi
    echo "Still rebalancing... waiting 30s"
    sleep 30
  done

  # Stop and remove the OSD
  kubectl -n $NAMESPACE delete deployment rook-ceph-osd-$OSD_ID 2>/dev/null || true
  kubectl -n $NAMESPACE exec deploy/rook-ceph-tools -- ceph osd purge osd.$OSD_ID --yes-i-really-mean-it

  echo "Please wipe disk for osd.$OSD_ID and press Enter when done"
  read

  echo "osd.$OSD_ID removed. Rook will recreate as BlueStore."
  sleep 60
done

echo "Migration complete!"
```

## Verifying Full Migration

After migrating all OSDs, confirm no FileStore OSDs remain:

```bash
kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- ceph osd metadata | \
  python3 -c "
import sys, json
osds = json.load(sys.stdin)
backends = {}
for osd in osds:
    backend = osd.get('osd_objectstore', 'unknown')
    backends[backend] = backends.get(backend, 0) + 1
for backend, count in backends.items():
    print(f'{backend}: {count} OSDs')
"
```

Output when migration is complete:

```text
bluestore: 9 OSDs
```

## Summary

Migrating from FileStore to BlueStore requires marking each OSD out, waiting for data rebalancing, wiping the disk, and allowing Rook to automatically recreate the OSD with BlueStore. Always migrate one OSD at a time and verify cluster health between each migration. BlueStore provides significant performance and data integrity benefits that make the migration effort worthwhile for any production Ceph cluster.
