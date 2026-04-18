# Validation Summary: How to Verify VLAN Tagging with tcpdump

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- tcpdump (packet capture CLI)
- libpcap BPF filter syntax (`vlan`, `vlan <id>`)
- IEEE 802.1Q VLAN tagging (VID, PCP priority)
- Linux 8021q kernel module (VLAN subinterfaces)
- `iputils` ping (`-I` source interface flag)
- Wireshark display filters (`vlan.id`)

## Sources Consulted
- tcpdump man page and pcap-filter(7): https://www.tcpdump.org/manpages/tcpdump.1.html and https://www.tcpdump.org/manpages/pcap-filter.7.html
- tcpdump source `print-ether.c` / VLAN printing (the-tcpdump-group/tcpdump on GitHub): https://github.com/the-tcpdump-group/tcpdump
- IEEE 802.1Q standard (PCP = 3-bit priority, VID = 12-bit VLAN ID)
- Linux kernel 8021q module / `net/8021q/vlan_dev.c` tag stripping behavior
- iputils ping man page for the `-I interface` flag: https://man7.org/linux/man-pages/man8/ping.8.html
- Wireshark VLAN display filter reference: https://www.wireshark.org/docs/dfref/v/vlan.html

## Issues Found
- The sample tcpdump output used `802.1Q vlan#100` (with a `#`), which does not match real tcpdump output. Modern tcpdump (and every version I could verify in the source) prints the tag as `vlan 100` (with a space) after the `ethertype 802.1Q (0x8100), length N:` prefix. I updated the example output block to a realistic `-e` line that includes source/destination MACs, the outer `ethertype 802.1Q (0x8100)`, the `vlan 100, p 0, ethertype IPv4 (0x0800)` fields, and the inner ICMP line. The "Key fields" bullet, the "If you see..." sentence in the verification section, and the conclusion were updated from `802.1Q vlan#100` / `802.1Q vlan#<ID>` to `vlan 100` / `vlan <ID>` to match.

## Review Notes
- All tcpdump commands (`-i`, `-e`, `-v`, `-n`, `-w`, `vlan`, `vlan 100`) and the `ping -I eth0.100` invocation are correct and current.
- The guidance to capture on the parent interface rather than the VLAN subinterface is correct for the standard Linux 8021q module path, which strips the tag before delivering to the child netdev. Note for future revisions: depending on kernel version, NIC driver, and whether VLAN offload/acceleration is active, tcpdump on a subinterface may occasionally still observe the tag via `PF_PACKET` — the post's blanket "you will NOT see 802.1Q tags here" is a reasonable simplification but not universally true.
- The Wireshark filter `vlan.id == 100` is correct.
- PCP description ("0-7 in the 3-bit PCP field") is accurate per IEEE 802.1Q. The post does not mention the DEI/CFI bit, which is fine for scope but could be added in a future deeper dive.
