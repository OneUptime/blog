# How to Fix OLD_CRUSH_TUNABLES Health Warnings

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Tunable, Troubleshooting

Description: Diagnose and resolve the Ceph OLD_CRUSH_TUNABLES health warning by upgrading your CRUSH tunable profile to the optimal settings for your client versions.

---

## Understanding the OLD_CRUSH_TUNABLES Warning

The `OLD_CRUSH_TUNABLES` health warning appears when your Ceph cluster's CRUSH map is using an outdated tunable profile that predates the current recommended minimum. This warning indicates that your cluster is using suboptimal data placement behavior that could lead to uneven data distribution, especially during OSD failures.

The warning does not indicate immediate data loss risk, but it does mean your cluster is not operating with the best available placement algorithm.

## Diagnosing the Warning

```bash
# Check the current health status
ceph health detail

# Example output:
# HEALTH_WARN: 1 crush map has legacy tunables
# [WRN] OLD_CRUSH_TUNABLES: crush map has legacy tunables
#   crush map has tunables that are older than luminous

# Show current tunable profile
ceph osd crush show-tunables

# Check which specific tunables are old
ceph osd crush show-tunables | grep -E "choose_total_tries|chooseleaf_stable|chooseleaf_vary_r"
```

## Understanding the Warning Threshold

Ceph monitors issue this warning when the CRUSH tunables are older than the threshold set by `mon_crush_min_required_version`:

```bash
# Check the minimum required version setting
ceph config get mon mon_crush_min_required_version

# Default is 'hammer' in modern Ceph versions (Nautilus and later)
```

## Resolving the Warning

The fix is to upgrade the CRUSH tunable profile. First, verify client compatibility:

```bash
# Check minimum client version
ceph osd dump | grep require_min_compat_client

# Check all connected client features
ceph features
```

Then apply the appropriate profile:

```bash
# For clusters with all modern clients (Luminous or later)
ceph osd crush tunables optimal

# For clusters with Jewel-era clients
ceph osd crush tunables jewel

# For maximum compatibility (resolves the default warning)
ceph osd crush tunables hammer

# Verify the warning is gone
ceph health detail
```

## Planned Migration During Maintenance

For production clusters, perform the change during a maintenance window:

```bash
#!/bin/bash
# Safe CRUSH tunable upgrade procedure

echo "Pausing data movement..."
ceph osd set norebalance
ceph osd set norecover

echo "Applying optimal tunables..."
ceph osd crush tunables optimal

echo "Checking health..."
ceph health detail

echo "Resuming data movement..."
ceph osd unset norecover
ceph osd unset norebalance

echo "Monitoring recovery..."
watch -n 10 ceph -s
```

## Estimating Data Movement

Before applying, estimate how many PGs will be remapped:

```bash
# Export the current CRUSH map
ceph osd getcrushmap -o crush-old.bin

# Apply the tunable change, export the new map, then revert
ceph osd crush tunables optimal
ceph osd getcrushmap -o crush-new.bin
ceph osd setcrushmap -i crush-old.bin  # Revert to original

# Compare mappings offline
crushtool -i crush-old.bin --test --rule 0 --num-rep 3 \
  --min-x 0 --max-x 10000 --show-mappings > old-mappings.txt

crushtool -i crush-new.bin --test --rule 0 --num-rep 3 \
  --min-x 0 --max-x 10000 --show-mappings > new-mappings.txt

diff old-mappings.txt new-mappings.txt | grep "^>" | wc -l
echo "PGs that will be remapped"
```

## Suppressing the Warning Temporarily

If you need more time before upgrading:

```bash
# Disable the legacy tunables warning
ceph config set mon mon_warn_on_legacy_crush_tunables false

# Note: This is a workaround only - upgrade tunables when possible
```

## Summary

The `OLD_CRUSH_TUNABLES` warning is resolved by upgrading the CRUSH tunable profile with `ceph osd crush tunables optimal`. Before doing so, verify client compatibility with `ceph features` and perform the change during a maintenance window with `norebalance` set to control data migration timing. The optimal profile enables all CRUSH improvements through the Jewel release, providing better distribution and less unnecessary remapping during OSD state changes.
