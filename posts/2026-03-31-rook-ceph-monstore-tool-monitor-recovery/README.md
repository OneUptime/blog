# How to Use ceph-monstore-tool for Monitor Recovery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Monitor, Recovery, ceph-monstore-tool, Debugging

Description: Use ceph-monstore-tool to inspect and repair Ceph monitor stores when monitors fail to start or quorum cannot be established after a failure.

---

## When to Use ceph-monstore-tool

Monitor failures are critical - without quorum, the entire Ceph cluster becomes unavailable. `ceph-monstore-tool` lets you inspect the monitor's RocksDB store, extract the monitor map, and perform emergency repairs to restore quorum.

## Access the Monitor Store

In a Rook deployment, access the monitor store through the monitor pod or the toolbox:

```bash
# Find the monitor pod
kubectl get pods -n rook-ceph | grep rook-ceph-mon

# Scale down the failed monitor
kubectl -n rook-ceph scale deployment rook-ceph-mon-a --replicas=0

# The monitor store is at /var/lib/ceph/mon/ceph-a/store.db
```

## Inspect the Monitor Store Contents

```bash
# Back up the monitor store
ceph-monstore-tool /var/lib/ceph/mon/ceph-a \
  store-copy /tmp/mon-backup

# Get the current monitor map
ceph-monstore-tool /var/lib/ceph/mon/ceph-a \
  get monmap -- --out /tmp/monmap.bin

# Decode the monitor map
monmaptool --print /tmp/monmap.bin
```

## Extract and Inspect the OSD Map

```bash
ceph-monstore-tool /var/lib/ceph/mon/ceph-a \
  get osdmap -- --out /tmp/osdmap.bin

# Decode the OSD map
osdmaptool --print /tmp/osdmap.bin
```

## Rebuild the Monitor Store

If the monitor store is corrupt, rebuild it from a known good monitor or from the OSD maps:

```bash
# Copy store from a healthy monitor
kubectl -n rook-ceph exec rook-ceph-mon-b-xxxxx -- \
  tar czf - -C /var/lib/ceph/mon/ceph-b store.db > /tmp/mon-b-store.tar.gz

# Remove the corrupt store and restore from backup
rm -rf /var/lib/ceph/mon/ceph-a/store.db
tar xzf /tmp/mon-b-store.tar.gz -C /var/lib/ceph/mon/ceph-a/
```

## Trim the Monitor Store

A growing monitor store can cause OOM issues. Compact it:

```bash
# Compact the RocksDB store
ceph-monstore-tool /var/lib/ceph/mon/ceph-a \
  compact

# Check store size after compaction
du -sh /var/lib/ceph/mon/ceph-a/store.db
```

## Emergency: Remove a Failed Monitor from the Map

If a monitor cannot be recovered, remove it from the monmap:

```bash
# Get current monmap from a healthy monitor
ceph mon getmap -o /tmp/monmap

# Remove the failed monitor
monmaptool --rm a /tmp/monmap

# Inject the new monmap into the remaining monitor's store
ceph-mon -i b --inject-monmap /tmp/monmap
```

## Verify Recovery

```bash
# Restart the monitor pod
kubectl -n rook-ceph scale deployment rook-ceph-mon-a --replicas=1

# Check monitor quorum
ceph mon stat
ceph quorum_status --format json | python3 -m json.tool
```

## Summary

`ceph-monstore-tool` is the primary tool for diagnosing and recovering failed Ceph monitors. By inspecting the RocksDB store, extracting monitor maps, and performing targeted repairs, you can restore monitor quorum without data loss. In Rook environments, always scale down monitor deployments before operating on the store.
