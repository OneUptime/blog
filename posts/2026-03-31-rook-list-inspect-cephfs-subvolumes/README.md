# How to List and Inspect CephFS Subvolumes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CephFS, Subvolume, Inspection, CLI, Storage Management

Description: List, query, and inspect CephFS subvolumes and their properties including size, usage, state, snapshots, and data pool placement for storage auditing.

---

Managing a multi-tenant CephFS deployment requires visibility into all subvolumes, their sizes, current usage, and health state. This guide covers the CLI commands to enumerate and inspect subvolumes for operational monitoring and auditing.

## Listing All Subvolumes

```bash
# List subvolumes in the default group
ceph fs subvolume ls cephfs

# List in a specific group
ceph fs subvolume ls cephfs --group_name production

# List as JSON for scripting
ceph fs subvolume ls cephfs --format json
```

Example output:

```json
[
  {"name": "webapp"},
  {"name": "api-service"},
  {"name": "shared-config"}
]
```

## Getting Detailed Info on a Single Subvolume

```bash
# Full info for a subvolume
ceph fs subvolume info cephfs webapp

# In a group
ceph fs subvolume info cephfs webapp --group_name production
```

Example output:

```json
{
    "atime": "2026-03-31 09:00:00",
    "bytes_pcent": "42.50",
    "bytes_quota": 21474836480,
    "bytes_used": 9126805504,
    "created_at": "2026-03-01 10:00:00",
    "ctime": "2026-03-31 08:45:00",
    "data_pool": "cephfs.data",
    "features": ["snapshot-clone", "snapshot-autoprotect"],
    "gid": 1000,
    "mode": 493,
    "mon_addrs": ["10.0.0.1:6789", "10.0.0.2:6789"],
    "mtime": "2026-03-31 09:00:00",
    "path": "/volumes/_nogroup/webapp/abc-123-uuid",
    "pool_namespace": "",
    "state": "complete",
    "type": "subvolume",
    "uid": 1000
}
```

## Checking Subvolume State

```bash
# The "state" field indicates health
# States: complete, snapshot-retained
ceph fs subvolume info cephfs webapp --format json | \
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d['state'])"
```

A state of `snapshot-retained` means the subvolume was deleted but has snapshots preventing full removal.

## Audit Script: Usage Across All Groups

```bash
#!/bin/bash
# audit-subvolumes.sh

FS="cephfs"

# Collect all groups including the default
GROUPS=$(ceph fs subvolumegroup ls ${FS} --format json | \
  python3 -c "import sys,json; [print(g['name']) for g in json.load(sys.stdin)]")
GROUPS="_nogroup ${GROUPS}"

printf "%-30s %-20s %10s %10s %8s\n" "SUBVOLUME" "GROUP" "QUOTA(GB)" "USED(GB)" "PCT%"
echo "$(printf '%0.s-' {1..80})"

for group in ${GROUPS}; do
  GROUP_OPT=""
  [ "${group}" != "_nogroup" ] && GROUP_OPT="--group_name ${group}"

  for sv in $(ceph fs subvolume ls ${FS} ${GROUP_OPT} --format json | \
    python3 -c "import sys,json; [print(s['name']) for s in json.load(sys.stdin)]"); do

    INFO=$(ceph fs subvolume info ${FS} ${sv} ${GROUP_OPT} --format json)
    QUOTA=$(echo "${INFO}" | python3 -c "import sys,json; d=json.load(sys.stdin); q=d.get('bytes_quota',0); print(q//1073741824 if q else 'unlim')")
    USED=$(echo "${INFO}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bytes_used',0)//1073741824)")
    PCT=$(echo "${INFO}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bytes_pcent','N/A'))")

    printf "%-30s %-20s %10s %10s %8s\n" "${sv}" "${group}" "${QUOTA}" "${USED}" "${PCT}"
  done
done
```

## Listing Snapshots for a Subvolume

```bash
# List snapshots
ceph fs subvolume snapshot ls cephfs webapp

# Get snapshot details
ceph fs subvolume snapshot info cephfs webapp daily-2026-03-31
```

## Checking the Mount Path

```bash
# Get the absolute CephFS path for a subvolume
ceph fs subvolume getpath cephfs webapp
# Output: /volumes/_nogroup/webapp/<uuid>
```

## Summary

The `ceph fs subvolume ls` and `ceph fs subvolume info` commands provide complete visibility into subvolume state, quota, usage, and data pool placement. Building audit scripts around the JSON output format makes it easy to generate usage reports, identify over-utilized subvolumes approaching their quotas, and find subvolumes in unexpected states such as `snapshot-retained` (deleted but holding snapshots). Regular inspection is essential for proactive capacity management in multi-tenant CephFS deployments.
