# Validation Summary: How to Connect to a Ceph Daemon Admin Socket

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Ceph (admin socket / daemon management)
- Rook (Ceph operator for Kubernetes)
- Kubernetes (kubectl exec, pod access)
- Unix domain sockets
- Bash shell commands

## Sources Consulted
- Ceph official documentation: Admin Socket interface (https://docs.ceph.com/en/latest/rados/operations/monitoring/#using-the-admin-socket)
- Ceph official documentation: ceph daemon and ceph tell commands (https://docs.ceph.com/en/latest/man/8/ceph/)
- Rook documentation: Rook Toolbox (https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/)
- Ceph source code: admin socket path resolution logic (daemon name to socket file mapping)

## Issues Found

### Issue 1: Incorrect RGW daemon identifier in `ceph daemon` commands
- **What was wrong:** The post used `ceph daemon rgw.myzone help` as the command to connect to an RGW daemon's admin socket. RGW daemons are identified as `client.rgw.<name>`, and their socket files are named `ceph-client.rgw.<name>.asok`. The `ceph daemon` shorthand resolves the name by prepending `ceph-` and appending `.asok`, so `rgw.myzone` would look for `ceph-rgw.myzone.asok` which does not exist.
- **What was changed:** Replaced `rgw.myzone` with `client.rgw.myzone` in the `ceph daemon` command example (line 49).
- **Why:** The correct daemon identifier must match the socket filename pattern. Using `client.rgw.myzone` resolves to `ceph-client.rgw.myzone.asok`, which is the actual socket file.

### Issue 2: Toolbox pod cannot use `ceph daemon` for admin socket access
- **What was wrong:** The post suggested using `ceph daemon osd.0 help` and `ceph daemon rgw.myzone help` from the Rook toolbox pod. Admin sockets are Unix domain sockets local to each daemon's container. The toolbox pod does not have these sockets mounted, so `ceph daemon` cannot reach them from the toolbox.
- **What was changed:** Replaced the toolbox section to use `ceph tell` instead of `ceph daemon`. Added an explanatory note that `ceph daemon` requires local socket access (i.e., must be run from inside the daemon's own pod), while `ceph tell` sends commands over the network via the Ceph monitors and works from the toolbox. Also fixed the RGW daemon identifier to `client.rgw.myzone` in this section.
- **Why:** `ceph tell` is the correct command for sending administrative commands to daemons remotely (via the monitor network), which is the only option from a separate pod like the toolbox. `ceph daemon` is only usable when you have local filesystem access to the admin socket.

## Review Notes
- The post correctly distinguishes between `ceph daemon` (local socket) and `ceph --admin-daemon` (direct socket path). Both require local access to the socket file.
- `ceph tell` and `ceph daemon` support largely overlapping but not identical command sets. Some low-level admin socket commands may only be available via direct socket access (`ceph daemon`), not via `ceph tell`. This nuance is not covered in the post but is an acceptable simplification for an introductory guide.
- The `ceph config get osd.0 admin_socket` command in the troubleshooting section queries the centralized config store, which works in modern Ceph versions (Nautilus+). For older versions, `ceph-conf --name=osd.0 --show-config-value admin_socket` would be the alternative.
- The default admin socket path `/var/run/ceph/` is correct for traditional (non-cephadm) deployments. In cephadm-managed clusters, sockets may be under `/var/run/ceph/<fsid>/`. Since this post focuses on Rook (where paths are inside containers), this distinction is less relevant.
