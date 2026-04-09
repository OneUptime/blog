# Validation Summary: How to Run Ceph Commands from the Toolbox in Rook

## Status
validated

## Post Type
Reference / Command Guide

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system)
- Kubernetes (kubectl exec)
- Ceph CLI tools: ceph, rbd, radosgw-admin
- Rook Toolbox pod (rook-ceph-tools)

## Sources Consulted
- Rook Toolbox documentation: https://rook.io/docs/rook/latest/Troubleshooting/ceph-toolbox/
- Ceph CLI documentation: https://docs.ceph.com/en/latest/man/8/ceph/
- Ceph `ceph tell` vs `ceph daemon` documentation: https://docs.ceph.com/en/latest/rados/operations/monitoring/
- Ceph RBD CLI documentation: https://docs.ceph.com/en/latest/man/8/rbd/
- Ceph radosgw-admin documentation: https://docs.ceph.com/en/latest/man/8/radosgw-admin/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- **`ceph daemon osd.0 dump_slow_requests` changed to `ceph tell osd.0 dump_slow_requests`**: The `ceph daemon` command communicates via the local admin socket (`/var/run/ceph/<cluster>-osd.0.asok`), which requires running on the same pod/host as the target OSD daemon. In a Rook deployment, each OSD runs in its own pod, and the toolbox pod does not have access to OSD admin sockets. The `ceph tell` command routes through the Ceph monitors over the network, making it the correct way to send commands to specific daemons from the toolbox.

## Review Notes
- All other Ceph commands (`ceph status`, `ceph health detail`, `ceph osd tree`, `ceph osd df`, `ceph pg stat`, `ceph pg dump_stuck`, `ceph mon stat`, `ceph quorum_status`, `ceph osd perf`, etc.) are correct and current.
- The `kubectl exec` pattern using `deploy/rook-ceph-tools` is the standard Rook toolbox access method.
- The `rbd` and `radosgw-admin` commands use correct syntax.
- The pool name `replicapool` and image name `csi-vol-abc123` are used as illustrative examples, which is appropriate.
- The `ceph -w` command with `-it` flags is correct for interactive watching in the terminal.
