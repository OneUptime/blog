# Validation Summary: How to Set Up Performance Baselines for Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage)
- rados bench (RADOS object store benchmarking tool)
- rbd bench (RBD block device benchmarking tool)
- Prometheus (metrics collection and querying)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph rados man page: https://docs.ceph.com/en/latest/man/8/rados/
- Ceph rbd man page: https://docs.ceph.com/en/reef/man/8/rbd/
- Ceph pool operations: https://docs.ceph.com/en/latest/rados/operations/pools/
- Ceph Prometheus module: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph basic block device commands: https://docs.ceph.com/en/latest/rbd/rados-rbd-cmds/
- Red Hat Ceph performance benchmarking guide: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/5/html/administration_guide/ceph-performance-benchmarking

## Issues Found
No technical issues found.

## Review Notes
- `rbd create --pool rbd --image baseline-test --size 10G` uses the older separate-flag style. The modern preferred syntax is `rbd create rbd/baseline-test --size 10G`, but both forms are valid and work correctly.
- `rbd bench` flags `--io-size 4096`, `--io-threads 16`, and `--io-total 1073741824` happen to match the defaults. They are explicitly stated for clarity, which is appropriate in a baseline tutorial. The `--io-total` value could alternatively be written as `1G` for readability.
- Pool deletion requires `mon_allow_pool_delete = true` on the monitors, which is not mentioned. This is a common prerequisite that readers may need to be aware of.
- All Prometheus metric names (`ceph_osd_apply_latency_ms`, `ceph_osd_commit_latency_ms`, `ceph_osd_op_w`, `ceph_osd_op_r`, `ceph_cluster_total_used_bytes`, `ceph_cluster_total_bytes`) are correct for the Ceph Manager Prometheus module.
