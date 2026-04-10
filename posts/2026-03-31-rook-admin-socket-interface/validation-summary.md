# Validation Summary: How to Use the Admin Socket Interface for Ceph Daemon Querying

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (admin socket interface)
- Ceph daemons: OSD, MON, MDS, MGR
- kubectl (Kubernetes CLI)

## Sources Consulted
- Ceph documentation on admin socket: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph daemon admin socket commands: https://docs.ceph.com/en/latest/man/8/ceph/#daemon
- Rook documentation on toolbox and direct daemon access: https://rook.io/docs/rook/latest/Troubleshooting/direct-tools/
- Rook pod labeling conventions (verified against other validated posts in this blog)

## Issues Found

### 1. Incorrect pod label selectors (2 occurrences)
- **What was wrong:** The post used `ceph_daemon_type=osd,ceph_daemon_id=0` as the label selector for OSD pods. The label `ceph_daemon_type` does not exist in standard Rook deployments.
- **What was changed:** Replaced with `app=rook-ceph-osd,ceph_daemon_id=0`, which is the correct Rook label convention.
- **Why:** Rook labels daemon pods with `app=rook-ceph-<type>` (e.g., `app=rook-ceph-osd`, `app=rook-ceph-mon`), not `ceph_daemon_type`.

### 2. Admin socket commands incorrectly routed through toolbox pod (8 occurrences)
- **What was wrong:** All `ceph daemon` commands after the first section used `kubectl exec -n rook-ceph deploy/rook-ceph-tools -- ceph daemon ...`. The `ceph daemon` command connects via a local Unix admin socket, which only exists inside the specific daemon's pod. The Rook toolbox pod does not have access to any daemon's admin sockets, so these commands would all fail with a "socket not found" error.
- **What was changed:** Replaced all toolbox exec commands with direct exec into the appropriate daemon pod:
  - OSD commands: exec into the OSD pod using label `app=rook-ceph-osd,ceph_daemon_id=0` with container `-c osd`
  - MON commands: exec into the MON pod using label `app=rook-ceph-mon,ceph_daemon_id=a` with container `-c mon`
  - MDS commands: exec into the MDS pod using label `app=rook-ceph-mds` with container `-c mds`
- **Why:** Admin socket (`ceph daemon`) requires the Unix socket file on the local filesystem. In Rook, each daemon runs in its own pod, and the socket is only accessible from within that pod. The toolbox pod has Ceph client tools and cluster network access (for commands like `ceph status` or `ceph tell`), but not access to daemon-local Unix sockets.

### 3. Summary paragraph referenced toolbox
- **What was wrong:** The summary said "use `ceph daemon <daemon-name> <command>` from the toolbox."
- **What was changed:** Changed to "exec into the specific daemon pod and use `ceph daemon <daemon-name> <command>`."
- **Why:** Consistency with the corrected commands; the toolbox approach does not work for admin socket access.

## Review Notes
- The `flush_journal` command listed in the sample commands block is specific to the FileStore backend. With BlueStore (the default backend since Ceph Luminous / 12.x, 2017), this command is not available. The post lists it as one of several "sample commands available," which is not strictly wrong, but readers on modern BlueStore-backed clusters won't see it.
- The `perf reset all` command may not work on all Ceph versions. The `perf reset` admin socket command typically expects a specific logger/module name (e.g., `osd`, `objecter`). The `all` keyword may not be recognized. Readers should verify available arguments via `ceph daemon osd.0 help`.
- The admin socket path `/var/run/ceph/` may include a cluster FSID subdirectory (e.g., `/var/run/ceph/<fsid>/`) in some Ceph versions (Nautilus+). The post's first example (`ls /var/run/ceph/`) correctly shows how to discover the actual path, which mitigates this.
