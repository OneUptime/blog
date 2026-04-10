# Validation Summary: How to Configure Samba with CephFS Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Samba (SMB/CIFS file server)
- Ceph / CephFS (distributed file system)
- Rook (Ceph operator for Kubernetes, mentioned in tags)
- vfs_ceph (Samba VFS module for direct libcephfs access)
- Linux system administration (systemd, package management)

## Sources Consulted
- [vfs_ceph(8) -- Official Samba Man Page](https://www.samba.org/samba/docs/current/man-html/vfs_ceph.8.html)
- [smb.conf(5) -- Official Samba Man Page](https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html)
- [Samba Performance Tuning -- SambaWiki](https://wiki.samba.org/index.php/Performance_Tuning)
- [CephFS Client Capabilities -- Ceph Reef Documentation](https://docs.ceph.com/en/reef/cephfs/client-auth/)
- [vfs_ceph.c Source -- Samba GitHub](https://github.com/samba-team/samba/blob/master/source3/modules/vfs_ceph.c)
- [samba-vfs-cephfs -- Fedora Packages](https://packages.fedoraproject.org/pkgs/samba/samba-vfs-cephfs/index.html)
- [samba-vfs-ceph -- Debian sid Package](https://packages.debian.org/sid/samba-vfs-ceph)

## Issues Found

1. **Service names missing Debian/Ubuntu variant (bug):** The "Starting and Testing Samba" section only showed `systemctl enable --now smb nmb`, which is the RHEL/CentOS service name. Debian/Ubuntu uses `smbd` and `nmbd`. Since the installation section covers both distros, a Debian user following the guide would get a "Unit smb.service not found" error. Fixed by adding both RHEL and Debian service commands with comments, matching the pattern used in the installation section.

2. **`socket options` parameter (incorrect advice):** The performance tuning section recommended `socket options = TCP_NODELAY SO_RCVBUF=131072 SO_SNDBUF=131072` to "increase throughput." The official Samba Performance Tuning wiki explicitly lists `socket options` under "Settings That Should Not Be Set," stating that it overrides OS auto-tuning and "in most cases, setting this parameter decreases the performance." Removed and replaced with SMB2/3 buffer size parameters (`smb2 max read/write/trans`) which are the correct way to tune throughput for SMB3 workloads.

3. **`aio read size` / `aio write size` parameters (misleading):** These were set to `1`, which is already the default value in modern Samba, making the setting a no-op. Additionally, vfs_ceph implements its own async wrappers that call synchronous libcephfs functions, so POSIX AIO tuning has minimal practical effect on CephFS-backed shares. Removed as misleading performance advice.

4. **`large readwrite` parameter (obsolete):** This is an SMB1-era parameter that has no effect when `max protocol = SMB3` is set (the same config block). SMB2/3 handles large reads/writes natively. Removed as it was a no-op.

## Review Notes
- On newer Debian releases (since Samba ~4.20.2+dfsg-3), the CephFS VFS module has been split from `samba-vfs-modules` into its own package `samba-vfs-ceph`. Users on current Debian/Ubuntu may need to install `samba-vfs-ceph` instead of or in addition to `samba-vfs-modules`. The post uses `samba-vfs-modules` which is historically correct and still works on many systems, but may not include the CephFS module on the latest Debian.
- Samba 4.21+ introduced a newer alternative module `vfs_ceph_new` (loaded via `vfs objects = ceph_new`) that uses low-level libcephfs APIs for more optimized access. The post's use of `vfs objects = ceph` is still correct and well-supported.
- The `posix locking = no` setting is a common recommendation for vfs_ceph shares but is not officially documented as required (unlike `kernel share modes = no` which is). It improves write performance in practice. The setting is acceptable as-is.
- The `ceph auth` capabilities use `pool=cephfs_data` which is a common default pool name. Users with custom pool names will need to adjust this.
