# Validation Summary: How to Configure PG Autoscaling Modes (Off, On, Warn) in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ceph (PG autoscaler module)
- Rook (Kubernetes Ceph operator)
- Kubernetes (kubectl commands)
- CephBlockPool CRD (ceph.rook.io/v1)

## Sources Consulted
- Ceph official documentation on PG autoscaler: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#autoscaling-placement-groups
- Ceph configuration reference for `osd_pool_default_pg_autoscale_mode`: https://docs.ceph.com/en/latest/rados/configuration/pool-pg-config-ref/
- Rook CephBlockPool CRD documentation: https://rook.io/docs/rook/latest/CRDs/Block-Storage/ceph-block-pool-crd/
- Ceph CLI reference for `ceph osd pool set` and `ceph osd pool autoscale-status`

## Issues Found
No technical issues found.

## Review Notes
- The PG autoscaler was introduced in Ceph Nautilus (14.x) and the `on` mode became the default starting in Ceph Pacific (16.x). The post doesn't mention this default change, which could be worth noting in a future update.
- All CLI commands correctly use the `deploy/rook-ceph-tools` pattern for Rook toolbox access.
- The CephBlockPool CRD `parameters` map correctly passes `pg_autoscale_mode` and `target_size_ratio` as Ceph pool parameters.
- The factor-of-3 threshold for automatic PG adjustment in `on` mode is accurately described.
- The `autoscale-status` output column list is complete and accurate.
