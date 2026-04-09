# Validation Summary: How to Set Up Pool-Level Quotas for Multi-Tenant Environments

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Ceph (pool quotas, OSD pool management)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec, Jobs, ConfigMaps, Secrets)
- Prometheus (Ceph metrics, alerting rules)
- PromQL

## Sources Consulted
- Ceph official documentation — Pool operations: https://docs.ceph.com/en/reef/rados/operations/pools/
- Ceph CLI man page: https://docs.ceph.com/en/latest/man/8/ceph/
- Red Hat Ceph Storage 7 — Pools Overview: https://docs.redhat.com/en/documentation/red_hat_ceph_storage/7/html/storage_strategies_guide/pools-overview_strategy
- Ceph Prometheus MGR module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph PR #7094 — `ceph df detail` quota columns: https://github.com/ceph/ceph/pull/7094
- Ceph Prometheus module source (module.py): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py

## Issues Found

### 1. Inaccurate description of quota enforcement behavior (line 62)
**What was wrong:** The post stated "The pool enters a read-only state for that pool's capacity" when a quota is reached. Ceph pools do not formally enter a read-only state. Write operations are blocked and return EDQUOT, but reads and deletes continue to work. There is no formal state transition.
**What was changed:** Rewrote the sentence to accurately describe that writes are blocked while reads and deletes continue working normally. Removed the misleading "no space left on device" claim, as the actual error depends on the storage interface (RBD vs CephFS vs RGW).

### 2. Kubernetes Job YAML missing Ceph authentication (lines 75-99)
**What was wrong:** The Job spec included only a `ROOK_CEPH_USERNAME` environment variable, which is not sufficient for the `ceph` CLI to authenticate to the cluster. The `ceph` CLI requires `/etc/ceph/ceph.conf` and a keyring file. Without these volume mounts, the Job would fail with a connection or authentication error.
**What was changed:** Removed the non-functional `ROOK_CEPH_USERNAME` env var and added proper `volumeMounts` for `ceph.conf` (from the `rook-ceph-config` ConfigMap) and the admin keyring (from the `rook-ceph-admin-keyring` Secret).

### 3. Prometheus alert rule susceptible to division by zero (line 115)
**What was wrong:** The alert expression `ceph_pool_bytes_used / ceph_pool_quota_bytes > 0.8` would produce `+Inf` or `NaN` for pools without quotas set (where `ceph_pool_quota_bytes` is 0), potentially causing false alerts or evaluation errors.
**What was changed:** Added `and ceph_pool_quota_bytes > 0` filter to exclude pools without quotas from the alert evaluation.

## Review Notes
- The exact names of Rook ConfigMaps and Secrets (`rook-ceph-config`, `rook-ceph-admin-keyring`) may vary between Rook versions. Users should verify the resource names in their cluster.
- The PromQL query in the monitoring section uses `on(pool_id)` for the join, while the alert rule does not. Both are technically correct if the metrics share the same label set, but the inconsistency could confuse readers.
- The post correctly notes that Rook does not expose pool quotas in the CephBlockPool CRD. This remains true as of Rook v1.14.
- Byte calculations are all correct: 500 GiB = 536,870,912,000 bytes and 1 TiB = 1,099,511,627,776 bytes.
