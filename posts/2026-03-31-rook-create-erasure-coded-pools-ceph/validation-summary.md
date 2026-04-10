# Validation Summary: How to Create Erasure Coded Pools in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (erasure coding, CRUSH rules, pools, RBD)
- Rook (CephBlockPool CRD)
- Kubernetes (kubectl)
- RADOS Gateway (RGW)

## Sources Consulted
- Ceph official documentation - Erasure Code: https://docs.ceph.com/en/latest/rados/operations/erasure-code/
- Ceph official documentation - CRUSH Maps: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Rook GitHub CephBlockPool CRD source: https://github.com/rook/rook/blob/master/Documentation/CRDs/Block-Storage/ceph-block-pool-crd.md
- IBM Storage Ceph - Creating CRUSH Rules: https://www.ibm.com/docs/en/storage-ceph/8.0.0?topic=hierarchies-creating-crush-rules

## Issues Found
1. **Incorrect `ceph osd crush rule create-erasure` command syntax**: The post used `ceph osd crush rule create-erasure my-ec-rule default host ssd`, which passes `default`, `host`, and `ssd` as separate positional arguments. This is the syntax for `create-replicated`, not `create-erasure`. The correct syntax for `create-erasure` is `ceph osd crush rule create-erasure <name> [<profile>]`. Fixed to `ceph osd crush rule create-erasure my-ec-rule my-ec-profile`.

2. **Reversed operation order in CRUSH rule section**: The post showed creating the CRUSH rule first, then updating the profile — but the causality is reversed. The erasure code profile must contain the CRUSH parameters (crush-root, crush-failure-domain, crush-device-class) first, and then the CRUSH rule is created from that profile. Reordered the section so the profile is set first, then the rule is created from it.

3. **Misleading narrative text**: Changed "Then update the profile to use this rule" to "Then create a dedicated CRUSH rule from the profile" and updated the introductory text to accurately describe how Ceph auto-creates CRUSH rules from EC profiles.

## Review Notes
- The Rook CephBlockPool YAML is valid but omits `failureDomain: host`. This defaults to `host` so it works correctly, but Rook documentation examples typically include it explicitly for clarity.
- All other commands (`ceph osd erasure-code-profile set/get/ls`, `ceph osd pool create`, `ceph osd pool application enable`, `rbd create --data-pool`, verification commands) are syntactically correct and use current Ceph CLI syntax.
- The storage efficiency comparison (k=4 m=2 at 1.5x vs 3x replication) is accurate.
- The fault tolerance comparison (both tolerate 2 OSD failures) is correct.
