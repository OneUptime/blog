# Validation Summary: How to Mount Ceph Volumes in Docker Compose

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ceph (CephFS, RBD)
- Docker Compose
- Docker local volume driver
- ceph-fuse (FUSE client for CephFS)
- rbd (RADOS Block Device) CLI
- systemd service units
- PostgreSQL, Redis, WordPress, MySQL (as example workloads)

## Sources Consulted
- Ceph official documentation: mount.ceph man page — https://docs.ceph.com/en/latest/man/8/mount.ceph/
- Ceph official documentation: Mount CephFS using Kernel Driver — https://docs.ceph.com/en/latest/cephfs/mount-using-kernel-driver/
- Ceph official documentation: Mount CephFS using FUSE — https://docs.ceph.com/en/latest/cephfs/mount-using-fuse/
- Docker documentation: Docker volumes — https://docs.docker.com/storage/volumes/
- Docker Compose file reference — https://docs.docker.com/compose/compose-file/
- Ceph source: mount-using-kernel-driver.rst — https://github.com/ceph/ceph/blob/main/doc/cephfs/mount-using-kernel-driver.rst
- systemd documentation: systemd.unit — https://www.freedesktop.org/software/systemd/man/systemd.unit.html

## Issues Found

### 1. Approach 1: Subdirectory created before CephFS mount
- **What was wrong:** `mkdir -p /mnt/ceph/postgres-data` was executed before the `ceph-fuse /mnt/ceph` mount command. Once CephFS is mounted at `/mnt/ceph`, any directories created on the underlying host filesystem at that path are hidden by the mount. Additionally, the `redis-data` subdirectory referenced by the Redis service was never created.
- **What was changed:** Moved `mkdir` after the `ceph-fuse` mount and added both `postgres-data` and `redis-data` directory creation in a single command.
- **Why:** Subdirectories must be created inside the mounted CephFS filesystem, not on the host path before mounting.

### 2. Approach 2: Invalid CephFS kernel mount device and option
- **What was wrong:** `device: :/` was missing the monitor address, and `addr=192.168.1.10` is not a valid CephFS kernel mount option. The correct option name would be `mon_addr` (for newer kernels), but the traditional and most compatible approach is to place the monitor address in the device string itself.
- **What was changed:** Changed `device` from `:/` to `"192.168.1.10:/"` and removed `addr=192.168.1.10` from the mount options string.
- **Why:** For the CephFS kernel client (`mount -t ceph`), the traditional device syntax is `{mon_ip}[:{port}]:/{path}`. The option `addr` does not exist; monitor addresses belong in the device string (old syntax) or as `mon_addr` (new syntax for kernel 5.11+/Ceph Pacific+).

### 3. Systemd unit: `network.target` instead of `network-online.target`
- **What was wrong:** The systemd unit used `After=network.target`, which only indicates the networking stack is initialized, not that the network is actually up and connected.
- **What was changed:** Changed to `After=network-online.target`.
- **Why:** `ceph-fuse` requires actual network connectivity to Ceph monitors. `network-online.target` waits until at least one network interface has a routable address, which is necessary for Ceph communication.

## Review Notes
- All Docker Compose files use `version: "3.9"`, which is deprecated in Docker Compose V2 (the `docker compose` CLI used in the post). It still works but generates a warning. This is not incorrect — just worth noting for a potential future update.
- The systemd unit uses `Type=oneshot` for `ceph-fuse`, which daemonizes by default. This works because the parent process exits after forking, but `Type=forking` would be more semantically accurate. Either works in practice.
- The WordPress example does not show creating the `/mnt/ceph/wordpress` and `/mnt/ceph/mysql` directories, but this is acceptable since it builds on the concepts from Approach 1.
