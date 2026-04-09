# Validation Summary: How to Fix 'deep-scrub errors found' in Ceph

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- Ceph (distributed storage system)
- Rook (Ceph operator for Kubernetes)
- kubectl (Kubernetes CLI)
- rados (Ceph object store utility)
- rbd (Ceph block device utility)
- Prometheus (monitoring, mentioned for alerting)

## Sources Consulted
- Ceph official documentation on scrubbing: https://docs.ceph.com/en/latest/rados/configuration/osd-config-ref/#scrubbing
- Ceph official documentation on PG repair: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#pg-repair
- Ceph official documentation on `rados` CLI: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph official documentation on pool flags (noscrub/nodeep-scrub): https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Prometheus module metrics reference: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook documentation on toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **Misleading comment about checksums (line 179)**: The original text said "Enable checksums on new pools to detect corruption early:" before the commands `ceph osd pool set rbd nodeep-scrub false` and `ceph osd pool set rbd noscrub false`. These commands unset the no-scrub inhibit flags to allow scrubbing to run on the pool — they do not enable checksums (which is a separate Bluestore feature controlled by `bluestore_csum_type`). Additionally, these commands work on any existing pool, not specifically "new pools." Changed to "Ensure scrubbing is not disabled on your pools:" which accurately describes what the commands do.

## Review Notes
- The example `rados list-inconsistent-obj` output shows only 2 of the 3 replicas from the acting set [0,2,1]. In real output all replicas would typically be listed, but as illustrative example output this is acceptable and still correctly demonstrates the key concept.
- The `ceph osd pool set rbd nodeep-scrub false` syntax is valid in modern Ceph (Quincy+). An alternative canonical form is `ceph osd pool unset rbd nodeep-scrub`, which works across all Ceph versions.
- All kubectl commands correctly target the `rook-ceph` namespace and the `rook-ceph-tools` deployment, consistent with standard Rook toolbox usage.
- The Prometheus metric `ceph_pg_inconsistent` is correctly named per the Ceph MGR Prometheus module.
