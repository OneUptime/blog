# Validation Summary: How to Troubleshoot Network Drops and Intermittent Connectivity on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ubuntu Linux networking stack
- iproute2 (`ip`) command
- `ethtool` for NIC driver/feature inspection
- NetworkManager and `nmcli`
- `iwconfig` (wireless-tools) for WiFi power management
- udev rules for persistent network device settings
- Netplan YAML configuration
- DHCP client (dhclient) lease files
- systemd-journald (`journalctl`)
- `dig` (BIND utilities) for DNS testing
- ICMP ping with `-M do` for path MTU discovery
- `sar` (sysstat) for per-interface statistics
- TCP segmentation/generic offload features (tx, rx, gso, gro, tso)
- Spanning Tree Protocol (STP) at the L2 switch layer

## Sources Consulted
- ethtool(8) man page and `ethtool --help` (verified that `-s` is `--change` and requires arguments; `ethtool DEVNAME` shows settings; Wake-on-LAN field is the power-related field returned)
- ip-link(8), ip-route(8), ip-address(8) man pages
- iputils ping(8) man page (`-M do` sets the DF bit, `-s` sets ICMP payload size; total IP packet size = payload + 8 (ICMP header) + 20 (IPv4 header))
- NetworkManager.conf(5) — `wifi.powersave` enum: 0=default, 1=ignore, 2=disable, 3=enable
- Netplan reference documentation (https://netplan.readthedocs.io/) — `routes:` syntax with `to:` and `via:` is the current recommended replacement for the deprecated `gateway4:` key
- systemd-udevd udev(7) man page for ACTION/SUBSYSTEM/KERNEL/RUN syntax
- iwconfig(8) man page (`power off` disables 802.11 power management)
- isc-dhcp-client dhclient.leases(5) — `/var/lib/dhcp/dhclient.leases` is the documented default lease file path
- dig(1) man page (`+short`, `@server` syntax)

## Issues Found
- **Fixed**: `sudo ethtool -s eth0 | grep power` (line 136) was incorrect. The `-s` flag is `--change` and requires arguments — running it as shown would produce a usage error rather than display power-related settings. Replaced with `sudo ethtool eth0 | grep -i wake`, which displays the Wake-on-LAN settings (the only power-related field `ethtool` surfaces for most NICs). The follow-up `cat /sys/class/net/eth0/device/power/control` line was already correct and remains as the canonical PCI runtime-PM check.

## Review Notes
- The `cat /var/lib/dhcp/dhclient.leases` example assumes the legacy ISC dhclient is in use. On systems running NetworkManager's internal DHCP client or systemd-networkd, lease data lives under `/var/lib/NetworkManager/` or `/run/systemd/netif/leases/` respectively. The post does mention NetworkManager DHCP events via journalctl on the next line, which mitigates this.
- `modinfo e1000e | grep version` will match multiple fields (`version`, `srcversion`, `vermagic`, `retpoline`). Using `grep "^version:"` would be cleaner but the existing form still surfaces the version line.
- `nmcli connection show "Wired connection 1" | grep power` assumes the default connection name exists; readers may need to substitute their actual connection name (visible via `nmcli connection show`).
- `sudo journalctl -f | grep -i "dns\|resolv\|NXDOMAIN"` uses follow mode (`-f`), which never returns — fine for live monitoring but worth noting it must be Ctrl+C'd.
- `/usr/sbin/iwconfig` is the correct path on current Ubuntu releases; `iwconfig` itself is deprecated in favor of `iw`, but it still ships in the `wireless-tools` package and the `power off` invocation still works.
- The MTU arithmetic in the ping examples is correct: `-s 1400` → 1428-byte IP packet (requires MTU ≥ 1428); `-s 1472` → 1500-byte IP packet (standard Ethernet MTU test).
- `wifi.powersave = 2` correctly maps to "disable" per NetworkManager's documented enum.
- The Netplan example uses the modern `routes:` block rather than the deprecated `gateway4:` key — good.
