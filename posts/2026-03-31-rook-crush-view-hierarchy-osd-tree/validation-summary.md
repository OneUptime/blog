# Validation Summary: How to View the CRUSH Hierarchy with ceph osd tree

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (CRUSH map, OSD tree, balancer, CRUSH dump)
- Rook (Ceph operator for Kubernetes, context for the post)
- Bash / shell utilities (awk, json.tool)

## Sources Consulted
- Ceph official documentation: CRUSH map management and `ceph osd` CLI reference (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph CLI reference for `ceph osd tree`, `ceph osd find`, `ceph osd df`, `ceph osd map` (https://docs.ceph.com/en/latest/man/8/ceph/)
- Ceph CRUSH hierarchy and bucket types documentation (https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/)

## Issues Found

1. **`ceph osd find` syntax was incorrect**: The post used `ceph osd find osd.2` (and similarly for osd.5 and osd.8). The `ceph osd find` command expects a plain numeric OSD ID, not the `osd.N` format. Fixed to `ceph osd find 2`, `ceph osd find 5`, `ceph osd find 8`.

2. **"positive IDs are OSDs" was inaccurate**: The column meanings section stated "positive IDs are OSDs", but OSD 0 (shown in the example) has ID 0, which is not positive. Fixed to "non-negative IDs (0 and above) are OSDs".

3. **Bucket weights in example output did not sum correctly**: The example showed host node-01 with weight 5.000 but its three OSDs only summed to 3.000 (1.0 + 1.0 + 1.0). Similarly, node-02 showed weight 5.000 but its OSDs summed to 3.000 (1.0 + 2.0). In Ceph, bucket weights are the sum of their children's weights. Fixed the example so all bucket weights are consistent sums: node-01=3.000, node-02=3.000, rack1=6.000, dc1=6.000, root=6.000.

## Review Notes
- The awk one-liner for filtering a specific host subtree (line 59) works but is fragile and may break on non-standard tree indentation. This is a reasonable shell trick and not incorrect, so no change was made.
- The `ceph osd df` awk filter referencing column `$6` for usage percentage may vary across Ceph versions (the column position of %USE has shifted in some releases). The approach is correct in principle.
- All other commands (`ceph osd tree`, `ceph osd tree down/up`, `ceph osd tree -f json`, `ceph osd df tree`, `ceph balancer eval`, `ceph osd crush tree --show-shadow`, `ceph osd crush dump`, `ceph osd map`, `ceph osd tree -f json-pretty`) are correct and current.
