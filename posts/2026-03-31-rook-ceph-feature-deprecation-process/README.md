# How to Understand Ceph Feature Deprecation Process

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ceph, Rook, Deprecation, Upgrade, Release

Description: Navigate Ceph's feature deprecation process by identifying deprecated features in release notes, understanding the removal timeline, and migrating before cutoff dates.

---

Ceph follows a structured deprecation process to give administrators time to migrate away from features before they are removed. Understanding this process prevents surprise breakage during upgrades.

## How Ceph Deprecates Features

The typical deprecation lifecycle has three phases:

1. **Deprecated**: Feature still works, a warning is emitted. Announced in release notes.
2. **Removed from default**: Feature must be explicitly enabled to use. Usually one or two releases after initial deprecation.
3. **Removed entirely**: Feature is gone. Attempting to use it causes an error.

## Finding Deprecated Features in Release Notes

Always read the full release notes before upgrading:

```bash
# View Reef (18.x) release notes
open https://docs.ceph.com/en/latest/releases/reef/

# Search for deprecation notices
curl -s https://raw.githubusercontent.com/ceph/ceph/main/doc/releases/reef.rst | grep -i -A 3 "deprecat"
```

## Checking Your Cluster for Deprecated Flags

Some deprecated features generate health warnings:

```bash
ceph health detail | grep -i "deprecat\|WARN\|obsolete"
```

If you see `HEALTH_WARN: ... deprecated`, identify the feature and plan migration.

## Common Recent Deprecations

### FileStore (removed in Reef)

FileStore was deprecated in Nautilus and removed in Reef. Any OSD still on FileStore must be migrated to BlueStore before upgrading:

```bash
# Check OSD backend type
ceph osd metadata | python3 -c "
import sys, json
data = json.load(sys.stdin)
for osd in data:
    print(osd.get('id'), osd.get('osd_objectstore'))
"
```

### Legacy CephFS layouts

```bash
# Check for legacy layout usage
ceph fs status
ceph tell mds.* client ls
```

## Migrating OSDs from FileStore to BlueStore

```bash
# Mark the OSD out
ceph osd out osd.N

# Wait for data to fully replicate away
while ! ceph osd safe-to-destroy osd.N ; do sleep 60 ; done

# Stop the OSD
systemctl stop ceph-osd@N

# Destroy the old FileStore OSD (preserves the ID for reuse)
ceph osd destroy N --yes-i-really-mean-it

# Zap the device
ceph-volume lvm zap /dev/sdX

# Recreate as BlueStore
ceph-volume lvm create --bluestore --data /dev/sdX --osd-id N
```

## Setting Up Alerts for Deprecation Warnings

Add a Prometheus alerting rule:

```yaml
groups:
- name: ceph-deprecation
  rules:
  - alert: CephDeprecatedFeatureActive
    expr: ceph_health_detail{name=~".*DEPRECATED.*"} == 1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "Ceph cluster is using a deprecated feature"
```

## Summary

Ceph's deprecation process provides at least one full major release cycle as a warning period before removing features. Reviewing release notes before every upgrade, checking `ceph health detail` for deprecation warnings, and following the documented migration path for deprecated features ensures you never encounter a removal as a surprise during an upgrade.
