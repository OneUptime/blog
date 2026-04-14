# How to Configure CephFS Subvolume Quotas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, CephFS, Quota, Subvolume, Storage, Multi-Tenant

Description: Set, adjust, and monitor storage quotas on CephFS subvolumes to enforce capacity limits per tenant or application and prevent one consumer from filling the filesystem.

---

CephFS subvolume quotas enforce hard limits on how much data each subvolume can store. Without quotas, a single tenant can consume the entire filesystem. This guide covers setting quotas at creation time, resizing them, and monitoring usage.

## How CephFS Quotas Work

CephFS enforces quotas using extended attributes on directory inodes. Quota enforcement is cooperative and performed by the client (kernel client or FUSE/libcephfs), not the MDS. When a subvolume's quota is reached:
- Write operations return EDQUOT (disk quota exceeded)
- Existing data is not affected
- Reads and directory listings continue to work

Because enforcement is client-side, quotas are imprecise - writers may slightly exceed the limit before being stopped. Quotas apply to the bytes stored in the directory tree rooted at the subvolume path.

## Setting a Quota at Creation

```bash
# Create a subvolume with a 20 GB quota
ceph fs subvolume create cephfs webapp \
  --size 21474836480

# Create in a group with quota
ceph fs subvolume create cephfs logs \
  --group_name production \
  --size 10737418240
```

## Checking Current Quota and Usage

```bash
# Get full subvolume info including quota and used bytes
ceph fs subvolume info cephfs webapp

# The relevant fields in the output:
# "bytes_quota": 21474836480
# "bytes_used": 5368709120
# "bytes_pcent": "25.00"
```

## Resizing a Subvolume Quota

```bash
# Expand quota to 50 GB
ceph fs subvolume resize cephfs webapp 53687091200

# Shrink quota - by default this succeeds even if usage exceeds new size
# (the tenant will immediately be over-quota and new writes will be blocked)
ceph fs subvolume resize cephfs webapp 10737418240

# Prevent shrink if current usage exceeds the new size
ceph fs subvolume resize cephfs webapp 10737418240 --no_shrink
```

## Removing a Quota (Unlimited)

```bash
# Set quota to "infinite" to remove the limit
ceph fs subvolume resize cephfs webapp inf
# This removes the quota limit
```

## Setting Quota via Extended Attributes (Direct Mount)

If you have the filesystem mounted, you can inspect quotas directly:

```bash
# Mount the CephFS root
mount -t ceph mon1:6789:/ /mnt/cephfs -o name=admin,secret=<admin-key>

# Get the subvolume path
SUBVOL_PATH=$(ceph fs subvolume getpath cephfs webapp)

# Check quota xattr
getfattr -n ceph.quota.max_bytes /mnt/cephfs${SUBVOL_PATH}

# Set quota directly via xattr (50 GB)
setfattr -n ceph.quota.max_bytes -v 53687091200 /mnt/cephfs${SUBVOL_PATH}
```

## Monitoring Quota Usage Across All Subvolumes

```bash
#!/bin/bash
# quota-report.sh - Report quota usage for all subvolumes

FS="cephfs"
echo "Subvolume Quota Report - $(date)"
echo "=================================="

for sv in $(ceph fs subvolume ls ${FS} | python3 -c "import sys,json; [print(s['name']) for s in json.load(sys.stdin)]"); do
  INFO=$(ceph fs subvolume info ${FS} ${sv})
  USED=$(echo "${INFO}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bytes_used',0))")
  QUOTA=$(echo "${INFO}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bytes_quota','unlimited'))")
  PCT=$(echo "${INFO}" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('bytes_pcent','N/A'))")
  echo "${sv}: used=$(( USED / 1073741824 ))GB quota=$(( ${QUOTA:-0} / 1073741824 ))GB (${PCT}%)"
done
```

## Summary

CephFS subvolume quotas are configured at creation with `--size` or adjusted later with `ceph fs subvolume resize`. Quotas are enforced cooperatively by the client - once a tenant reaches their limit, writes return EDQUOT. The `ceph fs subvolume info` command shows current usage and percentage, making it straightforward to build monitoring scripts that alert before tenants hit their limits. Passing `inf` to the resize command removes the quota entirely for subvolumes that should have unrestricted access.
