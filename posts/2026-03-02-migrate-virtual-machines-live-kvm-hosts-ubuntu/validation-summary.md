# Validation Summary: How to Migrate Virtual Machines Live Between KVM Hosts on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- KVM / QEMU
- libvirt / virsh
- NFS (shared storage)
- SSH (transport for migration)
- libvirtd TCP/TLS transport
- systemd (socket activation on modern Ubuntu)
- UFW firewall
- Ubuntu (server)

## Sources Consulted
- libvirt virsh manpage: https://www.libvirt.org/manpages/virsh.html
- libvirt daemons documentation (socket activation): https://libvirt.org/daemons.html
- libvirt wiki: "Libvirt daemon is not listening on tcp ports although configured to": https://wiki.libvirt.org/Libvirt_daemon_is_not_listening_on_tcp_ports_although_configured_to.html
- libvirt virshcmdref for migrate-setmaxdowntime: https://download.libvirt.org/virshcmdref/html/sect-migrate-setmaxdowntime.html
- libvirt mailing list discussion of default migration port range (49152-49215): https://listman.redhat.com/archives/libvir-list/2016-April/msg01566.html
- Red Hat Bugzilla 2037998 (schedinfo cgroup parameter names — vcpu_quota etc.)
- Red Hat Bugzilla 1750340 (libvirtd socket activation conflict with `--listen`)
- libvirt source code (virsh-host.c) for cpu-compare / cpu-baseline XPath behavior

## Issues Found
1. **`virsh migrate-setspeed` units were misstated.** The post claimed `virsh migrate-setspeed myvm 1000` limits to "1 Gbps", but the bandwidth argument is in MiB/s, so 1000 MiB/s is ~8.4 Gbps. Changed the example to `125` MiB/s (~1 Gbps) and updated the matching comment. Also fixed the later "(in Mbps)" comment to read "(bandwidth is in MiB/s)".
2. **Incorrect default migration port range.** The UFW rule allowed `49152:49261/tcp`, but the libvirt default range (`migration_port_min`/`migration_port_max` in `qemu.conf`) is 49152–49215. Adjusted the ufw rule and added a clarifying comment.
3. **`LIBVIRTD_ARGS="--listen"` does not work on Ubuntu 22.04+.** Since libvirt 5.6 with systemd socket activation (default on modern Ubuntu), the `--listen` flag is rejected and most socket-related settings in `libvirtd.conf` are ignored. Replaced the instructions with the correct modern approach (`systemctl disable libvirtd.socket libvirtd-ro.socket libvirtd-admin.socket` and `systemctl enable libvirtd-tcp.socket`), while preserving the legacy `LIBVIRTD_ARGS` note for older Ubuntu releases.
4. **`cpu_quota` vs `vcpu_quota`.** In modern libvirt, the cgroup tunables have explicit scopes (`vcpu_quota`, `emulator_quota`, `iothread_quota`, `global_quota`). For limiting vCPU bandwidth to slow down memory dirtying during migration, `vcpu_quota` is the correct parameter. Updated the `virsh schedinfo` example accordingly.

## Review Notes
- `virsh cpu-compare` and `virsh cpu-baseline` do accept a full domain XML file as input — the underlying XPath matches `/cpu`, `/domain/cpu`, and `/capabilities/host/cpu`, so passing `/etc/libvirt/qemu/myvm.xml` works. The post's usage is correct.
- `virsh pool-define-as <name> dir - - - - <target>` is syntactically valid (the four `-` placeholders are source-host/source-path/source-dev/source-name, with target last).
- `migrate-setmaxdowntime` taking milliseconds (500 = 500 ms) is correct.
- The NFS `no_root_squash` recommendation works but is a security trade-off worth noting: it lets libvirt run VM processes as a UID that maps to root on the NFS server. In tighter environments, configuring `user/group` mapping via `idmapd` or running QEMU as a non-root user with appropriate squashing would be safer.
- The post tells the reader to `ssh-copy-id` and then connect with `qemu+ssh://root@destination-host/system`. This presupposes that SSH root login is permitted on the destination, which is disabled by default on many distributions. Using a dedicated non-root user with sudo/polkit rules for libvirt is generally preferred but adds complexity beyond the scope of this tutorial.
- For TLS-based migrations (briefly mentioned), libvirt also requires certificate provisioning under `/etc/pki/libvirt/` and `/etc/pki/CA/`. The post intentionally keeps this out of scope.
