# Validation Summary: How to Use the ceph mgr Command Suite

## Status
validated

## Post Type
Tutorial / CLI Reference Guide

## Technologies Covered
- Ceph (Manager daemon, MGR modules)
- Rook (Rook-Ceph operator for Kubernetes)
- Kubernetes (kubectl, ServiceMonitor)
- Prometheus (metrics endpoint, Prometheus Operator)
- Ceph Dashboard

## Sources Consulted
- Ceph Dashboard documentation: https://docs.ceph.com/en/latest/mgr/dashboard/
- Ceph MGR administrator guide: https://docs.ceph.com/en/latest/mgr/administrator/
- Ceph Balancer module documentation: https://docs.ceph.com/en/latest/rados/operations/balancer/
- Ceph source (dashboard.rst): https://github.com/ceph/ceph/blob/main/doc/mgr/dashboard.rst
- Ceph source (balancer/module.py): https://github.com/ceph/ceph/blob/main/src/pybind/mgr/balancer/module.py
- Ceph PR #29072 (pg_autoscaler always-on): https://github.com/ceph/ceph/pull/29072
- Ceph PR #32939 (always_on_modules in module ls): https://github.com/ceph/ceph/pull/32939
- Rook monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook ServiceMonitor example: https://github.com/rook/rook/blob/master/deploy/examples/monitoring/service-monitor.yaml

## Issues Found

1. **Incorrect `--roles` flag in dashboard user creation command**: The command `ceph dashboard ac-user-create admin -i /tmp/password --roles administrator` used `--roles` as a flag, but the role name is a positional argument in the Ceph CLI. Fixed to: `ceph dashboard ac-user-create admin -i /tmp/password administrator`.

2. **Invalid command `ceph dashboard get-mgr-server-addr`**: This command does not exist in the Ceph CLI. The dashboard URL is obtained via `ceph mgr services`, which was already shown in the same section. Removed the invalid command since the correct alternative was already present.

3. **`pg_autoscaler` used as disable example**: The command `ceph mgr module disable pg_autoscaler` would fail because `pg_autoscaler` has been an always-on module since Ceph Octopus and cannot be disabled with this command. Changed the example to use `iostat`, which is a regular module that can be freely enabled and disabled.

4. **Incomplete `ceph mgr module ls` output description**: The post stated the output shows `enabled_modules` and `disabled_modules` sections, but since Ceph Octopus the output also includes an `always_on_modules` section. Added the missing section name to the description.

## Review Notes
- The `ceph mgr stat` example output is simplified (omits fields like `active_addrs` present in newer versions), but this is acceptable for illustration purposes.
- The ServiceMonitor YAML is correct but uses the legacy `app: rook-ceph-mgr` label. Newer Rook versions may also use `app.kubernetes.io/name` labels, though the legacy labels remain supported.
- The balancer module is an always-on module in newer Ceph versions (Reef+), so `ceph mgr module enable balancer` may be unnecessary but is not harmful.
- The post does not specify a Ceph version. All commands and concepts are valid for Ceph Pacific through Squid, with the caveats noted above.
