# Validation Summary: How to Fix DASHBOARD_DEBUG Health Check in Ceph

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (storage cluster, health checks, dashboard module)
- Rook (Ceph operator for Kubernetes)
- Ceph Dashboard (mgr module)
- Kubernetes (kubectl, rook-ceph namespace)

## Sources Consulted
- Ceph source code: `src/pybind/mgr/dashboard/plugins/debug.py` — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/plugins/debug.py
- Ceph source code: `src/pybind/mgr/dashboard/module.py` — https://github.com/ceph/ceph/blob/main/src/pybind/mgr/dashboard/module.py
- Ceph health checks documentation: https://github.com/ceph/ceph/blob/main/doc/rados/operations/health-checks.rst
- Ceph dashboard debug plugin documentation: https://github.com/ceph/ceph/blob/main/doc/mgr/dashboard_plugins/debug.inc.rst

## Issues Found

1. **Incorrect `ceph dashboard debug status` output values**: The post showed output as `Debug: 'on'` and `Debug: 'off'`, but the actual Ceph source code (`debug.py` line ~69) produces `Debug: 'enabled'` and `Debug: 'disabled'`. Fixed both sample outputs.

2. **Incorrect `ceph health detail` detail message**: The post showed the detail line as `"Dashboard debug mode is enabled, which could expose sensitive information."` but the actual detail message from the source code is `"Please disable debug mode in production environments using "ceph dashboard debug disable""`. Fixed the sample output.

3. **Non-existent command `ceph dashboard get-ssl-certificate`**: This command does not exist in Ceph. The dashboard module only provides `set-ssl-certificate`, `set-ssl-certificate-key`, and `create-self-signed-cert` commands. There is no `get-ssl-certificate` subcommand. Replaced with `ceph config-key get mgr/dashboard/crt`, which queries the underlying config-key store for the dashboard certificate.

4. **Monitoring script used wrong grep pattern**: The prevention script used `grep -q "'on'"` to detect debug mode, but since the actual output is `Debug: 'enabled'`, the grep pattern was changed to `grep -q "'enabled'"` to match correctly.

## Review Notes
- The `ceph dashboard get-jwt-token-ttl` command is valid and correctly used.
- The Rook toolbox access command (`kubectl -n rook-ceph exec -it deploy/rook-ceph-tools -- bash`) is correct.
- The `DASHBOARD_DEBUG` health warning code is a real Ceph health check, correctly described as a security concern related to debug tracebacks in HTTP responses.
- The UI navigation path ("Administrator - Configuration - Dashboard Settings") could not be verified against a live dashboard but is reasonable for the Ceph dashboard layout.
