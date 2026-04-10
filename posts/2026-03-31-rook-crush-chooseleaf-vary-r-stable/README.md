# How to Configure chooseleaf_vary_r and chooseleaf_stable Tunables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Tunable, Storage

Description: Learn how to configure the Ceph CRUSH tunables chooseleaf_vary_r and chooseleaf_stable to reduce unnecessary PG remapping and improve data distribution stability.

---

## Why These Tunables Matter

Two CRUSH tunables have an outsized impact on cluster stability during OSD failures:

- **chooseleaf_vary_r** - fixes poor data distribution when OSDs fail in clusters using chooseleaf
- **chooseleaf_stable** - prevents unnecessary PG remapping when unrelated OSDs in the same bucket change state

Both were introduced as optional improvements before becoming defaults in the Firefly and Jewel releases respectively. Modern clusters using the `optimal` tunable profile have both enabled by default, but legacy clusters upgraded from older versions may not.

## Checking Current Values

```bash
# Show all CRUSH tunable values
ceph osd crush show-tunables

# Check specific tunables
ceph osd crush show-tunables | grep -E "chooseleaf_vary_r|chooseleaf_stable"
```

Expected values for a modern cluster:

```text
chooseleaf_vary_r: 1
chooseleaf_stable: 1
```

If either shows `0`, you should plan to update them.

## Understanding chooseleaf_vary_r

### The Problem Without It

When `chooseleaf_vary_r=0` (legacy behavior), the chooseleaf algorithm starts from the same seed position for all replicas. When an OSD fails, the algorithm's collision avoidance produces a very uneven distribution across the remaining OSDs - some OSDs become overloaded while others sit underutilized.

### The Fix

With `chooseleaf_vary_r=1`, Ceph varies the starting seed by replica number. This produces more uniform distribution even when failure avoidance kicks in:

```bash
# Enable chooseleaf_vary_r (Firefly is the minimum profile that sets it to 1)
ceph osd crush tunables firefly

# Or set just this tunable
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt
# Edit crush.txt: change chooseleaf_vary_r from 0 to 1
crushtool -c crush.txt -o crush-new.bin
ceph osd setcrushmap -i crush-new.bin
```

## Understanding chooseleaf_stable

### The Problem Without It

When `chooseleaf_stable=0`, any change to an OSD within a bucket (going up or down) causes Ceph to re-evaluate chooseleaf for ALL PGs in that bucket, even PGs that don't use the changed OSD. This creates a storm of unnecessary remapping and data movement.

### The Fix

With `chooseleaf_stable=1`, Ceph stabilizes the chooseleaf descent - only PGs that actually used the changed OSD are remapped:

```bash
# Enable chooseleaf_stable (requires Jewel or later clients)
ceph osd crush tunables jewel

# Or apply both improvements at once with optimal
ceph osd crush tunables optimal

# Verify
ceph osd crush show-tunables | grep -E "chooseleaf_vary_r|chooseleaf_stable"
```

## Impact of Changing These Tunables

Changing `chooseleaf_vary_r` or `chooseleaf_stable` modifies the CRUSH algorithm and will cause some PGs to be remapped:

```bash
# Check how many PGs would be affected before changing
crushtool -i crush.bin --test \
  --rule 0 --num-rep 3 \
  --min-x 0 --max-x 10000 \
  --show-statistics > /tmp/before.txt

# After changing tunables, compare
crushtool -i crush-new.bin --test \
  --rule 0 --num-rep 3 \
  --min-x 0 --max-x 10000 \
  --show-statistics > /tmp/after.txt

# Check percentage of remapped PGs
diff /tmp/before.txt /tmp/after.txt
```

## Applying Tunables Safely

For production clusters, apply tunable changes during a maintenance window:

```bash
# 1. Set norebalance to delay data movement
ceph osd set norebalance

# 2. Apply the tunable change
ceph osd crush tunables optimal

# 3. Verify the change
ceph osd crush show-tunables | grep -E "vary_r|stable"

# 4. Release norebalance to allow migration
ceph osd unset norebalance

# 5. Monitor recovery
watch -n 5 ceph -s
```

## Summary

`chooseleaf_vary_r=1` improves OSD selection distribution when failures occur, and `chooseleaf_stable=1` prevents unnecessary PG remapping cascades during OSD state changes. Both are included in the `optimal` tunable profile. Legacy clusters should be migrated to the optimal profile during a planned maintenance window, using `norebalance` to control when the resulting data movement occurs.
