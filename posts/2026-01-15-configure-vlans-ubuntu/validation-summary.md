# Validation Summary: How to Configure VLANs on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu networking (802.1Q VLANs)
- Netplan (systemd-networkd renderer)
- ifupdown (legacy `/etc/network/interfaces`, `vlan` package, `vlan-raw-device`)
- 8021q kernel module
- inter-VLAN routing (IP forwarding, router-on-a-stick)
- iptables and nftables firewalling
- tcpdump / packet capture
- Linux bridges and libvirt/KVM networking
- Docker macvlan and ipvlan network drivers, Docker Compose

## Sources Consulted
- Netplan YAML configuration reference — https://netplan.readthedocs.io/en/latest/netplan-yaml/ (supported device types: ethernets, bonds, bridges, dummy-devices, modems, tunnels, virtual-ethernets, vlans, vrfs, wifis, nm-devices — no macvlan)
- Netplan macvlan/macvtap wishlist bug — https://bugs.launchpad.net/netplan/+bug/1664847
- Docker network drivers (macvlan / ipvlan) — https://docs.docker.com/network/drivers/macvlan/ and https://docs.docker.com/network/drivers/ipvlan/
- IEEE 802.1Q tag format (TPID 0x8100, TCI = 3-bit PCP + 1-bit DEI/CFI + 12-bit VID)
- systemd.service / systemd-networkd documentation for the macvlan persistence fix
- Ubuntu `vlan` package and `modprobe 8021q` behaviour

## Issues Found
1. **Invalid Netplan macvlan configuration (lines ~939–951).** The post claimed the host-side macvlan shim could be made persistent with a Netplan file using `ethernets: vlan20-host: match: macaddress: "auto-generated"`. Netplan has no macvlan device type, and `match: macaddress` requires a real MAC address (`"auto-generated"` is not valid), so this YAML would never produce the interface. Replaced it with a working `systemd` oneshot service that runs the same `ip link add ... type macvlan` commands at boot (with `ExecStop` cleanup) plus the `systemctl enable --now` invocation. This preserves the section's intent (persisting the host shim) while being technically correct.

## Review Notes
- The 802.1Q frame diagram is accurate: TPID is always `0x8100`, and the TCI carries the 12-bit VLAN ID, 3-bit priority (PCP), and 1-bit CFI/DEI.
- The MTU guidance (set parent to 1504 so a tagged frame can carry a 1500-byte payload) is correct "baby giant" practice.
- `netplan try` auto-revert default is 120 seconds — accurately stated.
- `dhcp4-overrides` keys (`use-dns`, `use-routes`), `vlan-raw-device`, and the `parentinterface.vlanid` naming for ifupdown are all valid.
- Docker macvlan/ipvlan commands, the `ipvlan_mode=l2` option, and the noted macvlan host-isolation limitation are all correct. The Compose v3.8 macvlan example is valid (note: Compose top-level `version` is now obsolete in current Compose, but harmless and still accepted).
- iptables and nftables rule sets are syntactically valid and logically consistent.
- Minor non-blocking style point: the post uses both descriptive VLAN names (`mgmt`, `prod`) and `vlanN`/`ethX.N` naming across examples; this is intentional and correctly explained, not an error.
