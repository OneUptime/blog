# How to Check Client Compatibility with CRUSH Tunables

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Tunable, Compatibility

Description: Learn how to check whether your Ceph clients support the CRUSH tunables currently configured in your cluster to safely upgrade to modern profiles.

---

## Why Client Compatibility Matters for CRUSH Tunables

When you change CRUSH tunable profiles, the CRUSH algorithm changes. Older clients that do not understand newer tunables cannot correctly compute data placement - they may attempt to read or write data from the wrong OSDs. Before upgrading CRUSH tunables, you must verify that all connected clients support the target profile.

## Checking Current Minimum Client Version

```bash
# Check the minimum required client compatibility for the cluster
ceph osd dump | grep "require_min_compat_client"

# Example output:
# require_min_compat_client luminous

# Show monitor map including minimum monitor release version
ceph mon dump | grep min_mon_release

# Check the feature set requirement
ceph features
```

## Understanding Feature Flags

Different CRUSH tunable improvements require specific feature flags in clients:

```text
CRUSH_TUNABLES:   legacy/argonaut tunables
CRUSH_TUNABLES2:  bobtail tunables (chooseleaf_descend_once)
CRUSH_TUNABLES3:  firefly tunables (straw_calc_version=1)
CRUSH_TUNABLES5:  jewel tunables (chooseleaf_stable)
CRUSH_CHOOSE_ARGS: per-pool weight sets
```

```bash
# Show numeric feature flags
ceph features

# Show monitor quorum status
ceph mon stat
```

## Identifying Connected Old Clients

```bash
# Check for clients with old feature sets
ceph osd dump | grep min_compat_client

# List active sessions and their features
ceph daemon mon.$(hostname) sessions | python3 -m json.tool | grep -A3 "features"

# Check which clients are currently connected
ceph tell mon.* sessions 2>/dev/null | grep -v "^$"
```

## Mapping Profiles to Required Client Versions

| Profile | Minimum Client Release |
|---|---|
| legacy | Very old (pre-Dumpling) |
| argonaut | Argonaut (0.48) |
| bobtail | Bobtail (0.56) |
| firefly | Firefly (0.80) |
| hammer | Hammer (0.94) |
| jewel | Jewel (10.x) |
| optimal | Jewel (10.2.x) or later |

## Testing Before Applying

Use crushtool to simulate the effect on connected clients:

```bash
# Export current map
ceph osd getcrushmap -o crush-current.bin
crushtool -d crush-current.bin -o crush-current.txt

# Create a version with new tunables
cp crush-current.txt crush-new.txt
# Edit crush-new.txt to use target tunable values

crushtool -c crush-new.txt -o crush-new.bin

# Test how many PGs would remap
crushtool -i crush-current.bin --test \
  --rule 0 --num-rep 3 \
  --min-x 0 --max-x 10000 > before.txt

crushtool -i crush-new.bin --test \
  --rule 0 --num-rep 3 \
  --min-x 0 --max-x 10000 > after.txt

# Count changed mappings
diff before.txt after.txt | grep "^>" | wc -l
```

## Setting the Minimum Client Version

If you are upgrading all clients and want to enforce the minimum:

```bash
# Set minimum client version to luminous (prevents older clients from connecting)
ceph osd set-require-min-compat-client luminous

# Or for nautilus
ceph osd set-require-min-compat-client nautilus

# Check the current setting
ceph osd dump | grep require_min_compat_client
```

## Summary

Before upgrading CRUSH tunable profiles, check `ceph osd dump | grep require_min_compat_client` to understand the current minimum, and ensure all clients connecting to the cluster support the target profile's feature flags. Use `ceph osd set-require-min-compat-client` to enforce the minimum after upgrading all clients. This prevents split-brain scenarios where old clients compute incorrect PG locations after a tunable change.
