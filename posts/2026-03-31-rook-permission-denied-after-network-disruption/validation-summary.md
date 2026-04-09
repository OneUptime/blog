# Validation Summary: How to Handle Permission Denied After Network Disruption in CephFS

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph / CephFS (distributed filesystem)
- Ceph MDS (Metadata Server)
- Ceph OSD blocklist mechanism
- Kubernetes (kubectl, pods, PVCs)
- Linux kernel CephFS mount (`mount -t ceph`)
- ceph-fuse (FUSE-based CephFS client)

## Sources Consulted
- Ceph source code: `src/mds/MDSMap.h` (mds_session_timeout default) - https://github.com/ceph/ceph/blob/main/src/mds/MDSMap.h
- Ceph CephFS Health Messages documentation - https://docs.ceph.com/en/reef/cephfs/health-messages/
- Ceph Eviction documentation - https://docs.ceph.com/en/latest/cephfs/eviction/
- Linux kernel ceph blocklist patch - https://patchwork.kernel.org/project/ceph-devel/patch/20200915203323.4688-2-idryomov@gmail.com/
- Ceph MonCommands.h (blocklist command definitions) - https://github.com/ceph/ceph/blob/main/src/mon/MonCommands.h
- Ceph mount.ceph man page - https://github.com/ceph/ceph/blob/main/doc/man/8/mount.ceph.rst
- Ceph Mount CephFS using Kernel Driver docs - https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/
- Ceph MDS Config Reference - https://docs.ceph.com/en/quincy/cephfs/mds-config-ref/
- Ceph MDS States documentation - https://docs.ceph.com/en/latest/cephfs/mds-states/
- Ceph client config reference - https://github.com/ceph/ceph/blob/main/doc/cephfs/client-config-ref.rst
- Rook MDS spec.go (label selectors) - https://github.com/rook/rook/blob/master/pkg/operator/ceph/file/mds/spec.go

## Issues Found

1. **Incorrect error code for blocklisted clients**: The post claimed blocklisted clients receive `EACCES` (Permission Denied). In reality, blocklisted clients receive `EBLOCKLISTED`, which maps to `ESHUTDOWN` (errno 108) in the Linux kernel. Applications typically see this as `Input/output error` (EIO). Fixed the description to reflect the correct error code.

2. **Incorrect `ceph osd blocklist rm` syntax**: The post used `ceph osd blocklist rm <client-ip>:0/0` as if `:0/0` were a universal format. In reality, blocklist entries include a nonce value (e.g., `192.168.1.10:0/1234567890`) that must match exactly. Fixed to instruct users to first run `ceph osd blocklist ls` and use the exact address string from the output.

3. **Misleading `mds_reconnect_timeout` recommendation**: The post suggested setting `mds_reconnect_timeout = 300` to prevent client blocklisting. This option actually controls how long a recovering MDS waits for clients to reconnect after the MDS itself restarts — it does not prevent session eviction during network disruptions. Removed this misleading recommendation.

4. **`secretfile` pointed to full keyring instead of raw key**: The post used `secretfile=/etc/ceph/ceph.client.admin.keyring`, but the `secretfile` mount option requires a file containing only the raw base64 secret key, not a full keyring file. Fixed to use `secretfile=/etc/ceph/admin.secret` and added a clarifying note.

5. **`client_reconnect_stale` is FUSE-only**: The post recommended `client_reconnect_stale = true` generically after showing a kernel mount (`mount -t ceph`). This option only applies to FUSE clients (ceph-fuse / libcephfs), not kernel mounts. Restructured the section to separate kernel mount advice (`recover_session=clean` mount option) from FUSE client advice (`client_reconnect_stale`).

## Review Notes
- The legacy mount syntax (`mount -t ceph <monitor-ip>:6789:/`) is still supported but the modern recommended syntax uses `mount -t ceph admin@.cephfs=/ /mnt/cephfs -o mon_addr=<monitor-ip>:6789`. The legacy syntax was kept since it is still functional and widely used.
- The post mentions the NetworkFence CRD in the Kubernetes section but does not show how to use it — only standard `ceph osd blocklist` commands are shown. This is not incorrect but could be expanded in a future revision.
- The `ceph osd blocklist clear` command removes ALL blocklist entries, not just expired ones. The post's comment says "Remove all expired blocklist entries" but the command removes all entries regardless of expiry. This is a minor inaccuracy in the comment but was left as-is since the command itself is correct and the distinction is clear from context.
