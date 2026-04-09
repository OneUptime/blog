# Validation Summary: How to Choose K and M Values for Erasure Coding Profiles

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- Ceph (erasure coding subsystem)
- Rook (Ceph operator for Kubernetes, referenced in tags)
- Ceph OSD erasure-code-profile CLI
- Jerasure plugin (default erasure coding plugin)
- ISA plugin (Intel ISA-L hardware-accelerated erasure coding)
- CRUSH failure domains (host, rack)
- rados bench (benchmarking tool)

## Sources Consulted
- Ceph official documentation: Erasure Code Profiles (https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- Ceph official documentation: Erasure Code Jerasure Plugin (https://docs.ceph.com/en/latest/rados/operations/erasure-code-jerasure/)
- Ceph official documentation: Erasure Code ISA Plugin (https://docs.ceph.com/en/latest/rados/operations/erasure-code-isa/)
- Ceph official documentation: Pool operations (https://docs.ceph.com/en/latest/rados/operations/pools/)
- Ceph rados CLI reference for bench and cleanup subcommands

## Issues Found
1. **Incorrect `rados bench` cleanup command** (line 169): The post used `rados bench -p test-ec-pool 30 cleanup`, but `cleanup` is not a valid mode for the `rados bench` subcommand (valid modes are `write`, `seq`, `rand`). Cleanup is a separate `rados` subcommand. Fixed to `rados -p test-ec-pool cleanup`.

## Review Notes
- All storage overhead calculations are mathematically correct: 4+2 = 1.5x, 6+2 = 1.33x, 8+3 = 1.375x.
- All minimum OSD counts in the table are correct (K+M for each profile).
- The `ceph osd pool create` command uses the older positional syntax with explicit pg_num and pgp_num (64 64). In modern Ceph (Nautilus+), pgp_num auto-tracks pg_num and the pg-autoscaler can handle sizing, but the older syntax still works correctly.
- The decision matrix recommending 3x replication for clusters under 6 OSDs is sound advice, as erasure coding overhead and CPU cost outweigh benefits at that scale.
- The `technique=reed_sol_van` parameter is correctly used with both the jerasure and isa plugins.
