# Validation Summary: How to View Runtime Configuration via Admin Socket in Ceph

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (admin socket, daemon configuration, debug logging)
- Rook (Kubernetes-based Ceph operator)
- Kubernetes (kubectl exec, pod label selectors)

## Sources Consulted
- Ceph documentation on admin socket: https://docs.ceph.com/en/latest/rados/operations/monitoring/#using-the-admin-socket
- Ceph documentation on configuration management: https://docs.ceph.com/en/latest/rados/configuration/ceph-conf/
- Rook documentation on toolbox: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph documentation on `ceph daemon` command: https://docs.ceph.com/en/latest/man/8/ceph/#daemon

## Issues Found
- **Critical: All `ceph daemon` commands incorrectly routed through the tools pod.** The `ceph daemon` command communicates via a Unix domain socket (`/var/run/ceph/`) that only exists inside the daemon's own pod. The original post used `deploy/rook-ceph-tools` for every `ceph daemon` invocation, which would fail because the tools pod does not have access to OSD, MON, or MDS admin sockets. Fixed all commands to exec into the correct daemon pod (OSD pod for OSD commands, MON pod for MON commands, MDS pod for MDS commands). Added a preamble section showing how to find the correct pod names using Kubernetes label selectors (`app=rook-ceph-osd,ceph-osd-id=0`, `app=rook-ceph-mon,ceph_daemon_id=a`, `app=rook-ceph-mds`).
- **Compare Across OSDs script needed per-OSD pod lookup.** The loop script originally exec'd into the tools pod for each OSD. Fixed to dynamically look up each OSD's pod by its `ceph-osd-id` label before exec-ing.
- The `ceph config set` command (persistent, centralized config) correctly used the tools pod and was left unchanged, since it communicates with monitors over the network, not via admin socket.

## Review Notes
- The configuration priority order described (compiled defaults, config file, monitor centralized config, runtime overrides) is accurate per Ceph documentation.
- The `ceph daemon` subcommands (`config show`, `config get`, `config set`, `config diff`) are all valid and correctly described.
- Debug logging levels used (debug_osd 10, debug_ms 1) are reasonable for troubleshooting, and the reset values (1 and 0) are appropriate defaults.
- The mention of `rook-config-override` ConfigMap in the summary is accurate for Rook-managed clusters.
- MDS daemon name format `mds.myfs-a` is illustrative; actual names depend on the CephFilesystem resource name and active/standby designation.
