# Validation Summary: How to Set Pool Quotas in Ceph

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Ceph (pool quotas, CephFS quotas, RADOS)
- Rook (CephBlockPool CRD)
- radosgw-admin (RGW user and bucket quotas)
- Prometheus / Alertmanager (quota monitoring alerts)
- Kubernetes (kubectl for Rook management)

## Sources Consulted
- Ceph official documentation on pool quotas: https://docs.ceph.com/en/latest/rados/operations/pools/#set-pool-quotas
- Ceph RGW admin documentation on quota management: https://docs.ceph.com/en/latest/radosgw/admin/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph health checks documentation: https://docs.ceph.com/en/latest/rados/operations/health-checks/
- Ceph Prometheus module metrics reference

## Issues Found

1. **Incorrect error code for quota exceeded (line 37, summary):** The post claimed write operations return `EDQUOT` when a pool quota is reached. Ceph actually marks the pool as full and returns `-ENOSPC`. Fixed both the explanation paragraph and the summary section.

2. **Wrong Ceph version for human-readable size support (line 34):** The post stated human-readable sizes in `set-quota` were available since "Ceph Octopus+". This feature was available since Ceph Nautilus. Fixed to "Ceph Nautilus+".

3. **Incorrect health warning example (line 127):** The post showed `POOL_NEAR_FULL Pool 'mypool' has 85% of quota` as the quota warning. `POOL_NEAR_FULL` is for OSD fullness, not quota-specific warnings. Ceph uses quota-specific health warnings with a different message format. Fixed to a more accurate example.

4. **Wrong command for setting RGW user quotas (line 163):** The post used `radosgw-admin user modify` with `--quota-scope` to set user quotas. The correct command is `radosgw-admin quota set --quota-scope=user`. The `user modify` command is for user properties, not quota management.

5. **Wrong command for RGW bucket quotas in table (line 154):** The table listed `radosgw-admin bucket limit check` as the command for bucket quotas. This command checks existing limits but does not set them. Fixed to `radosgw-admin quota set --quota-scope=bucket`.

## Review Notes
- The `ceph df detail` example output is simplified for readability and doesn't exactly match real output column headers, but conveys the right information. Acceptable for a tutorial.
- The Prometheus metric `ceph_pool_stored_raw` exists in the ceph-mgr prometheus module but may vary by exporter version. Users should verify metric names against their specific Ceph exporter.
- The byte calculations (100 GiB = 107374182400, 1 TiB = 1099511627776, 50 GiB = 53687091200) are all correct.
- The Rook CephBlockPool CRD spec with `quotas.maxSize` and `quotas.maxObjects` is correct for current Rook versions.
