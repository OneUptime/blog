# Validation Summary: How to Create CRUSH Rules for Erasure Coded Pools

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CRUSH map, erasure coding, OSD management)
- Rook (Ceph operator for Kubernetes)
- crushtool (CRUSH map compilation/decompilation)
- Erasure code profiles and pools

## Sources Consulted
- Ceph official documentation on CRUSH map rules and erasure coding (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph documentation on erasure code profiles (https://docs.ceph.com/en/latest/rados/operations/erasure-code-profile/)
- Ceph documentation on erasure coded pools (https://docs.ceph.com/en/latest/rados/operations/erasure-code/)
- Ceph documentation on pool creation (https://docs.ceph.com/en/latest/rados/operations/pools/)
- CRUSH algorithm paper — `indep` vs `firstn` selection behavior

## Issues Found
1. **Inaccurate `chooseleaf` comparison in introduction**: The original text stated "Unlike replicated rules, erasure coded rules use `chooseleaf` to select one OSD per failure domain instance rather than one OSD per entire domain." This was misleading because replicated rules also use `chooseleaf` — both rule types select one OSD per failure domain. The actual difference is the algorithm: replicated rules use `chooseleaf firstn` while erasure coded rules use `chooseleaf indep`. With `indep`, each chunk position is mapped independently so that an OSD failure only remaps the affected chunk rather than shifting all subsequent placements. Fixed the sentence to accurately describe the `firstn` vs `indep` distinction.

## Review Notes
- The CRUSH rule type numbering (type 3 = erasure) is correct. Type 1 is replicated, type 3 is erasure.
- All CLI commands (`ceph osd erasure-code-profile set`, `ceph osd pool create`, `ceph osd getcrushmap`, `crushtool -d/-c`, `ceph osd setcrushmap`, `ceph osd map`, `ceph osd find`) use correct syntax and flags.
- The CRUSH rule text format in the custom rule example (`step take default class ssd`, `step chooseleaf indep 0 type rack`, `step emit`) uses correct decompiled CRUSH map syntax.
- The erasure code profile parameters (`k`, `m`, `crush-failure-domain`, `crush-device-class`, `crush-root`) are all valid profile keys.
- The post correctly notes that Ceph auto-generates a CRUSH rule when creating an erasure coded pool from a profile.
- In the pool creation commands, specifying both `pg_num` and `pgp_num` explicitly (e.g., `64 64`) is valid syntax though in modern Ceph (Nautilus+) `pgp_num` auto-adjusts to match `pg_num`. This is not incorrect, just slightly dated.
