# Validation Summary: How to Troubleshoot IPv6 on Home Networks

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- IPv6 (RFC 8200, RFC 4861, RFC 4862)
- DHCPv6 and DHCPv6-PD (RFC 8415)
- SLAAC and Router Advertisements (RFC 4861, RFC 4862)
- ICMPv6 (RFC 4443)
- OpenWRT (odhcp6c, netifd/ifstatus, logread, br-lan)
- Linux iproute2 (`ip`, sysctl `net.ipv6.conf.*`)
- ISC dhclient (IPv6 mode)
- tcpdump BPF filters for ICMPv6
- curl, traceroute6, ping6
- PMTUD / Path MTU Discovery

## Sources Consulted
- OpenWRT IPv6 documentation: https://openwrt.org/docs/guide-user/network/ipv6/start
- OpenWRT netifd ubus (ifstatus) reference: https://openwrt.org/docs/techref/netifd and https://openwrt.org/docs/guide-user/base-system/ubus
- odhcp6c (OpenWRT DHCPv6 client): https://git.openwrt.org/project/odhcp6c.git
- RFC 8415 (DHCPv6) — NoBinding (status code 3) and NotOnLink (status code 4) definitions
- RFC 4861 (Neighbor Discovery for IPv6) — Router Advertisement, ICMPv6 type 134
- RFC 4862 (SLAAC)
- Linux kernel IPv6 sysctl documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt (`accept_ra`, `autoconf`, `disable_ipv6`)
- tcpdump pcap-filter(7) — IPv6 header offset semantics (`ip6[40]` = first byte after 40-byte fixed IPv6 header, which is the ICMPv6 Type field when no extension headers are present)
- ISC dhclient(8) manpage — `-6`, `-r` flags
- iputils ping(8) / ping6(8) manpage — `-s` size flag
- IANA IPv6 Global Unicast address space (2000::/3), which begins with the leading hex digits 2 or 3

## Issues Found

1. **`ip -6 addr show wan6` on OpenWRT (Step 2).** On OpenWRT, `wan6` is a UCI *logical* interface name (in `/etc/config/network`), not a kernel netdev. The underlying Linux device is typically something like `eth1`, `pppoe-wan`, or an `@wan` alias. The iproute2 `ip` command only accepts kernel interface names, so `ip -6 addr show wan6` returns no output (or an error) on a stock OpenWRT install. Replaced with the correct ubus-backed command `ifstatus wan6`, which prints the logical interface's IPv6 status including delegated prefixes.

2. **`journalctl -u dhclient6 -n 30` on Ubuntu/Debian (Step 3).** There is no standard `dhclient6.service` systemd unit in Ubuntu or Debian — ISC dhclient is normally invoked by ifupdown, NetworkManager, or systemd-networkd helpers rather than running as a named systemd service. Querying a non-existent unit yields no output and misleads the reader. Replaced with `journalctl -t dhclient -n 30`, which filters by the syslog identifier that dhclient actually uses when it logs via syslog, matching the actual entries on a typical Ubuntu/Debian system.

## Review Notes
- The tcpdump filter `'icmp6 and ip6[40] == 134'` is correct *provided* there are no IPv6 extension headers between the fixed header and the ICMPv6 header. Router Advertisements in practice carry no extension headers, so this filter works; the equivalent `icmp6 and icmp6[0] == 134` would be slightly more robust and is a reasonable future improvement.
- `sysctl net.ipv6.conf.eth0.accept_ra=1` works for a client/host. If the interface is ever enabled for IPv6 forwarding (`net.ipv6.conf.eth0.forwarding=1`), Linux requires `accept_ra=2` to continue accepting RAs. Not a bug for a device-level debug step, but worth a future note.
- `ping6` is retained on most modern distros as an iputils alias for `ping -6`; both invocations produce the same result.
- The Global Unicast prefix `2000::/3` covers leading hex digits 2 and 3, so the post's claim that global IPv6 addresses start with `2xxx:` or `3xxx:` is correct.
- DHCPv6 status codes `NoBinding` (3) and `NotOnLink` (4) are accurate per RFC 8415.
- The `-s 1400` choice for `ping6` as a PMTUD sanity check is a reasonable mid-range payload; operators sometimes use `-M do -s 1452` to force DF and probe the PPPoE-typical 1492 MTU, but the post's simpler check is adequate for home troubleshooting.
