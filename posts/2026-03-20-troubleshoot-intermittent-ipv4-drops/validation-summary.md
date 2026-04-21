# Validation Summary: How to Troubleshoot Intermittent IPv4 Connectivity Drops

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- IPv4 connectivity troubleshooting
- Linux networking
- mtr
- ethtool
- iproute2
- iputils ping
- systemd and journalctl
- Linux softnet statistics
- tc/qdisc
- sysstat sar
- Cisco STP and PortFast

## Sources Consulted
- mtr official repository and man page: https://github.com/traviscross/mtr and https://github.com/traviscross/mtr/blob/master/man/mtr.8.in
- ethtool manual page: https://man7.org/linux/man-pages/man8/ethtool.8.html
- Linux kernel interface statistics documentation: https://www.kernel.org/doc/html/latest/networking/statistics.html
- iproute2 ip-link manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux kernel `/proc/net/softnet_stat` implementation: https://github.com/torvalds/linux/blob/master/net/core/net-procfs.c
- iputils ping manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- systemctl manual page: https://man7.org/linux/man-pages/man1/systemctl.1.html
- journalctl manual page: https://man7.org/linux/man-pages/man1/journalctl.1.html
- tc manual page: https://man7.org/linux/man-pages/man8/tc.8.html
- sysstat sar manual page: https://man7.org/linux/man-pages/man1/sar.1.html
- Cisco Ethernet auto-negotiation guidance: https://www.cisco.com/c/en/us/support/docs/lan-switching/ethernet/10561-3.html
- Cisco speed and duplex configuration guidelines: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9600/software/release/17-13/configuration_guide/int_hw/b_1713_int_and_hw_9600_cg/configuring_interface_characteristics.pdf
- Cisco PortFast command reference and BPDU Guard guidance: https://www.cisco.com/c/en/us/td/docs/ios/bridging/command/reference/br_book/br_r1.html and https://www.cisco.com/c/en/us/support/docs/lan-switching/spanning-tree-protocol/10586-65.html
- Cisco Catalyst spanning-tree address management documentation: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst9300/software/release/17-13/configuration_guide/lyr2/b_1713_lyr2_9300_cg.pdf
- Local command help/output for `mtr --help`, `ethtool --help`, `ip -s -s link show`, `ping -h`, `systemctl edit --help`, `tc -h`, `sar -n DEV`, and `vmstat`.

## Issues Found
- The interface statistics example used `ip -s link show eth0` while discussing frame-level errors. Changed it to `ip -s -s link show eth0` and updated the example to show the detailed RX error fields where CRC/frame errors appear.
- The duplex mismatch fix recommended forcing `1000/full` with auto-negotiation disabled. Updated the guidance to prefer auto-negotiation when supported, and limited hard-coded speed/duplex examples to legacy 10/100 links where both ends are configured identically.
- The softnet comments did not mention that `/proc/net/softnet_stat` values are hexadecimal and overstated column 2 as a generic CPU packet drop. Clarified the column meanings and described increasing dropped/time_squeeze counters as softnet backlog or CPU packet-processing pressure.
- The RX ring buffer change used `ethtool -G` without elevated privileges. Added `sudo`.
- The systemd service example used `systemctl edit --force` with a heredoc, which would create/edit a drop-in rather than a full usable unit on many systems and would not reliably read stdin. Replaced it with writing a full unit file via `sudo tee`, added `chmod +x`, added `systemctl daemon-reload`, and used `sudo tail` for the root-owned log file.
- The STP explanation said every topology change causes a 30 second MAC table flush and packet drops. Updated it to describe accelerated aging or learned-entry flushing and brief flooding/relearning during reconvergence.
- The conclusion referred to `mtr --report-cycles 300` without `--report`, called the issue a CPU ring buffer overflow, and implied normal DHCP renewals should be fixed by extending lease time. Updated those to `mtr --report --report-cycles 300`, NIC RX ring buffer overflow, and DHCP lease changes or failed renewals, and aligned the earlier DHCP wording.

## Review Notes
The overall troubleshooting flow is sound. Some commands still depend on distribution defaults and privileges, such as access to `dmesg`, `journalctl`, and ethtool driver-specific counters, so operators may need `sudo` or equivalent privileges depending on local policy.
