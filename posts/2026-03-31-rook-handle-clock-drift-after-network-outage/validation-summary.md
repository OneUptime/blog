# Validation Summary: How to Handle Clock Drift Issues After Network Outage

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ceph (distributed storage)
- Rook (Ceph operator for Kubernetes)
- NTP / chrony / systemd-timesyncd / ntpd (time synchronization)
- Kubernetes (kubectl debug, node management)

## Sources Consulted
- Ceph official documentation: MON_CLOCK_SKEW health check and `mon_clock_drift_allowed` configuration (https://docs.ceph.com/en/latest/rados/operations/health-checks/#mon-clock-skew)
- Ceph configuration reference for monitor clock drift settings (https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/)
- Ceph CLI reference for `ceph config set/get` commands (https://docs.ceph.com/en/latest/man/8/ceph/)
- chrony documentation for `makestep`, `tracking`, `sources` commands (https://chrony-project.org/doc/chrony.conf.html)
- Kubernetes documentation for `kubectl debug node` (https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/)

## Issues Found
1. **Invalid Ceph command `ceph time-sync-status`**: The post included `ceph time-sync-status` as a way to check clock status across monitors. This command does not exist in the Ceph CLI. Replaced with `ceph mon stat` (to check monitor status) and `ceph health detail | grep clock` (to filter clock-skew-specific health messages), both of which are valid Ceph commands that provide the relevant information.

## Review Notes
- The `local stratum 10` directive in the chrony configuration example causes the node to act as a local NTP server using its own hardware clock as a fallback. While this is a common pattern, in a Ceph environment with multiple monitor nodes, it could allow nodes to drift independently while still appearing to have a valid time source. This is not technically wrong but could be worth a cautionary note in a future revision.
- The default value for `mon_clock_drift_allowed` (0.05 seconds) is correct for current Ceph releases.
- All NTP tool commands (`chronyc makestep`, `chronyc tracking`, `ntpq -p`, `timedatectl show`) are syntactically correct and appropriate.
- The `kubectl debug node/<node-name>` command is correct for checking time on Kubernetes nodes.
- The `ceph config set/get` syntax for adjusting the clock drift threshold is correct.
