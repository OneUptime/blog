# Validation Summary: How to Configure QinQ (802.1ad) Stacked VLANs on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `iproute2` / `ip link`
- IEEE 802.1ad QinQ / stacked VLANs
- IEEE 802.1Q VLANs
- `tcpdump` / libpcap packet filters
- `8021q` kernel support

## Sources Consulted
- `ip-link(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- `pcap-filter(7)` Linux man page: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Linux kernel documentation, Intel i40e driver QinQ examples: https://docs.kernel.org/6.2/networking/device_drivers/ethernet/intel/i40e.html
- Linux kernel documentation, Ethernet Bridging VLAN section: https://docs.kernel.org/6.15/networking/bridge.html
- Local verification with `ip link help vlan`, `man ip-link`, and `tcpdump -ddd 'vlan 1000 && vlan 100'`

## Issues Found
- The prerequisites listed `Linux kernel 3.10+`, which was an unsupported version-specific requirement and omitted the actual userspace dependency on `iproute2`. I replaced it with `Linux system with iproute2` and clarified that VLAN support can be provided either by the `8021q` module or built into the kernel.
- The `tcpdump` verification command used `vlan`, which matches VLAN-tagged traffic broadly and does not specifically validate the configured QinQ stack. I changed it to `tcpdump -i eth0 -e 'vlan 1000 && vlan 100'` so it explicitly matches the outer S-VLAN 1000 and inner C-VLAN 100 used in the example.

## Review Notes
- The `proto` keyword used in the `ip link add ... type vlan` examples is valid. `ip-link(8)` documents `protocol`, and official Linux kernel documentation also shows QinQ examples with `proto`.
- `tcpdump`/libpcap support repeated `vlan` terms to walk stacked VLAN headers, which is why `vlan 1000 && vlan 100` is the correct filter for the example QinQ stack.
- Depending on NIC VLAN offload settings, captures on the parent interface may not always show tags exactly as they appear on the wire. This is a packet-capture caveat, not a configuration error.
