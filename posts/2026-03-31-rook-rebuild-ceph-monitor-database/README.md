# How to Rebuild a Ceph Monitor Database

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Database, Disaster Recovery, Storage

Description: Learn how to rebuild a Ceph monitor database from OSD data when all monitors are lost, using ceph-monstore-tool to reconstruct cluster state from surviving OSDs.

---

## When Monitor Database Reconstruction Is Needed

Monitor database reconstruction is a last-resort procedure needed when:
- All monitor data directories are lost or corrupted
- The monitor database is irrecoverably corrupted
- All monitors were on nodes that were completely destroyed

This procedure rebuilds the monitor database by scanning OSD metadata to reconstruct the minimum cluster state.

## Prerequisites

Before starting, verify:
- At least some OSDs are accessible and contain data
- You have root access to OSD hosts
- Ceph packages are installed (specifically `ceph-monstore-tool`)

## Step 1: Stop All Remaining Ceph Services

Stop any remaining monitors and OSDs to prevent conflicting writes:

```bash
systemctl stop ceph-mon.target
systemctl stop ceph-osd.target
systemctl stop ceph-mgr.target
```

## Step 2: Collect OSD Information

On each OSD host, list available OSDs:

```bash
ceph-volume lvm list
ls /var/lib/ceph/osd/
```

Note all OSD IDs and their data paths.

## Step 3: Create a New Monitor Store Directory

On the designated new monitor node:

```bash
mkdir -p /tmp/mon-recovery/
```

## Step 4: Extract OSD Data into the Recovery Store

Use `ceph-objectstore-tool` on each OSD to extract cluster maps into the recovery store:

```bash
# On the local node, extract data from each OSD
for osd_dir in /var/lib/ceph/osd/ceph-*/; do
  ceph-objectstore-tool --data-path $osd_dir --no-mon-config \
    --op update-mon-db --mon-store-path /tmp/mon-recovery
done
```

If OSDs are on separate nodes, collect and merge their data:

```bash
ms=/tmp/mon-recovery
for host in $osd_hosts; do
  rsync -avz $ms/. user@$host:$ms.remote
  rm -rf $ms
  ssh user@$host <<EOF
    for osd in /var/lib/ceph/osd/ceph-*; do
      ceph-objectstore-tool --data-path \$osd --no-mon-config \
        --op update-mon-db --mon-store-path $ms.remote
    done
EOF
  rsync -avz user@$host:$ms.remote/. $ms
done
```

## Step 5: Rebuild the Monitor Store

Optionally, inspect an OSD superblock to verify data is accessible:

```bash
ceph-objectstore-tool \
  --data-path /var/lib/ceph/osd/ceph-0 \
  --no-mon-config \
  --op dump-super
```

Rebuild the monitor store from the collected OSD data:

```bash
ceph-monstore-tool /tmp/mon-recovery \
  rebuild \
  -- \
  --keyring /etc/ceph/ceph.client.admin.keyring \
  --mon-ids $(hostname)
```

## Step 6: Initialize the New Monitor

Use the rebuilt store to initialize a monitor:

```bash
# Copy rebuilt store.db to monitor data path
cp -r /tmp/mon-recovery/store.db /var/lib/ceph/mon/ceph-$(hostname)/store.db

# Set ownership
chown -R ceph:ceph /var/lib/ceph/mon/ceph-$(hostname)/

# Start the rebuilt monitor
systemctl start ceph-mon@$(hostname)
```

## Step 7: Verify and Expand

Check that the rebuilt monitor starts:

```bash
ceph mon stat
ceph -s
```

The cluster will likely show many degraded PGs. Add remaining OSDs:

```bash
ceph osd set noout
for i in $(seq 0 8); do
  ceph-volume lvm activate $i <fsid>
done
```

## Recovery in Rook Environments

For Rook, if all monitors are lost, the extreme recovery path involves:

1. Taking the cluster offline (scale down Rook operator)
2. Manually rebuilding monitor data using the above procedure
3. Restoring the monitor data to Kubernetes PVs used by Rook monitors
4. Re-enabling the Rook operator

```bash
kubectl -n rook-ceph scale deployment rook-ceph-operator --replicas=0
# Perform manual monitor recovery
kubectl -n rook-ceph scale deployment rook-ceph-operator --replicas=1
```

## Prevention

Back up monitor data regularly:

```bash
#!/bin/bash
ceph-monstore-tool /var/lib/ceph/mon/ceph-$(hostname) store-copy \
  /backup/mon-$(hostname)-$(date +%Y%m%d)/
```

## Summary

Rebuilding a Ceph monitor database is a complex last-resort procedure that reconstructs cluster state from OSD metadata using `ceph-monstore-tool`. The rebuilt monitor database may not be perfectly accurate, but it is sufficient to restore cluster access so data can be read and migrated. Regular monitor database backups remain the safest path to rapid recovery from monitor loss.
