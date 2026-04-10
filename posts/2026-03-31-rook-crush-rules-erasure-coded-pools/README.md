# How to Create CRUSH Rules for Erasure Coded Pools

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Erasure Coding, Storage

Description: Learn how to create CRUSH rules specifically designed for Ceph erasure coded pools, including failure domain selection and device class targeting.

---

## CRUSH Rules for Erasure Coded Pools

Erasure coded pools require CRUSH rules of type `erasure` (type 3), which differ from replicated rules. An erasure coded pool with a `k+m` profile needs `k+m` distinct OSDs - one per chunk. The CRUSH rule must be able to select enough distinct failure domain members to satisfy this requirement.

Unlike replicated rules which use `chooseleaf firstn`, erasure coded rules use `chooseleaf indep`. With `indep`, each chunk position is mapped independently, so an OSD failure only causes the affected chunk to be remapped rather than shifting all subsequent placements.

## Viewing Existing Erasure Rules

```bash
# List rules and identify type 3 (erasure) rules
ceph osd crush rule dump | python3 -m json.tool | grep -A20 '"type": 3'

# List erasure coding profiles
ceph osd erasure-code-profile ls
ceph osd erasure-code-profile get default
```

## Creating an Erasure Profile with a Custom CRUSH Rule

The recommended approach is to create the erasure profile and CRUSH rule together:

```bash
# Create an erasure code profile with 4+2 (4 data, 2 parity chunks)
ceph osd erasure-code-profile set ec-4-2-profile \
  k=4 \
  m=2 \
  crush-failure-domain=host \
  crush-device-class=hdd

# Verify the profile
ceph osd erasure-code-profile get ec-4-2-profile
```

Ceph automatically creates a matching CRUSH rule when you create a pool using this profile.

## Creating the Erasure Pool

```bash
# Create an erasure coded pool using the profile
ceph osd pool create ec-pool 64 64 erasure ec-4-2-profile

# Verify the pool and its CRUSH rule
ceph osd pool get ec-pool all | grep crush
ceph osd crush rule dump | grep -A5 ec-pool
```

## Creating a Custom Erasure CRUSH Rule

For advanced scenarios, create the CRUSH rule manually:

```bash
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt
```

Add to `crush.txt`:

```text
rule ec-rack-rule {
    id 6
    type erasure
    step take default class ssd
    step chooseleaf indep 0 type rack
    step emit
}
```

Key differences from replicated rules:
- `type erasure` instead of `type replicated`
- `chooseleaf indep` instead of `chooseleaf firstn` - `indep` handles failures more gracefully in erasure coded pools

```bash
crushtool -c crush.txt -o crush-new.bin
ceph osd setcrushmap -i crush-new.bin
```

## Applying the Custom Rule to an Erasure Pool

```bash
# Create an erasure profile referencing the custom rule
ceph osd erasure-code-profile set ec-custom-profile \
  k=4 \
  m=2 \
  crush-root=default \
  crush-failure-domain=rack \
  crush-device-class=ssd

# Create the pool with the profile
ceph osd pool create ec-custom-pool 128 128 erasure ec-custom-profile
```

## Verifying Placement

```bash
# Map an object to see which OSDs receive chunks
ceph osd map ec-pool testobject

# Output shows k+m OSDs:
# -> up ([0,2,4,6,8,10], p0) acting ([0,2,4,6,8,10], p0)

# Verify each OSD is on a different rack
for osd in 0 2 4 6 8 10; do
  ceph osd find osd.$osd | grep rack
done
```

## Summary

CRUSH rules for erasure coded pools use `type erasure` and the `chooseleaf indep` operation to correctly handle chunk placement. The easiest approach is to set `crush-failure-domain` and `crush-device-class` in an erasure code profile and let Ceph generate the rule automatically. For custom placement logic, edit the CRUSH map directly and use `indep` mode to ensure erasure coded recovery works correctly across failure domains.
