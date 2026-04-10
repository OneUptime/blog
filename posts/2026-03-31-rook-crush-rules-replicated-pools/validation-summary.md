# Validation Summary: How to Create CRUSH Rules for Replicated Pools

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (CRUSH map, OSD management, pool management)
- Rook (Ceph operator for Kubernetes)
- crushtool (CRUSH map compilation and testing utility)

## Sources Consulted
- [CRUSH Maps - Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- [Manually Editing the CRUSH Map - Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/crush-map-edits/)
- [crushtool man page - Ceph Documentation](https://docs.ceph.com/en/latest/man/8/crushtool/)
- [Pools - Ceph Documentation](https://docs.ceph.com/en/latest/rados/operations/pools/)
- [ceph man page - Ceph Documentation](https://docs.ceph.com/en/reef/man/8/ceph/)
- [Red Hat Ceph Storage 5 - CRUSH Administration](https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/storage_strategies_guide/crush_administration)

## Issues Found
No technical issues found.

All 11 technical claims were verified:

1. `ceph osd crush rule ls` - correct command to list rules.
2. `ceph osd crush rule dump` / `ceph osd crush rule dump <name>` - correct for dumping all or a specific rule.
3. JSON output format with `rule_id`, `rule_name`, `type: 1` (replicated), and `steps` array - accurate structure.
4. `ceph osd crush rule create-replicated <name> <root> <failure-domain> [<class>]` - correct syntax.
5. CRUSH map decompile/recompile workflow (`getcrushmap`, `crushtool -d`, `crushtool -c`, `setcrushmap`) - all correct.
6. CRUSH rule text format with `step take`, `step choose firstn`, `step chooseleaf firstn`, `step emit` - valid syntax; the datacenter placement explanation is accurate.
7. `ceph osd pool set mypool crush_rule rack-rule` - correct; accepts rule name as a string.
8. `ceph osd pool create mypool 64 64 replicated rack-rule` - correct syntax with pg_num, pgp_num, pool type, and rule name.
9. `crushtool --test` flags (`--rule`, `--num-rep`, `--min-x`, `--max-x`, `--show-statistics`) - all valid.
10. `ceph osd crush rule rm <name>` - correct removal command.
11. `ceph osd map mypool testobject` - correct command for showing OSD mapping.

## Review Notes
- The JSON example output for `ceph osd crush rule dump` is simplified for clarity. Real output includes additional fields such as `ruleset`, `min_size`, `max_size`, and a numeric `item` field in the `take` step. This simplification is appropriate for a blog post but readers should be aware the actual output contains more fields.
- The `create-replicated` subcommand replaced the older `create-simple` in modern Ceph (Luminous and later). The post correctly uses the current command.
