# Validation Summary: How to View PG Scaling Recommendations with autoscale-status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Ceph PG Autoscaler
- kubectl (Kubernetes CLI)
- Python 3 (for JSON parsing)

## Sources Consulted
- Ceph official documentation on PG Autoscaler: https://docs.ceph.com/en/latest/rados/operations/placement-groups/
- Ceph official documentation on `ceph osd pool autoscale-status`: https://docs.ceph.com/en/latest/rados/operations/placement-groups/#viewing-pg-scaling-recommendations
- Rook documentation on the Ceph toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph source code for autoscaler module JSON output fields

## Issues Found
No technical issues found.

## Review Notes
- The post advises setting `pgp_num` separately after `pg_num` when manually reducing PGs. Since Ceph Nautilus (14.2.x+), `pgp_num` automatically follows `pg_num` changes, making the separate `pgp_num` command unnecessary. However, the command is still valid and harmless, so this is not an error — just slightly conservative advice for modern Ceph deployments.
- The `.mgr` pool in the example output shows RATE 1.0 (single replica), which is plausible for a small management pool but atypical. This is fine for illustrative purposes.
- PG count reduction (decreasing `pg_num`) is only supported in Ceph Nautilus and later. The post does not mention version requirements, which could be noted in a future update.
