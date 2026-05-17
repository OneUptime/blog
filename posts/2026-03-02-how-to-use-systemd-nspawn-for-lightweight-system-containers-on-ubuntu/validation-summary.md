# Validation Summary: How to Use systemd-nspawn for Lightweight System Containers on Ubuntu

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- systemd-nspawn
- machinectl / systemd-machined
- debootstrap (Debian/Ubuntu rootfs creation)
- dnf (Fedora/CentOS rootfs creation from Ubuntu host)
- skopeo (OCI image fetching)
- systemd-networkd (host and container networking)
- Virtual Ethernet (veth) pairs for container networking
- iptables / netfilter-persistent (port forwarding)
- systemd service drop-ins for resource limits (MemoryMax, CPUQuota, TasksMax)
- `.nspawn` configuration files (`[Exec]`, `[Network]`, `[Files]` sections)

## Sources Consulted
- systemd-nspawn(1) — https://man7.org/linux/man-pages/man1/systemd-nspawn.1.html
- systemd.nspawn(5) — https://man7.org/linux/man-pages/man5/systemd.nspawn.5.html
- machinectl(1) — https://www.freedesktop.org/software/systemd/man/latest/machinectl.html
- systemd.unit(5) — https://man7.org/linux/man-pages/man5/systemd.unit.5.html (drop-in directory semantics, `system.control/` reservation)
- Ubuntu jammy package index for `dnf` — https://packages.ubuntu.com/jammy/dnf
- debootstrap(8) and skopeo documentation

## Issues Found
1. **Missing markdown heading prefix on "Resource Limits"** (line 252). The line `Resource Limits` was rendered as plain text rather than a section heading. Changed to `## Resource Limits` to match the rest of the post's heading hierarchy.
2. **Incorrect drop-in directory for the resource-limits example**. The post wrote the limits drop-in to `/etc/systemd/system.control/systemd-nspawn@mycontainer.service.d/limits.conf`. Per systemd.unit(5), `/etc/systemd/system.control/` is reserved for configuration created via the D-Bus API (e.g., what `systemctl set-property` persists) and is not the correct place for manual drop-in files. Manual drop-ins belong under `/etc/systemd/system/<unit>.d/`. Fixed the path to `/etc/systemd/system/systemd-nspawn@mycontainer.service.d/limits.conf` and added a `sudo mkdir -p` for the directory (since `tee` will not create parent directories).

## Review Notes
- The `machinectl enable mycontainer` claim and the resulting symlink path `/etc/systemd/system/machines.target.wants/` are correct per machinectl(1).
- `--as-pid2 bash <<EOF ... EOF` usage is valid; per systemd-nspawn(1), a minimal stub init runs as PID 1 and the program runs as PID 2.
- Default networking behavior (sharing host's network namespace when neither `--private-network` nor `--network-veth` is given) is accurate.
- `.nspawn` config sections (`[Exec]`, `[Network]`, `[Files]`) and keys (`Boot=`, `VirtualEthernet=`, `Bind=`, `BindReadOnly=`) are all valid per systemd.nspawn(5).
- `dnf` is in Ubuntu jammy's *universe* component. The post does not call this out — readers on minimal/server installs without universe enabled may need `sudo add-apt-repository universe` first. Not corrected (the example still works for the default desktop configuration).
- On minimal Ubuntu installs, the `systemd-container` package (provides `systemd-nspawn` and `machinectl`) may need to be installed explicitly. The post says it is available without additional installation, which is true for most installs but not strictly all. Minor caveat, not corrected.
- The bind-mount workflow under `Bind Mounts` uses `--bind` for read-write and `--bind-ro` for read-only — both flags are correct.
- The `iptables` NAT and FORWARD rules for port forwarding to a private-veth container are correct; `netfilter-persistent save` will persist them after installing `iptables-persistent`.
