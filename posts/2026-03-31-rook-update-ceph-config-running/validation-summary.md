# Validation Summary: How to Update Ceph Configuration on a Running Rook Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph (distributed storage system)
- Kubernetes (ConfigMaps, kubectl, deployments)
- Ceph configuration subsystem (mon KV store, ceph.conf)

## Sources Consulted
- Rook documentation on Ceph cluster configuration: https://rook.io/docs/rook/latest/Storage-Configuration/Advanced/ceph-configuration/
- Ceph documentation on configuration management: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Ceph documentation on `ceph config` command: https://docs.ceph.com/en/latest/man/8/ceph/#config
- Rook toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/

## Issues Found
1. **Misleading summary about ConfigMap persistence**: The summary stated "ConfigMap overrides are better for settings that must survive daemon restarts," implying that `ceph config set` values do not survive restarts. This contradicts the earlier (correct) statement that `ceph config set` is "persistent." In reality, both methods persist across restarts — `ceph config set` stores values in the mon KV store which persists indefinitely. The ConfigMap override is specifically for settings that must be present in the `ceph.conf` file before a daemon connects to the monitors (e.g., bootstrap or early-startup settings). Fixed the summary to accurately describe when each method is appropriate.

## Review Notes
- The `ceph config set` description says changes are "immediately applied without restarts." This is true for many dynamically-tunable options, but some Ceph settings still require a daemon restart even when set via `ceph config set`. This is an acceptable simplification for a blog post but readers should be aware.
- The `rook-config-override` example only shows restarting the MGR deployment, but changes to OSD or MON config sections would require restarting those daemons as well. The text does say "restart the relevant daemons" which is correct, but the example could lead readers to only restart the MGR.
- All kubectl commands, ceph CLI syntax, ConfigMap structure, and CephCluster spec fields are correct.
