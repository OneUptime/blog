# Validation Summary: How to Assign CRUSH Rules to Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (CRUSH rules, OSD pools, PG mapping)
- Rook (CephBlockPool CRD)
- Kubernetes (custom resource definitions)

## Sources Consulted
- Ceph official documentation: CRUSH map management (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: Pool operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph official documentation: Erasure code pools (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Rook documentation: CephBlockPool CRD (https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/)
- Ceph CLI reference for `ceph osd crush rule` and `ceph osd pool` subcommands

## Issues Found
- **Misleading EC pool comment (line 48)**: The comment said "Create an erasure coded pool with an EC-specific rule" but the argument `ec-4-2-profile` passed to `ceph osd pool create` is an erasure code profile, not a CRUSH rule. The `ceph osd pool create` syntax for erasure pools is `<name> <pg_num> <pgp_num> erasure [<ec-profile>] [<crush-rule>]` — the profile comes before the optional CRUSH rule argument. Changed the comment to "Create an erasure coded pool with a specific erasure code profile" to accurately describe what the command does.

## Review Notes
- The `ceph pg dump | grep mypool` command (line 116) is a rough approach — `ceph pg dump` lists PGs by numeric pool ID (e.g., `1.3a`), not pool name, so grepping for the pool name will only match pool summary lines. A more precise alternative would be `ceph pg ls-by-pool mypool`. This is a minor usability note, not a correctness error, so it was left unchanged.
- All CRUSH rule CLI commands use syntax valid for Ceph Luminous (12.x) and later, where rule names (strings) are accepted in place of numeric rule IDs.
- The Rook CephBlockPool YAML is correct for `ceph.rook.io/v1` API version.
