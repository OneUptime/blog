# Validation Summary: How to Troubleshoot IGMP Membership Reports

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- IGMPv2 and IGMPv3
- IPv4 multicast
- Linux `/proc/net/igmp` and `/proc/net/mcfilter`
- Linux `force_igmp_version` sysctl
- `tcpdump` and libpcap capture filters
- iproute2 `ip maddr`
- iptables
- Cisco IGMP show commands

## Sources Consulted
- RFC 2236: Internet Group Management Protocol, Version 2: https://datatracker.ietf.org/doc/html/rfc2236
- RFC 3376: Internet Group Management Protocol, Version 3: https://www.rfc-editor.org/rfc/rfc3376.html
- IANA Internet Group Management Protocol Type Numbers: https://www.iana.org/assignments/igmp-type-numbers/igmp-type-numbers.xhtml
- Linux kernel IP sysctl documentation for `force_igmp_version`: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux kernel IGMP implementation for `/proc/net/igmp` and `/proc/net/mcfilter` output: https://android.googlesource.com/kernel/common/+/refs/tags/android15-6.6-2024-08_r31/net/ipv4/igmp.c
- libpcap `pcap-filter(7)` documentation: https://www.tcpdump.org/manpages/pcap-filter.7.txt
- iproute2 `ip-maddress(8)` manual page: https://man7.org/linux/man-pages/man8/ip-maddress.8.html
- Local command checks: `tcpdump --help`, `tcpdump -d 'igmp[0] == 0x22'`, `ip maddress help`, `iptables -p igmp -h`, `/proc/net/igmp`, and `/proc/net/mcfilter`

## Issues Found
- The post described `igmp[0] == 0x22` as "IGMP type 3." Changed this to "IGMP type 0x22" because 0x22 is the IGMPv3 Membership Report message type.
- The `/proc/net/igmp` awk parser used `strtonum`, which is not available in all default Linux awk implementations, and it could match interface summary rows instead of only group rows. Replaced it with a Python parser that tracks interface rows and converts the kernel's host-order hex group value into dotted decimal.
- The `ip maddr show` description overclaimed that it shows all multicast group memberships. Clarified that it shows multicast addresses per interface, including link-layer and IP memberships.
- The post said `/proc/net/igmp` has a "Version" column. Corrected this to the actual "Querier" column, which displays V1, V2, or V3.
- The missing-join check used `cat /proc/net/igmp | grep -i "eth0"`, which only matches the interface summary row and does not show the group rows. Replaced it with `ip maddr show dev eth0` and clarified that the expected group should appear under an `inet` entry.
- The query interval note called 60-125 seconds the default. Clarified that 60-125 seconds is common in practice, while the IGMPv2 default Query Interval is 125 seconds.
- The Cisco interface example used `eth0`, which is not a reliable Cisco interface name. Changed it to `<interface>`.
- The membership timeout comment said the entry expires if no query arrives. Corrected this to no reports refreshing the entry within the group membership interval.
- The `/proc/net/igmp` Timer explanation said jiffies or milliseconds. Corrected it to the running flag plus remaining time in kernel clock ticks, matching the Linux kernel output.
- The post suggested `ip maddr del/add 239.1.1.1 dev eth0` to force an IGMP report. `ip maddr add/del` manages static link-layer multicast filters and cannot statically join IP multicast groups. Replaced this with guidance to make the application/socket leave and rejoin, or drop and re-add `IP_ADD_MEMBERSHIP`.
- The `force_igmp_version` comments oversimplified values 0 and 3. Updated them to match Linux kernel documentation: 0 means no enforced version with IGMPv1/v2 fallback allowed, and 3 enforces IGMPv3 while the default 0 is recommended for normal use.

## Review Notes
The remaining commands and packet filters are technically valid for Linux systems with tcpdump/libpcap, iproute2, and iptables installed. The iptables examples are syntactically valid, but many modern Linux distributions use the nftables-backed `iptables-nft` compatibility layer or native `nft` rules.
