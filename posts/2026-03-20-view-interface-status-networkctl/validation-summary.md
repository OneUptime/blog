# Validation Summary: How to View Interface Status with networkctl

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- `networkctl` (systemd-networkd management tool)
- `systemd-networkd`
- `systemd-resolved` / `resolvectl`
- `ip` (iproute2)
- `journalctl`
- DHCP lease files under `/run/systemd/netif/leases/`

## Sources Consulted
- `networkctl(1)` man page (systemd 255)
- `networkctl --help` output
- systemd upstream documentation: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- `resolvectl(1)` man page
- `ip-monitor(8)` man page

## Issues Found
1. **Invalid setup state listed.** The post listed `degraded` as a SETUP state and omitted several valid ones. Per the `networkctl(1)` man page, the setup states are `pending`, `initialized`, `configuring`, `configured`, `unmanaged`, `failed`, and `linger` — `degraded` is an OPERATIONAL state only. Corrected both state lists to match the official documentation.

2. **Incorrect description of `networkctl status` without arguments.** The post claimed bare `networkctl status` shows "Detailed status for every interface", and labeled `-a` a "verbose flag". Per the man page, `networkctl status` (with no link pattern) shows overall system network status, and `-a`/`--all` is what shows detailed status for all links. Updated the comments to reflect actual behavior.

3. **`networkctl monitor` does not exist.** Verified on systemd 255 — `networkctl` has no `monitor` verb (the tool prints `Unknown command verb 'monitor'`). Replaced the example with working alternatives: `journalctl -u systemd-networkd -f` for service logs and `ip monitor link` for kernel link events. Also updated the conclusion paragraph which referenced `networkctl monitor`.

## Review Notes
- All other commands (`list`, `status <iface>`, `reload`, `reconfigure`, `renew`, `up`, `down`) were verified against the systemd 255 man page and are correct. Note version availability: `up`/`down`/`forcerenew` need systemd 246+, `renew`/`reconfigure`/`reload` need systemd 244+.
- The DHCP lease file path `/run/systemd/netif/leases/<ifindex>` is correct; the awk/tr pipeline to extract the interface index works, though `cat /sys/class/net/eth0/ifindex` is a cleaner alternative. Reading the file typically requires root.
- `resolvectl status <interface>` is accurate for per-link DNS info on systems using systemd-resolved.
- The interface names `eth0`/`eth1`/`wlan0` are traditional; many modern distributions use predictable names (e.g., `enp0s3`, `wlp2s0`) via systemd's net-naming scheme, but this is a stylistic choice rather than an error.
