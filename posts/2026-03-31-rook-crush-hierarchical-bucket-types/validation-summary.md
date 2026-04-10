# Validation Summary: How to Create Hierarchical Bucket Types in CRUSH Maps

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH algorithm, CRUSH maps)
- Rook (Ceph orchestrator for Kubernetes)
- crushtool (CRUSH map compilation/decompilation utility)
- ceph CLI (OSD and pool management commands)

## Sources Consulted
- Ceph official documentation: CRUSH Maps — bucket types, hierarchy, and default type IDs (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: CRUSH map rules syntax — step take, chooseleaf, firstn, emit (https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/)
- Ceph official documentation: crushtool man page — -d (decompile), -c (compile) flags (https://docs.ceph.com/en/latest/man/8/crushtool/)
- Ceph official documentation: ceph osd crush CLI — add-bucket, move subcommands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Ceph official documentation: pool operations — crush_rule pool setting (https://docs.ceph.com/en/latest/rados/operations/pools/)

## Issues Found
No technical issues found.

## Review Notes
- The custom bucket types `floor` (type 12) and `building` (type 13) are assigned IDs above `root` (type 11). This is technically valid since the actual hierarchy is determined by parent-child bucket relationships, not type IDs. However, readers should understand that type IDs are conventions for ordering; `root` does not need to have the highest type ID to function as the top-level entry point for CRUSH rules.
- The CRUSH rule definition is shown in decompiled text format, but the post does not explicitly restate the compile-and-apply steps (`crushtool -c` / `ceph osd setcrushmap -i`) before the `ceph osd pool set` command. Readers following step-by-step should understand they need to add the rule to the CRUSH map text, recompile, and apply before referencing it. The compile steps are shown earlier in the post, so this is an implicit workflow assumption rather than an error.
- The `ceph osd pool set <pool> crush_rule <name>` command accepts rule names (not just IDs) starting from Ceph Luminous and later, which covers all currently supported releases.
