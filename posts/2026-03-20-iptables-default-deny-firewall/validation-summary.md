# Validation Summary: How to Set Up a Default Deny Firewall Policy with iptables

## Status
validated

## Post Type
Guide

## Technologies Covered
- `iptables`
- `iptables-extensions` connection tracking/state matching
- `netfilter-persistent` / `iptables-persistent`
- `nc`
- `python3 -m http.server`

## Sources Consulted
- Netfilter project overview: https://www.netfilter.org/projects/iptables/index.html
- `iptables(8)` man page: https://ipset.netfilter.org/iptables.man.html
- `iptables-extensions(8)` man page: https://ipset.netfilter.org/iptables-extensions.man.html
- Debian `netfilter-persistent(8)` man page: https://manpages.debian.org/unstable/netfilter-persistent/netfilter-persistent.8.en.html
- Debian package metadata for `iptables-persistent`: https://packages.debian.org/stable/iptables-persistent
- Local command help/manpages checked in the workspace: `iptables --help`, `man iptables`, `man iptables-extensions`, `nc -h`, `python3 -m http.server --help`
- Local inspection of the `iptables-persistent` package plugin `15-ip4tables` confirmed the save path `/etc/iptables/rules.v4`

## Issues Found
- The description said the default policy applied to “all chains”. I changed this to the built-in filter chains because `iptables -P` only sets policy on built-in chains.
- The introduction said a default deny policy “rejects” traffic. I changed that to “denies” to avoid conflating general deny behavior with the distinct `REJECT` target.
- The flush comments were inaccurate. `iptables -F` and `iptables -X` operate on the selected table, not every table, so I corrected the comments and added the missing `-X` commands for the `nat` and `mangle` tables used in the example.
- The “complete script” omitted outbound DNS over TCP while the earlier section correctly allowed both UDP and TCP port 53. I added the missing TCP/53 rule for consistency and correctness.
- The verification example used `nc localhost 8888`, which would not validate an inbound block after the post explicitly allowed loopback traffic. I replaced it with a test that binds a listener on the firewall host and checks the unopened port from another host.

## Review Notes
- The post is IPv4-only, which matches the title and use of `iptables` rather than `ip6tables`.
- `-m state --state ...` is still supported according to `iptables-extensions(8)`, though it is a subset of the broader `conntrack` match.
- The persistence commands are Debian/Ubuntu specific because they rely on `apt`, `iptables-persistent`, and `netfilter-persistent`.
- Netfilter identifies `nftables` as the successor to `iptables`, but the article remains technically valid for systems that still use `iptables`.
