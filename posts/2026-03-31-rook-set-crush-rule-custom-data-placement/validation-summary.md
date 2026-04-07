# Validation Summary: How to Set crush_rule for Custom Data Placement in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph CRUSH (Controlled Replication Under Scalable Hashing)
- CephBlockPool CRD
- Ceph CLI tools (`ceph osd`, `crushtool`)
- Kubernetes (`kubectl`)

## Sources Consulted
- Ceph official documentation on CRUSH rules: https://docs.ceph.com/en/latest/rados/operations/crush-map/
- Ceph CLI reference for `ceph osd crush rule create-replicated`: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph CLI reference for `ceph pg ls-by-pool`: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph `crushtool` man page: https://docs.ceph.com/en/latest/man/8/crushtool/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph device class documentation: https://docs.ceph.com/en/latest/rados/operations/crush-map/#device-classes

## Issues Found
1. **`ceph pg dump | grep 'custom-pool'` is incorrect**: `ceph pg dump` outputs pool IDs (numeric), not pool names. Grepping for a pool name would match nothing. Replaced with `ceph pg ls-by-pool custom-pool` which accepts a pool name directly and lists PGs for that pool.

2. **`ceph osd df class ssd` is not a valid command**: `ceph osd df` does not accept a `class` subcommand. Replaced with `ceph osd tree class ssd` (and `hdd`), which correctly filters the OSD tree output by device class.

3. **`crushtool --rule ssd-rule` uses a name instead of numeric ID**: The `crushtool --test --rule` flag requires a numeric rule ID, not a rule name. Added a step to extract the CRUSH map first with `ceph osd getcrushmap`, a step to look up the rule ID with `ceph osd crush rule dump ssd-rule | grep rule_id`, and updated the `--rule` flag to use a numeric ID.

## Review Notes
- The CephBlockPool CRD examples correctly use `failureDomain`, `deviceClass`, and `parameters.crush_rule` fields per the Rook API.
- The `ceph osd crush rule create-replicated` command syntax is correct: `<name> <root> <failure-domain> [<class>]`.
- The device class management commands (`crush rm-device-class`, `crush set-device-class`) are correct.
- The post correctly notes that Ceph auto-detects `ssd`, `hdd`, and `nvme` device classes.
