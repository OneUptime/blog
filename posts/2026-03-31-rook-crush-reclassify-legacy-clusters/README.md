# How to Reclassify Legacy Clusters in CRUSH

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, CRUSH, Migration, Storage

Description: Learn how to use Ceph's CRUSH reclassify tools to migrate legacy clusters that lack device classes to a modern class-aware hierarchy without data movement.

---

## The Legacy Cluster Problem

Ceph clusters created before the Luminous release (2017) or upgraded without device class migration may have a CRUSH hierarchy that does not use device classes. These clusters have OSDs with no class assigned, which prevents you from using class-targeted pool rules for tiered storage.

Naively assigning classes after the fact causes data movement because the shadow hierarchies change bucket structure. The `crushtool --reclassify` feature addresses this by migrating the hierarchy in a way that preserves existing data placement.

## Identifying a Legacy Hierarchy

```bash
# Check if OSDs have device classes assigned
ceph osd tree | awk '{print $2}' | grep -v CLASS | sort -u

# A legacy cluster shows empty class column:
# ID  CLASS  WEIGHT  TYPE NAME
# -1         10.000  root default
#  0         1.000       osd.0     <- no class!
#  1         1.000       osd.1

# Check the CRUSH map for class entries
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt
grep "^device" crush.txt
# Legacy: device 0 osd.0   <- no class field
# Modern: device 0 osd.0 class hdd
```

## Using crushtool --reclassify

The `--reclassify` option analyzes the existing CRUSH map and generates a new map that introduces device classes without changing data placement:

```bash
# Export the current CRUSH map
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt

# Reclassify the CRUSH map - specify the target class
# The tool reads class info from the OSD metadata
crushtool -i crush.bin \
  --reclassify-root default hdd \
  -o crush-reclassified.bin
```

This command takes all OSDs under the `default` root and assigns them the `hdd` class while generating the shadow hierarchy in a way that matches the current OSD layout - preventing data movement.

## Handling Mixed-Media Clusters

For clusters with both HDDs and SSDs that were deployed without classes:

```bash
# First, check which OSDs are rotational via Ceph OSD metadata
for osd in $(ceph osd ls); do
  rotational=$(ceph osd metadata osd.$osd | jq -r '.rotational')
  echo "osd.$osd rotational=$rotational"
done

# Note: Using set-device-class directly WILL trigger data movement.
# For a zero-movement approach with mixed media, organize OSDs into
# separate subtrees and use --reclassify-bucket (see next section).

# Assign classes to OSDs using ceph osd crush set-device-class
for osd in 0 1 2 3; do
  ceph osd crush set-device-class hdd osd.$osd
done
for osd in 4 5 6; do
  ceph osd crush set-device-class ssd osd.$osd
done
```

## Using --reclassify-bucket for Subtree Migration

If your legacy cluster has separate subtrees for different media types:

```bash
# Export and decompile
ceph osd getcrushmap -o crush.bin
crushtool -d crush.bin -o crush.txt

# Reclassify specific buckets
crushtool -i crush.bin \
  --reclassify-bucket row-ssd ssd default \
  --reclassify-bucket row-hdd hdd default \
  -o crush-reclassified.bin

# Test the reclassified map
crushtool -i crush-reclassified.bin --test \
  --rule 0 --num-rep 3 --min-x 0 --max-x 1000 \
  --show-mappings | head -20

# Compare with original to verify no remapping
crushtool -i crush.bin --test \
  --rule 0 --num-rep 3 --min-x 0 --max-x 1000 \
  --show-mappings | head -20
```

## Applying the Reclassified Map

Only apply if the test shows no PG remapping:

```bash
# Apply the reclassified CRUSH map
ceph osd setcrushmap -i crush-reclassified.bin

# Verify device classes are now present
ceph osd tree | head -20

# Confirm shadow hierarchies were created
ceph osd crush tree --show-shadow | grep "~hdd"
```

## Summary

Reclassifying a legacy Ceph cluster to use device classes requires careful use of `crushtool --reclassify-root` or `--reclassify-bucket` to introduce class assignments without triggering data movement. Always test the reclassified map against the original to confirm PG mappings are unchanged before applying it to production. After reclassification, you can create class-targeted CRUSH rules and pools for tiered storage.
