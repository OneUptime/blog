# How to Create Custom CRUSH Rules for Mixed SSD/HDD Deployments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Device Class, Storage

Description: Create custom Ceph CRUSH rules for mixed SSD and HDD deployments, including tiered rules that place the primary replica on SSD and secondaries on HDD.

---

## Mixed Media Deployment Scenarios

A common Ceph deployment pattern combines SSDs and HDDs in the same cluster, using different storage tiers for different purposes:

- **SSD-only pools** - for IOPS-intensive workloads (databases, VM disks)
- **HDD-only pools** - for capacity-optimized workloads (backups, archives)
- **Hybrid rules** - primary on SSD for read performance, secondaries on HDD for cost efficiency

## Setting Up Device Classes

First, ensure all OSDs have correct device classes:

```bash
# View current device classes
ceph osd tree

# Assign classes if not auto-detected
for osd in 0 1 2; do
  ceph osd crush set-device-class ssd osd.$osd
done

for osd in 3 4 5 6 7 8; do
  ceph osd crush set-device-class hdd osd.$osd
done

# Verify
ceph osd crush class ls-osd ssd
ceph osd crush class ls-osd hdd
```

## Creating SSD-Only and HDD-Only Rules

```bash
# Create an SSD-only rule (best for latency-sensitive workloads)
ceph osd crush rule create-replicated ssd-rule default host ssd

# Create an HDD-only rule (best for high-capacity, cost-sensitive workloads)
ceph osd crush rule create-replicated hdd-rule default host hdd

# Verify the rules
ceph osd crush rule dump ssd-rule
ceph osd crush rule dump hdd-rule
```

## Creating a Hybrid SSD Primary + HDD Secondary Rule

For a pool where the primary replica should be on SSD but secondaries on HDD, use MSR-style CRUSH rules via the map:

```bash
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt
```

Add to `crush.txt`:

```text
rule hybrid-ssd-primary {
    id 15
    type replicated
    min_size 1
    max_size 10
    step take default class ssd
    step chooseleaf firstn 1 type host
    step emit
    step take default class hdd
    step chooseleaf firstn -1 type host
    step emit
}
```

The `firstn -1` means "choose (replication_factor - 1) replicas" - so with `size=3`, it places 1 on SSD and 2 on HDD.

```bash
crushtool -c crush.txt -o crush-new.bin
ceph osd setcrushmap -i crush-new.bin

# Verify the rule exists
ceph osd crush rule ls
```

## Applying Rules to Pools

```bash
# Fast pool for databases - SSD only
ceph osd pool create db-pool 128 128 replicated ssd-rule
ceph osd pool set db-pool size 3

# Cold storage pool - HDD only
ceph osd pool create archive-pool 64 64 replicated hdd-rule
ceph osd pool set archive-pool size 3

# Hot-warm pool - primary on SSD, secondaries on HDD
ceph osd pool create hot-warm-pool 64 64 replicated hybrid-ssd-primary
ceph osd pool set hot-warm-pool size 3

# Verify placements
ceph osd map db-pool testobj1
ceph osd map archive-pool testobj2
ceph osd map hot-warm-pool testobj3
```

## Rook Configuration for Mixed Media

In Rook, define separate pools for each tier:

```yaml
---
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: ssd-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  deviceClass: ssd
  replicated:
    size: 3
---
apiVersion: ceph.rook.io/v1
kind: CephBlockPool
metadata:
  name: hdd-pool
  namespace: rook-ceph
spec:
  failureDomain: host
  deviceClass: hdd
  replicated:
    size: 3
```

## Verifying Correct Placement

```bash
# Confirm OSD classes for objects in each pool
ceph osd map ssd-pool testobj | awk '{print $NF}' | tr -d '[]()' | tr ',' '\n' | \
  while read osd; do echo "osd.$osd: $(ceph osd tree | grep "osd.$osd" | awk '{print $2}')"; done
```

## Summary

Mixed SSD/HDD CRUSH rules enable tiered storage within a single Ceph cluster. Create device-class-specific rules with `ceph osd crush rule create-replicated`, use `deviceClass` in Rook pool specs for straightforward single-tier pools, and write custom MSR CRUSH rules for hybrid patterns like SSD primary with HDD secondaries. Always verify placement with `ceph osd map` to confirm objects land on the intended drive types.
