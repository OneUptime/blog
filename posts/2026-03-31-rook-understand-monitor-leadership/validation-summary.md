# Validation Summary: How to Understand Monitor Leadership in Ceph

## Status
validated

## Post Type
Tutorial / Conceptual Guide

## Technologies Covered
- Ceph (monitor subsystem, Paxos consensus)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec patterns)

## Sources Consulted
- Ceph official documentation on monitor architecture: https://docs.ceph.com/en/latest/rados/operations/monitors/
- Ceph source code for monitor election logic (src/mon/Monitor.cc, src/mon/Elector.cc)
- Ceph documentation on election strategies: https://docs.ceph.com/en/latest/rados/operations/change-mon-elections/
- Ceph configuration reference for `mon_lease` and related settings: https://docs.ceph.com/en/latest/rados/configuration/mon-config-ref/

## Issues Found
No technical issues found.

## Review Notes
- The explanation of `mon_lease` triggering elections is a simplification. In practice, lease expiry involves `mon_lease` (default 5s) and `mon_lease_renew_interval_factor` (default 0.6), meaning the leader renews leases every 3s. The peon calls an election when its lease expires without renewal. The post's explanation is accurate enough for a conceptual overview.
- The `election_strategy connectivity` feature was introduced in Ceph Pacific (v16.2.x). Users on older Ceph versions will not have this option available. The post does not specify a minimum version, which could be noted in a future update.
- All kubectl commands correctly target the `rook-ceph` namespace and use the `rook-ceph-tools` deployment, which is the standard Rook toolbox pattern.
