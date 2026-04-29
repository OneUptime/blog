# Validation Summary: How to Log IPv6 Firewall Events with ip6tables

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux `ip6tables`
- Netfilter `LOG` target
- Netfilter `NFLOG` target
- `ulogd2`
- `rsyslog`
- IPv6 Neighbor Discovery / Router Advertisements
- IPv6 Unique Local Addresses (ULA)

## Sources Consulted
- `iptables-extensions(8)` manual page: https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux netfilter logging implementation (`nf_log_syslog.c`) for actual IPv6 log field output: https://codebrowser.dev/linux/linux/net/netfilter/nf_log_syslog.c.html
- Local command help: `ip6tables -j LOG -h`
- Local command help: `ip6tables -j NFLOG -h`
- Local `iptables-extensions` man page (`man iptables-extensions`)
- Netfilter `ulogd` project page: https://www.netfilter.org/projects/ulogd/index.html
- Ubuntu package index showing `ulogd2` and separate `ulogd2-json` packages: https://packages.ubuntu.com/search?keywords=ulogd2
- Local Ubuntu package metadata: `apt-cache show ulogd2`, `apt-cache show ulogd2-json`
- Packaged `ulogd2` sample configuration extracted from the Ubuntu `.deb` (`/etc/ulogd.conf`)
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- RFC 5095, Deprecation of Type 0 Routing Headers in IPv6: https://datatracker.ietf.org/doc/html/rfc5095
- rsyslog forwarding documentation: https://docs.rsyslog.com/doc/getting_started/forwarding_logs.html
- rsyslog actions / legacy forwarding syntax documentation: https://docs.rsyslog.com/doc/configuration/actions.html

## Issues Found
- The `LOG` option descriptions were not fully accurate. I corrected the syslog severity names, changed `--log-ip-options` to reflect IP/IPv6 header option and extension-header logging, and clarified that `--log-uid` applies to the local process/socket when available.
- The sample IPv6 log entry was malformed. It used an invalid IPv6 destination address and showed `NEXTHDR=TCP` in a simple TCP example; I replaced it with a valid address and a `PROTO=TCP` example that matches the current netfilter logging implementation.
- The section heading incorrectly grouped `ULOG` with `NFLOG` for IPv6. `ULOG` is deprecated and IPv4-only, so I changed the section to `NFLOG` only.
- The `ulogd2` example was incomplete for JSON output on Debian/Ubuntu. I added the `ulogd2-json` package and replaced the config snippet with a valid `ulogd.conf` stack example using `log2`/`json1`.
- The ULA example labeled `fc00::/7` traffic as "bogon", which is inaccurate because RFC 4193 defines it as the ULA block. I changed the wording to "unexpected ULA sources on internet-facing interfaces" and updated the sample log prefix.
- The rsyslog example duplicated the UDP forwarding line. I reduced it to one UDP example and one TCP example.
- A comment in the complete setup referred to generic NDP traffic even though the rule matches only ICMPv6 type 134. I corrected the wording to Router Advertisements.

## Review Notes
- The post is now technically sound for current `ip6tables`/netfilter behavior. On many modern Linux systems, `ip6tables` is the nftables-backed frontend (`ip6tables v1.8.x (nf_tables)`), but the commands used here remain valid.
- The parsing examples assume kernel firewall logs are written to `/var/log/kern.log`, which is common on rsyslog-based Debian/Ubuntu systems. On `journald`-only systems, equivalent inspection would typically use `journalctl -k`.
