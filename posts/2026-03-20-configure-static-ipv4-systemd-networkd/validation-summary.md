# Validation Summary: How to Configure a Static IPv4 Address with systemd-networkd

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd-networkd
- networkctl
- systemd-resolved / resolvectl
- Linux networking (IPv4 static configuration)
- iproute2 (`ip addr`, `ip route`)

## Sources Consulted
- systemd.network(5) man page — https://man.archlinux.org/man/systemd.network.5
- networkctl(1) man page — https://man.archlinux.org/man/networkctl.1
- systemd upstream documentation for `[Match]`, `[Network]`, and `[Link]` sections

## Issues Found
No technical issues found.

All verified items:
- `.network` files location `/etc/systemd/network/` is correct.
- `[Match]` section accepts `Name=` and `MACAddress=` — both documented and correct.
- `[Network]` section accepts `Address=`, `Gateway=`, `DNS=` with multiple entries allowed — confirmed (documentation explicitly states "This option may be specified more than once" for these options).
- `[Link]` section's `MTUBytes=` option is correct.
- `Address=192.168.1.100/24` format (IP + prefix length) is the documented form.
- `systemctl restart systemd-networkd` is valid.
- `networkctl reload` reloads `.netdev` and `.network` files and reconfigures matched interfaces — correct.
- `networkctl reconfigure <interface>` forces reconfiguration — correct.
- `networkctl status <interface>` displays IP, DNS, gateway, and state — correct.
- `resolvectl status <interface>` is a valid command for querying systemd-resolved per-interface DNS state.
- Lexicographic ordering of files in `/etc/systemd/network/` is correct (documentation: "All configuration files are collectively sorted and processed in alphanumeric order").

## Review Notes
- `networkctl reload` and `networkctl reconfigure` were introduced in systemd 244 (released November 2019). They are widely available on modern distributions (Ubuntu 20.04+, Debian 11+, RHEL/Rocky 9+, Arch, Fedora). Older systems may need `systemctl restart systemd-networkd` instead. Not a defect — just a version caveat.
- The "File Naming and Priority" section is accurate but slightly understated: when multiple `.network` files match the *same* interface, only the lexicographically first match is applied (the others are skipped). The example uses three different interfaces, so this nuance does not affect the example's correctness.
- The post correctly notes that `resolvectl status eth0` only applies if systemd-resolved is in use; on systems where it is not, that command would not return per-interface DNS info.
