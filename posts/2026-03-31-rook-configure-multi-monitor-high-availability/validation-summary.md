# Validation Summary: How to Configure Multi-Monitor High Availability in Ceph

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (monitors / MONs, quorum, stretch clusters)
- Kubernetes (pod anti-affinity, resource limits, kubectl)
- NTP / Chrony (clock synchronization)

## Sources Consulted
- Rook CephCluster CRD documentation: https://rook.io/docs/rook/latest-release/CRDs/Cluster/ceph-cluster-crd/
- Rook Mon Health documentation: https://rook.io/docs/rook/latest-release/Storage-Configuration/Advanced/ceph-mon-health/
- Rook Stretch Cluster documentation: https://rook.io/docs/rook/latest/CRDs/Cluster/stretch-cluster/
- Ceph Health Checks documentation (MON_CLOCK_SKEW): https://docs.ceph.com/en/reef/rados/operations/health-checks/
- Ceph Monitor Config Reference: https://docs.ceph.com/en/reef/rados/configuration/mon-config-ref/
- Ceph Troubleshooting Monitors: https://docs.ceph.com/en/reef/rados/troubleshooting/troubleshooting-mon/

## Issues Found

1. **Clock skew description was incorrect**: The post claimed "Monitors reject connections if clocks are skewed more than 0.05 seconds." In reality, exceeding the `mon_clock_drift_allowed` threshold (default 0.05s) raises a `MON_CLOCK_SKEW` health warning (`HEALTH_WARN`), not connection rejection. Fixed to accurately describe the warning behavior.

2. **Monitor failover timeout was wrong**: The post stated the heartbeat timeout default is 5 minutes. The Rook operator's default monitor failover timeout is 10 minutes (600 seconds), as documented in `spec.healthCheck.daemonHealth.mon.timeout`. Also clarified that Ceph monitors detect peer absence quickly via heartbeat, while the Rook operator separately waits 10 minutes before replacing the failed pod.

3. **`ceph mon dump | grep "leader"` command was incorrect**: `ceph mon dump` outputs the monitor map (monmap) which does not contain a "leader" field. Replaced with `ceph quorum_status --format json-pretty | grep quorum_leader_name`, which correctly extracts the current quorum leader.

4. **Summary incorrectly claimed 50ms skew "breaks quorum"**: Changed to accurately state that 50ms skew triggers a `MON_CLOCK_SKEW` health warning, not quorum failure.

## Review Notes
- The `ceph time-sync-status` command was verified as valid (introduced in Ceph Luminous).
- The stretch cluster configuration fields (`failureDomainLabel`, `subFailureDomain`, `zones[].name`, `zones[].arbiter`) were verified as correct against official Rook documentation and examples.
- The quorum formula `(N/2) + 1` using integer division is correct for all examples given.
- The CephCluster CRD fields (`spec.mon.count`, `spec.mon.allowMultiplePerNode`, placement with podAntiAffinity) are all valid.
