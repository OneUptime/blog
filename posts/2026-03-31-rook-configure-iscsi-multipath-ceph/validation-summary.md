# Validation Summary: How to Configure iSCSI Multipath for Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- iSCSI (Internet Small Computer Systems Interface)
- Linux device-mapper-multipath (MPIO)
- LIO (Linux-IO target subsystem)
- ALUA (Asymmetric Logical Unit Access)
- open-iscsi (iscsiadm)

## Sources Consulted
- Linux multipath-tools documentation and `multipath.conf(5)` man page: https://linux.die.net/man/5/multipath.conf
- open-iscsi project documentation and `iscsiadm(8)` man page: https://linux.die.net/man/8/iscsiadm
- Ceph iSCSI Gateway documentation: https://docs.ceph.com/en/latest/rbd/iscsi-overview/
- Red Hat documentation on DM Multipath configuration: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_device_mapper_multipath/index
- LIO target ALUA support documentation

## Issues Found

### 1. Missing iSCSI discovery step (critical)
- **What was wrong:** The "Configuring Multiple iSCSI Sessions" section jumped directly to `iscsiadm --login` without first running target discovery. Without discovery, node records do not exist in the iSCSI database and the login commands would fail with an error like "No records found".
- **What was changed:** Added a discovery step before the login commands using `iscsiadm -m discovery -t sendtargets -p <portal>` for both gateway portals.
- **Why:** iSCSI initiators must discover targets (via SendTargets or similar) before they can log in. This is a required step in the iSCSI workflow.

### 2. Incorrect code fence language for session output
- **What was wrong:** The expected output block for `iscsiadm -m session` used ` ```yaml ` as the code fence language.
- **What was changed:** Changed to ` ```text ` since the output is plain terminal text, not YAML.
- **Why:** Marking it as YAML could cause incorrect syntax highlighting and is misleading about the output format.

## Review Notes
- The `no_path_retry fail` setting causes immediate I/O failure when all paths are down. A numeric value (e.g., `no_path_retry 5`) would allow the kernel to queue I/O briefly during transient failures, which may be preferable in production. This is a valid configuration choice, not an error.
- The post uses both `multipath -r` and `systemctl restart multipathd` to reload the configuration. Either one alone is sufficient — `multipath -r` reconfigures without a full restart. This is redundant but not harmful.
- The round-robin load balancing section appends to `multipath.conf` using `cat >>`. This works correctly given the earlier `cat >` wrote the base file, but in practice users should ensure no duplicate `multipaths` stanza exists before appending.
- The post correctly identifies LIO-ORG as the vendor string for Ceph iSCSI gateways and uses appropriate ALUA settings for path prioritization.
