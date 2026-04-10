# How to Set CRUSH Tunable Profiles (Legacy, Argonaut, Bobtail, Firefly, Optimal)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Tunable, Storage

Description: Learn how to set Ceph CRUSH tunable profiles to upgrade from legacy behavior to optimal settings, and understand what each named profile configures.

---

## What are CRUSH Tunable Profiles

CRUSH tunable profiles are named presets that bundle multiple individual tunable values together. Instead of setting each tunable individually, you apply a profile name and Ceph configures all relevant tunables to match that profile's specification. Each profile corresponds to improvements introduced in a particular Ceph release.

Available profiles: `legacy`, `argonaut`, `bobtail`, `firefly`, `hammer`, `jewel`, `optimal`, `default`

## Checking the Current Profile

```bash
# Show all tunable values (profile name appears if it matches a preset)
ceph osd crush show-tunables

# Check for health warnings about outdated tunables
ceph health detail | grep -i tunable

# Example health warning:
# HEALTH_WARN: crush map has legacy tunables (sub-optimal, but older clients are still supported)
```

## Comparing Profile Settings

Each profile sets these key tunables:

```text
Profile    choose_local_tries  choose_local_fallback_tries  choose_total_tries  chooseleaf_descend_once  chooseleaf_vary_r  chooseleaf_stable  straw_calc_version
legacy     2                   5                            19                  0                        0                  0                  0
argonaut   2                   5                            19                  0                        0                  0                  0
bobtail    0                   0                            50                  1                        0                  0                  0
firefly    0                   0                            50                  1                        1                  0                  0
hammer     0                   0                            50                  1                        1                  0                  0
jewel      0                   0                            50                  1                        1                  1                  0
optimal    0                   0                            50                  1                        1                  1                  1
```

## Setting a Tunable Profile

```bash
# Upgrade to the optimal profile (recommended for modern clusters)
ceph osd crush tunables optimal

# Set a specific version profile
ceph osd crush tunables jewel

# Downgrade to legacy (not recommended, for compatibility testing only)
ceph osd crush tunables legacy

# Verify the change
ceph osd crush show-tunables
```

## Impact of Changing Profiles

Changing tunable profiles modifies the CRUSH algorithm and causes some PGs to be remapped:

```bash
# Predict which PGs will be remapped before applying
ceph osd getcrushmap -o crush-current.bin
crushtool -d crush-current.bin -o crush.txt

# Apply profile change in the text map
# (change tunable values to match target profile)
crushtool -c crush.txt -o crush-new.bin

# Compare mappings
crushtool -i crush-current.bin --test \
  --rule 0 --num-rep 3 \
  --min-x 0 --max-x 10000 \
  --show-statistics > before.txt

crushtool -i crush-new.bin --test \
  --rule 0 --num-rep 3 \
  --min-x 0 --max-x 10000 \
  --show-statistics > after.txt
```

## Upgrading Safely in Production

```bash
# Step 1: Pause data movement during the change
ceph osd set norebalance
ceph osd set norecover

# Step 2: Apply the optimal tunable profile
ceph osd crush tunables optimal

# Step 3: Check health
ceph health detail

# Step 4: Release the movement flags to start migration
ceph osd unset norecover
ceph osd unset norebalance

# Step 5: Monitor migration progress
watch -n 5 ceph -s
```

## Client Compatibility Considerations

Older clients may not support newer CRUSH tunable features:

```bash
# Check minimum client feature support in the cluster
ceph features

# Check for old client connections
ceph osd dump | grep "require_min_compat_client"

# View required minimum compatible client version
ceph osd dump | grep require_min_compat_client
```

The `optimal` profile requires clients from the Jewel release or later (v10.0.2+ / kernel v4.5+). If older clients connect, use the `hammer` profile instead.

## Summary

CRUSH tunable profiles provide a simple way to upgrade all related algorithm settings at once. Use `ceph osd crush tunables optimal` for new or modern clusters to get the best distribution behavior and minimal remapping during failures. Apply profile changes during maintenance windows using `norebalance` to control when migration occurs. Always verify client compatibility before moving to more aggressive profiles.
