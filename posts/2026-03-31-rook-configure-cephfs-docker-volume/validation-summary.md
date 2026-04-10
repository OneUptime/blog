# Validation Summary: How to Configure CephFS as Docker Volume

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph / CephFS (distributed filesystem)
- Docker (container runtime, local volume driver)
- Kubernetes (for Rook CRD deployment)
- Linux kernel CephFS client and ceph-fuse

## Sources Consulted
- Rook CephFilesystem CRD documentation: https://rook.io/docs/rook/latest/CRDs/Shared-Filesystem/ceph-filesystem-crd/
- Rook source code (mon.go) for monitor service labels: https://github.com/rook/rook/blob/master/pkg/operator/ceph/cluster/mon/mon.go
- mount.ceph man page: https://manpages.debian.org/unstable/ceph-common/mount.ceph.8.en.html
- ceph-fuse man page: https://manpages.ubuntu.com/manpages/focal/en/man8/ceph-fuse.8.html
- CephFS kernel mount documentation: https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/
- CephFS fstab documentation: https://docs.ceph.com/en/nautilus/cephfs/fstab/
- Docker local volume driver documentation: https://docs.docker.com/engine/storage/volumes/

## Issues Found

1. **Incorrect ceph-fuse flags**: The post used `--mon-host` and `--client-mountpoint` (with hyphens). Per the ceph-fuse man page, the correct flag for specifying monitor address is `-m` (short form), and the mountpoint option uses underscores: `--client_mountpoint`. Changed `--mon-host=192.168.1.10:6789` to `-m 192.168.1.10:6789` and `--client-mountpoint=/docker-volumes` to `--client_mountpoint=/docker-volumes`.

2. **Invalid Docker volume create options for CephFS**: The post used `--opt device=:/` with `addr=192.168.1.10` in the mount options. The `addr=` option is an NFS mount convention and is not a valid CephFS kernel mount option. For CephFS, the monitor address must be part of the device string. Changed `--opt device=:/` to `--opt device=192.168.1.10:6789:/` and removed `addr=192.168.1.10` from the `-o` options.

## Review Notes
- The post uses the legacy CephFS kernel mount syntax throughout (monitor addresses in the device string). Modern Ceph (Pacific+) recommends the new syntax (`username@fsid.fsname=/path` with `mon_addr=` in options), but the legacy syntax is still supported and widely used. No change made since the legacy syntax is functional and simpler for a tutorial context.
- The CephFilesystem CRD YAML would benefit from adding a `name` field to `dataPools` entries (Rook docs "highly recommend" it), but omitting it is not an error.
- The ceph-fuse example does not specify authentication credentials (keyring); it assumes `/etc/ceph/ceph.conf` and keyring files are already configured on the host, which is consistent with the prerequisites section.
