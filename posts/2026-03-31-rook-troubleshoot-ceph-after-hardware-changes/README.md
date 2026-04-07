# How to Troubleshoot Ceph After Hardware Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Hardware, Troubleshooting, OSD

Description: Diagnose Ceph cluster issues following hardware changes such as disk replacements, NIC swaps, RAM upgrades, or server additions using targeted commands.

---

Hardware changes are among the most common triggers for Ceph cluster disruptions. Whether replacing a failed disk, adding a server, or upgrading a NIC, each change can introduce subtle issues that require a targeted troubleshooting approach.

## After Adding a New OSD Disk

When a new disk is added, verify the OSD was created and is healthy:

```bash
ceph osd tree
ceph osd stat
ceph health detail

# Confirm the new OSD is in and up
ceph osd dump | grep "osd.$(ceph osd ls | tail -1)"
```

Watch for rebalancing - new OSDs trigger data migration:

```bash
watch -n 5 ceph status
# Look for: "recovering X objects/s"
```

## After Replacing a Failed Disk

Replacing a disk generates a new OSD with a different ID. Confirm the old OSD was properly removed:

```bash
# List OSDs and their states
ceph osd tree

# Check if old OSD is still referenced
ceph osd dump | grep "destroyed\|out"

# If old OSD is still shown as out/destroyed, remove it
ceph osd purge osd.N --yes-i-really-mean-it
```

## After a NIC Replacement or IP Change

If a network card was replaced or the IP address changed, Ceph daemons may fail to bind or reach peers:

```bash
# Check MON map for correct addresses
ceph mon dump

# Check OSD bind addresses
ceph osd dump | grep -E "^osd\.[0-9]+" | grep -v "^osd_\|^osd_heartbeat"

# If IP changed, extract and inspect the MON map
ceph mon getmap -o /tmp/monmap
monmaptool --print /tmp/monmap
```

Update the Rook CephCluster spec if MON addresses changed:

```yaml
spec:
  mon:
    count: 3
    allowMultiplePerNode: false
  network:
    hostNetwork: true
```

## After Adding a New Node

New nodes need Ceph packages and proper configuration:

```bash
# Verify new node is visible
ceph osd tree | grep hostname

# Check CRUSH map includes the new host
ceph osd crush tree

# If missing, add it
ceph osd crush add-bucket new-host host
ceph osd crush move new-host root=default
```

## After a RAM Upgrade

Increased RAM does not usually cause problems but BlueStore cache settings may need adjustment:

```bash
# Check current BlueStore cache allocation
ceph daemon osd.0 config show | grep bluestore_cache_size

# Optionally increase cache for better performance
ceph config set osd bluestore_cache_size_ssd 4294967296  # 4 GB
```

## Summary

Ceph issues after hardware changes usually fall into a few categories: OSD identity cleanup after disk replacement, address binding failures after NIC changes, and CRUSH map updates after node additions. Running `ceph osd tree` and `ceph health detail` immediately after any hardware change provides a quick sanity check of what the cluster sees versus what you intended.
