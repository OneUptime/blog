# Validation Summary: How to Troubleshoot Network Interface Not Coming Up on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ubuntu (18.04+)
- Netplan (YAML configuration)
- systemd-networkd
- NetworkManager / nmcli
- iproute2 (`ip` commands)
- ethtool
- dhclient / dhcpcd
- arping, nmap, tcpdump
- Kernel modules (e1000e, r8169, igb, ixgbe, tg3, bnx2, mlx, virtio_net, bonding, 8021q)
- PCI/USB hardware detection (lspci, lsusb)
- linux-firmware / firmware-b43-installer packages

## Sources Consulted
- Netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- iproute2 manpages (`ip-link(8)`, `ip-address(8)`, `ip-route(8)`)
- systemd-networkd / networkctl documentation: https://www.freedesktop.org/software/systemd/man/networkctl.html
- Ubuntu Server documentation on networking: https://documentation.ubuntu.com/server/explanation/networking/
- ethtool(8), arping(8), dhclient(8), dhcpcd(8), nmap(1) manpages
- Linux kernel sysfs documentation for `/sys/class/net/*/carrier`
- Debian/Ubuntu package archives (linux-firmware, firmware-b43-installer)

## Issues Found
No technical issues found.

All commands, flags, file paths, and configuration snippets are correct:
- `ip` command syntax (link, addr, route) is accurate.
- Netplan YAML structure (`network.version: 2`, `ethernets.<iface>.dhcp4`, `dhcp6`, `optional`, `match.macaddress`, `set-name`) is valid per the Netplan reference.
- Package names `linux-firmware` and `firmware-b43-installer` exist in the Ubuntu archive.
- Kernel module names (e1000e, r8169, igb, ixgbe, tg3, bnx2, virtio_net, bonding, 8021q) are correct.
- `/sys/class/net/<iface>/carrier` correctly reports 1 (link up) or 0 (link down) for admin-up interfaces.
- `nmap --script broadcast-dhcp-discover -e <iface>` is the correct NSE invocation.
- `dhcpcd -d` correctly runs in the foreground and logs to stderr.
- `arping -I <iface>` correctly specifies the source interface.
- `/proc/net/bonding/bond0` and `/proc/net/vlan/config` are the correct kernel-exposed status paths.
- `ip link show type vlan` is valid syntax.

## Review Notes
- The post correctly notes "Ubuntu 18.04 and later uses Netplan by default." This is true for Ubuntu Server (Desktop also ships Netplan but uses NetworkManager as the renderer); the post's framing is fine since it describes both renderer paths in Step 8.
- `cat /sys/class/net/<iface>/carrier` may return "Invalid argument" if the interface is administratively down — the post's wording ("Check if the physical link is up") is fine but readers should bring the interface up first if they hit that error.
- The `firmware-b43-installer` package downloads firmware at install time from upstream; on minimal/offline systems it can fail. Not a correctness issue, just a practical caveat.
- All commands shown are current as of Ubuntu 24.04 LTS; no deprecated APIs or flags are used.
