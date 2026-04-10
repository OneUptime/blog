# How to Create Dedicated CRUSH Rules for Cache Pool Drives in Ceph

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, CRUSH, CacheTiering, Storage

Description: Learn how to create dedicated CRUSH rules in Ceph that pin cache pools to specific SSD or NVMe devices, ensuring cache data never lands on slow HDD storage.

---

When configuring cache tiering in Ceph, you need dedicated CRUSH rules that direct cache pool data exclusively to fast storage devices (SSD or NVMe). Without dedicated rules, RADOS might place cache tier data on HDD OSDs, defeating the purpose of the tier entirely.

## Why Dedicated CRUSH Rules Matter

By default, new pools use the default CRUSH rule which distributes data across all OSD devices regardless of type. A cache pool on HDD storage provides no performance benefit. Dedicated CRUSH rules ensure strict placement of cache data on fast devices.

## Setting Up Device Classes

Ceph BlueStore automatically classifies OSD devices based on rotational speed:

```bash
# View current device class assignments
ceph osd crush tree --show-shadow
```

```text
ID   CLASS   WEIGHT    TYPE NAME
-1           100.0 TiB root default
-2   hdd      80.0 TiB   host node1
  0  hdd      10.0 TiB     osd.0
  1  hdd      10.0 TiB     osd.1
-4   ssd      20.0 TiB   host node2
  4  ssd      10.0 TiB     osd.4
  5  ssd      10.0 TiB     osd.5
```

If device classes are missing or incorrect, set them manually:

```bash
ceph osd crush rm-device-class osd.4
ceph osd crush set-device-class ssd osd.4
ceph osd crush set-device-class nvme osd.8
```

## Creating a CRUSH Rule for SSDs Only

Using the device class feature to create an SSD-only rule:

```bash
ceph osd crush rule create-replicated ssd-cache-rule default host ssd
```

Parameters:
- `ssd-cache-rule` - rule name
- `default` - root bucket to start from
- `host` - failure domain (one replica per host)
- `ssd` - device class to restrict to

Verify the rule was created:

```bash
ceph osd crush rule ls
ceph osd crush rule dump ssd-cache-rule
```

## Creating a CRUSH Rule for NVMe Only

For highest-performance cache using NVMe drives:

```bash
ceph osd crush rule create-replicated nvme-cache-rule default host nvme
```

## Applying the CRUSH Rule to the Cache Pool

```bash
# Create the cache pool
ceph osd pool create ssd-cache-pool 64 64 replicated

# Apply the SSD-only CRUSH rule
ceph osd pool set ssd-cache-pool crush_rule ssd-cache-rule

# Verify placement
ceph osd pool get ssd-cache-pool crush_rule
```

Expected:

```text
crush_rule: ssd-cache-rule
```

## Verifying OSD Placement After Pool Creation

After writing data to the cache pool, confirm it lands on SSD OSDs:

```bash
ceph pg ls-by-pool ssd-cache-pool | head -5 | while read pg rest; do
  ceph pg $pg query 2>/dev/null | python3 -c "
import json, sys
d = json.load(sys.stdin)
acting = d.get('acting', [])
print('PG acting OSDs:', acting)
" 2>/dev/null
done
```

Cross-reference the OSD IDs with the CRUSH tree to confirm they are SSD class.

## Rook Integration

In Rook, the CRUSH rule for a pool is typically managed via the `deviceClass` field:

```yaml
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-cache-pool
  namespace: rook-ceph
spec:
  replicated:
    size: 2
    requireSafeReplicaSize: true
  deviceClass: ssd   # Rook creates a CRUSH rule targeting SSD OSDs
```

Rook automatically creates a CRUSH rule named after the pool and device class (e.g., `ssd-cache-pool-ssd`) and applies it to the pool.

## Confirming No HDD Data in Cache Pool

After some time running the cache tier, verify no PG primaries landed on HDD OSDs:

```bash
for osd in $(ceph osd crush tree --format json | python3 -c "
import json, sys
tree = json.load(sys.stdin)
for n in tree['nodes']:
    if n.get('device_class') == 'hdd':
        print(n['id'])
"); do
  echo "HDD OSD $osd PGs: $(ceph pg ls-by-osd $osd | grep ssd-cache-pool | wc -l)"
done
```

All counts should be 0 for HDD OSDs in the cache pool.

## Summary

Dedicated CRUSH rules ensure cache pool data is placed exclusively on fast SSD or NVMe devices. Use `ceph osd crush rule create-replicated` with the device class parameter to create these rules. Apply them to cache pools with `ceph osd pool set crush_rule`. In Rook, the `deviceClass` field in CephBlockPool specs handles this automatically. Verifying actual OSD placement after pool creation confirms the CRUSH rule is working as intended.
