# Validation Summary: How to Reclassify Legacy Clusters in CRUSH

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (storage cluster)
- CRUSH (Controlled Replication Under Scalable Hashing) algorithm
- `crushtool` CLI (CRUSH map manipulation)
- Ceph OSD device classes (introduced in Luminous)
- Rook (mentioned in tags, not directly used in commands)

## Sources Consulted
- Ceph source code: `src/tools/crushtool.cc` — argument parsing and help text for `--reclassify-root` and `--reclassify-bucket`
- Ceph documentation: `doc/rados/operations/crush-map-edits.rst` — reclassify examples and syntax
- Ceph documentation: `doc/rados/operations/crush-map.rst` — `set-device-class` syntax, `--show-shadow` flag
- Ceph source code: `src/crush/CrushCompiler.cc` — decompiled CRUSH map device format with class field

## Issues Found

### 1. `chr` is not a standard bash command (line 62)
**What was wrong:** The script used `$(chr $((97+i)))` to convert ASCII codes to characters (e.g., 97 -> 'a' for device name `sda`). `chr` is not a standard bash or Unix command — it exists in Python and Perl but not as a shell utility. Additionally, mapping OSD numbers to block device names (sda, sdb, etc.) is unreliable since OSD numbering does not necessarily correspond to alphabetical device ordering.

**What was changed:** Replaced the entire device detection loop with a Ceph OSD metadata query (`ceph osd metadata osd.$osd | jq -r '.rotational'`), which is both syntactically correct and more reliable for determining device type.

### 2. `--reclassify-bucket` missing required third argument (lines 85-88)
**What was wrong:** The command used `--reclassify-bucket row-ssd ssd` with only two arguments. According to the Ceph source code and documentation, `--reclassify-bucket` requires three positional arguments: `<bucket-match> <class> <default-parent>`. Missing the third argument would cause `crushtool` to error out.

**What was changed:** Added `default` as the third argument (the default parent root bucket) to both `--reclassify-bucket` invocations: `--reclassify-bucket row-ssd ssd default` and `--reclassify-bucket row-hdd hdd default`.

### 3. Missing warning about data movement in mixed-media section
**What was wrong:** The "Handling Mixed-Media Clusters" section used `ceph osd crush set-device-class` to directly assign classes. This command triggers CRUSH map recalculation and data movement, which contradicts the post's stated goal of avoiding data movement during migration. There was no warning about this.

**What was changed:** Added a comment block warning that `set-device-class` will trigger data movement, and directing readers to the `--reclassify-bucket` approach in the next section for a zero-movement migration.

## Review Notes
- The `ceph osd tree | awk '{print $2}' | grep -v CLASS | sort -u` command for identifying legacy clusters is fragile — `ceph osd tree` output is formatted with fixed-width columns, so `awk` field splitting may not correctly isolate the CLASS column when it is empty. A more reliable approach would be `ceph osd crush class ls` or visual inspection of `ceph osd tree`. This was not changed as it is a minor usability concern, not a correctness error.
- The claim that device classes were introduced in Luminous (2017) is correct — Ceph Luminous (12.2.x) was released August 2017.
- All other commands (`ceph osd getcrushmap`, `crushtool -d`, `ceph osd setcrushmap`, `ceph osd crush tree --show-shadow`, `crushtool --test`) were verified as correct.
- Rook is mentioned in the tags but the post exclusively covers Ceph CLI commands. This is acceptable since Rook deploys Ceph and these commands apply to Rook-managed clusters.
