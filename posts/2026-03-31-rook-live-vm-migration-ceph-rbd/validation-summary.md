# Validation Summary: How to Configure Live VM Migration with Ceph RBD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook-Ceph (RBD block storage)
- KVM / QEMU hypervisor
- libvirt / virsh CLI
- Live VM migration (pre-copy and post-copy)
- Ceph RBD (RADOS Block Device)

## Sources Consulted
- libvirt virsh man page for `migrate`, `migrate-setspeed`, `migrate-setmaxdowntime`, `migrate-start-postcopy`, and `domjobinfo` commands — https://www.libvirt.org/manpages/virsh.html
- libvirt remote connection URI documentation — https://libvirt.org/uri.html
- libvirt daemon configuration (`libvirtd.conf`) — https://libvirt.org/daemons.html
- Ceph RBD CLI documentation (`rbd ls`, `rbd status`) — https://docs.ceph.com/en/latest/man/8/rbd/

## Issues Found
1. **Incorrect unit comment on `virsh migrate-setspeed`** (line 145): The command `virsh migrate-setspeed myvm 8192` had the comment `# 8 Gbps`. The `migrate-setspeed` command takes bandwidth in MiB/s (mebibytes per second), not Gbps. A value of 8192 MiB/s equals 8 GiB/s (approximately 68.7 Gbps), not 8 Gbps. Fixed the comment to `# 8 GiB/s`.

## Review Notes
- The Step 1 libvirt TCP configuration uses `auth_tcp = "none"`, which disables authentication entirely. This is insecure for production use, though the post does show SSH-tunnelled migration in Step 4 as a secure alternative.
- The `/etc/default/libvirtd` path and `LIBVIRTD_ARGS="--listen"` approach is Debian/Ubuntu-specific. On RHEL/CentOS/Fedora the file is `/etc/sysconfig/libvirtd`. On modern systemd-based systems with libvirt 5.6+, socket activation (`libvirtd-tcp.socket`) is the preferred approach over the `--listen` flag.
- All `virsh migrate` command flags (`--live`, `--p2p`, `--tunnelled`, `--postcopy`, `--verbose`, `--timeout`) are correct and current.
- The `rbd ls`, `rbd status`, `ceph health`, and `ceph mon stat` commands are all syntactically correct.
- The post-copy migration workflow (start with `--postcopy`, then trigger via `migrate-start-postcopy`) accurately describes the two-phase approach.
