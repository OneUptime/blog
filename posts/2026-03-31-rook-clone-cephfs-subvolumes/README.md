# How to Clone CephFS Subvolumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CephFS, Clone, Subvolume, Snapshot, Storage

Description: Clone CephFS subvolumes from snapshots to create independent writable copies for testing, staging environments, or data pipeline branching.

---

CephFS subvolume cloning creates a new independent writable subvolume from an existing snapshot. Unlike a snapshot (which is read-only), a clone starts as a copy of a snapshot and becomes fully writable. This guide covers the clone workflow from snapshot creation to clone completion.

## Clone Workflow Overview

The process is:
1. Create a snapshot of the source subvolume
2. Issue the clone command
3. Wait for the clone to reach "complete" state
4. Optionally delete the source snapshot

> **Note:** In Ceph Nautilus, protecting the snapshot before cloning was required (`ceph fs subvolume snapshot protect`). This prerequisite was deprecated in Octopus and the protect/unprotect commands are now no-ops.

## Step 1: Prepare the Source Snapshot

```bash
# Create a snapshot of the subvolume to clone
ceph fs subvolume snapshot create cephfs webapp clone-source
```

## Step 2: Create the Clone

```bash
# Clone from the snapshot into a new subvolume named "webapp-staging"
ceph fs subvolume snapshot clone cephfs webapp clone-source webapp-staging

# Clone into a specific group
ceph fs subvolume snapshot clone cephfs webapp clone-source webapp-dev \
  --target_group_name dev-team

# Clone with a specific pool
ceph fs subvolume snapshot clone cephfs webapp clone-source webapp-test \
  --pool_layout cephfs.data.ssd
```

## Step 3: Monitor Clone Progress

The clone operation runs asynchronously. Monitor its state:

```bash
# Check clone status
ceph fs clone status cephfs webapp-staging

# Watch until complete
watch -n 5 "ceph fs clone status cephfs webapp-staging"
```

Clone states:
- `pending` - queued but not started
- `in-progress` - data is being copied
- `complete` - clone is ready and fully independent
- `failed` - clone failed (check `ceph log` for details)
- `canceled` - clone was cancelled by the user

## Step 4: Use the Completed Clone

```bash
# Get the clone's mount path
ceph fs subvolume getpath cephfs webapp-staging

# Mount the clone
CLONE_PATH=$(ceph fs subvolume getpath cephfs webapp-staging)
mount -t ceph mon1:6789:${CLONE_PATH} /mnt/webapp-staging \
  -o name=staging,secret=<cephx-key>

# Write to the clone independently of the source
echo "staging config" > /mnt/webapp-staging/config.yaml
```

## Step 5: Clean Up the Source Snapshot

```bash
# Remove the snapshot to free space
ceph fs subvolume snapshot rm cephfs webapp clone-source
```

## Cloning Between Groups

```bash
# Source subvolume in "production" group
# Clone target in "dev-team" group
ceph fs subvolume snapshot create cephfs db prod-snap --group_name production

ceph fs subvolume snapshot clone cephfs db prod-snap db-dev \
  --group_name production \
  --target_group_name dev-team

# Monitor progress
ceph fs clone status cephfs db-dev --group_name dev-team
```

## Cancelling a Clone

```bash
# Cancel an in-progress clone
ceph fs clone cancel cephfs webapp-staging
```

## Summary

CephFS subvolume cloning creates independent writable copies from snapshots, making it straightforward to spin up staging or development environments from production data. The clone workflow involves creating a snapshot of the source subvolume, then monitoring the async copy until it reaches "complete" state. Once complete, the clone operates entirely independently - writes to the clone do not affect the source, and the source snapshot can be removed after cloning. Clones can target different subvolume groups and data pools, enabling flexible environment promotion pipelines.
