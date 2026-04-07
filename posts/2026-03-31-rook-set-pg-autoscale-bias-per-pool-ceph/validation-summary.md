# Validation Summary: How to Set pg_autoscale_bias Per Pool in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (PG Autoscaler, OSD pools, placement groups)
- Rook (CephBlockPool CRD)
- Kubernetes (kubectl exec)

## Sources Consulted
- Ceph official documentation on PG Autoscaler: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph pool operations documentation: https://docs.ceph.com/en/latest/rados/operations/pools/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/

## Issues Found
No technical issues found.

## Review Notes
- The `pg_autoscale_bias` parameter, CLI commands (`ceph osd pool set <pool> pg_autoscale_bias <value>`, `ceph osd pool autoscale-status`), and CRD configuration via `spec.parameters` are all correct and current.
- The description of bias as a multiplier on the autoscaler's target PG count is accurate.
- The default value of 1.0 is correct.
- The recommended range of 50-200 PGs per OSD is a widely accepted guideline in Ceph documentation.
- The Rook CephBlockPool `parameters` map correctly passes arbitrary pool settings to Ceph, including `pg_autoscale_bias` and `pg_autoscale_mode`.
- The practical bias value recommendations in the table are reasonable and well-justified.
