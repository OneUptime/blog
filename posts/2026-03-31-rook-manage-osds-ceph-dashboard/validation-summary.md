# Validation Summary: How to Manage OSDs from the Ceph Dashboard

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Ceph Dashboard (web-based management UI)
- Ceph OSDs (Object Storage Daemons)
- CRUSH map (Ceph's data placement algorithm)
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph official documentation: OSD management commands (https://docs.ceph.com/en/latest/rados/operations/control/)
- Ceph official documentation: CRUSH map manipulation (https://docs.ceph.com/en/latest/rados/operations/crush-map/)
- Ceph official documentation: OSD flags and maintenance (https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/)
- Rook documentation: Ceph Dashboard (https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-dashboard/)
- Rook documentation: Ceph Toolbox (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)

## Issues Found
- **Incorrect description of `ceph osd down`**: The post described `ceph osd down 3` as "Force-stop a running OSD." This is inaccurate. The `ceph osd down` command only marks the OSD as down in the cluster's OSD map; it does not actually stop the OSD daemon process. If the daemon is still running, it will quickly re-report itself as up. Fixed the description to clarify this behavior.

## Review Notes
- All `kubectl exec` commands correctly use `deploy/rook-ceph-tools` as the exec target, which is the standard Rook toolbox deployment.
- The port-forward command targets `svc/rook-ceph-mgr-dashboard` on port 8443, which is correct for the HTTPS dashboard endpoint.
- The four OSD states (up/in, up/out, down/in, down/out) are correctly enumerated.
- All `ceph osd` subcommands (`metadata`, `perf`, `df`, `out`, `in`, `down`, `set`, `unset`, `crush reweight`, `deep-scrub`) use correct syntax.
- The `noout` flag comment says "prevent automatic OSD removal" which is a slight simplification — it prevents automatic marking of down OSDs as `out` (which triggers rebalancing) — but the summary section explains this more precisely, so the simplification is acceptable in context.
- The pipe in `ceph pg dump pgs_brief | grep scrub` is interpreted by the local shell (grep runs on the host, not in the container), but this works correctly for filtering output and is a common pattern.
