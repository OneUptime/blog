# Validation Summary: How to Audit Rook-Ceph Access and Operations

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Kubernetes API audit policies
- Fluent Bit (log forwarding)
- Prometheus (alerting)
- Elasticsearch (log storage)
- CephX (Ceph authentication)

## Sources Consulted
- Ceph Logging and Debugging documentation: https://docs.ceph.com/en/latest/rados/troubleshooting/log-and-debug/
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph CephX Auth Config Reference: https://docs.ceph.com/en/latest/rados/configuration/auth-config-ref/
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Prometheus module source (metric definitions): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Rook CRD specification: https://rook.io/docs/rook/latest/CRDs/specification/
- Kubernetes audit policy API reference: https://kubernetes.io/docs/reference/config-api/apiserver-audit.v1/

## Issues Found

1. **Invalid Ceph config key `auth_debug`**: The command `ceph config set global auth_debug false` used a non-existent config key. The correct key is `debug_auth` (already used later in the post). Additionally, setting it to `false` (a boolean) is wrong since debug levels are numeric (0-20). Removed this line entirely since `debug_auth` is correctly configured in the next code block.

2. **Invalid Ceph config key `audit_log`**: The command `ceph config set global audit_log true` used a non-existent config key. Ceph audit logging works through log channels, not a simple boolean toggle. Replaced with `ceph config set global mon_cluster_log_to_file true`, which enables the cluster log (including the audit channel) to be written to files.

3. **Non-existent Rook CRD `cephpools`**: The Kubernetes audit policy listed `cephpools` as a resource under `ceph.rook.io`, but no such CRD exists. The correct CRD for pools is `cephblockpools`, which was already listed separately. Removed the `cephpools` entry.

4. **Misleading description for `ac-user-show`**: The text described `ceph dashboard ac-user-show` as checking "dashboard login history," but this command lists user accounts and their roles, not login history. Changed the description to "List dashboard user accounts and their roles."

5. **Non-existent Prometheus metric `ceph_mgr_module_ops_total`**: This metric does not exist in Ceph's Prometheus module. The actual mgr-prefixed metrics are `ceph_mgr_metadata`, `ceph_mgr_status`, `ceph_mgr_module_status`, and `ceph_mgr_module_can_run`. Replaced with `ceph_pool_wr`, which is a real Ceph metric tracking write operations per pool, and updated the alert to monitor aggregate write rates across all pools.

6. **Non-canonical dashboard audit commands**: The commands `ceph config set mgr mgr/dashboard/audit_api_enabled true` and `ceph config set mgr mgr/dashboard/audit_api_log_payload false` used a non-standard syntax path. Replaced with the documented canonical commands: `ceph dashboard set-audit-api-enabled true` and `ceph dashboard set-audit-api-log-payload false`.

## Review Notes
- The `log_file` setting uses a static path (`/var/log/ceph/ceph.log`) which would cause all daemons to write to the same file. The default `/var/log/ceph/$cluster-$name.log` creates per-daemon log files, which is more practical. This is not technically wrong but is unusual for production setups.
- The `log_file` option cannot be updated at runtime and requires a daemon restart to take effect.
- The Fluent Bit config uses `Parser json`, but Ceph logs are not JSON-formatted by default. This would only work if Ceph is separately configured with `log_to_file_format json` or similar. For default Ceph log format, a custom parser would be needed.
- The Kubernetes audit policy could be expanded to include additional Rook CRDs like `cephclients`, `cephnfs`, `cephobjectstoreusers`, and `cephrbdmirrors` for more comprehensive auditing coverage.
