# Validation Summary: How to Understand CRUSH Map Structure (Topology, OSDs, Buckets, Rules)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Ceph (distributed storage system)
- CRUSH (Controlled Replication Under Scalable Hashing) algorithm
- Rook (Kubernetes storage orchestrator for Ceph)
- crushtool (CRUSH map manipulation CLI tool)

## Sources Consulted
- [Manually editing the CRUSH Map — Ceph Documentation (latest)](https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/) — verified CRUSH rule format including required `min_size` and `max_size` fields
- [crushtool man page — Ceph Documentation](https://docs.ceph.com/en/latest/man/8/crushtool/) — verified `--test` mode options; confirmed `--rule` is the correct flag (not `--pool`)
- [CRUSH Maps — Ceph Documentation (latest)](https://docs.ceph.com/en/latest/rados/operations/crush-map/) — verified bucket algorithm descriptions, straw vs straw2 behavior
- [CRUSH Maps — Ceph Documentation (Pacific)](https://docs.ceph.com/en/pacific/rados/operations/crush-map/) — cross-referenced bucket types and topology hierarchy
- [CRUSH Administration — Red Hat Ceph Storage 3](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/3/html/storage_strategies_guide/crush_administration) — verified straw2 improvements over straw regarding weight change behavior

## Issues Found

### 1. Missing `min_size` and `max_size` in CRUSH rule definitions
**What was wrong:** Both the decompiled CRUSH map example and the "Understanding CRUSH Rules" section omitted the `min_size` and `max_size` fields from the rule definition. These are required fields in the decompiled CRUSH map text format — `crushtool -d` always outputs them, and `crushtool -c` requires them to compile a map.

**What was changed:** Added `min_size 1` and `max_size 10` to both rule blocks (the decompiled map example and the annotated rule explanation).

**Why:** Without these fields, the example decompiled map is not representative of actual `crushtool -d` output, and a reader who tried to compile the example text back to binary would encounter errors.

### 2. Incorrect `--pool` flag in `crushtool --test` command
**What was wrong:** The command `crushtool -i crush-new.bin --test --num-rep=3 --pool=1 --min-x=0 --max-x=100` used `--pool=1`, which is not a valid option for `crushtool --test`. The crushtool operates on CRUSH maps without knowledge of Ceph pools; it selects rules by rule ID.

**What was changed:** Changed `--pool=1` to `--rule=0` (matching the rule ID 0 defined in the example CRUSH map).

**Why:** The official crushtool documentation and all examples use `--rule N` to specify which CRUSH rule to test. Using `--pool` would result in an unrecognized option error.

### 3. Misleading description of the `straw` bucket algorithm
**What was wrong:** The post described the straw algorithm as having "independent weighting; handles weight changes well." According to official Ceph documentation, straw actually introduces "suboptimal reorganization behavior when the contents of a bucket change due to an addition, a removal, or the re-weighting of an item." The straw2 algorithm was specifically created to fix this deficiency.

**What was changed:** Changed the straw description from "independent weighting; handles weight changes well" to "weighted straw-draw; suboptimal data movement on weight changes."

**Why:** The original description contradicted the reason straw2 exists. If straw handled weight changes well, there would be no motivation for straw2. The corrected description accurately reflects the documented behavior and makes the straw-to-straw2 improvement clear.

## Review Notes
- The CRUSH acronym expansion ("Controlled Replication Under Scalable Hashing") is correct.
- The default bucket type hierarchy (type 0 osd through type 11 root) matches the standard Ceph defaults.
- The `chooseleaf firstn 0 type host` explanation is accurate — count of 0 means use the pool's replication factor.
- The `ceph osd crush dump`, `ceph osd getcrushmap`, and `ceph osd setcrushmap` commands are all correct.
- The `crushtool -c` (compile) and `crushtool -d` (decompile) flag usage is correct.
- Bucket negative ID convention (e.g., `id -1`, `id -2`) is correctly demonstrated.
- The `hash 0` in bucket definitions refers to the rjenkins1 hash function, which is the only currently supported option — this is correct.
