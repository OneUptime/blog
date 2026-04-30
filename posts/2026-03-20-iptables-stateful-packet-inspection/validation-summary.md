# Validation Summary: How to Configure Stateful Packet Inspection with iptables

## Status
validated

## Post Type
Guide

## Technologies Covered
- `iptables`
- Netfilter connection tracking (`conntrack`)
- Linux IPv4 firewalling
- `conntrack-tools`
- FTP conntrack helper (`nf_conntrack_ftp`)

## Sources Consulted
- `iptables(8)` manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `conntrack-tools` user manual: https://conntrack-tools.netfilter.org/manual.html
- `conntrack(8)` man page: https://netfilter.org/projects/conntrack-tools/conntrack-manpage.html
- Linux kernel `nf_conntrack` sysctl documentation: https://www.kernel.org/doc/html/v5.15/networking/nf_conntrack-sysctl.html
- RFC 7766, DNS Transport over TCP: https://www.rfc-editor.org/rfc/rfc7766.html
- Netfilter wiki, conntrack state definitions: https://wiki.netfilter.org/wiki-nftables/index.php/Matching_connection_tracking_stateful_metainformation
- Local CLI help and translation checks: `iptables -m state -h`, `iptables -m conntrack -h`, `iptables -j CT -h`, `iptables -p icmp -h`, `iptables-translate`

## Issues Found
- The conntrack state descriptions were oversimplified in ways that were not fully accurate. I updated `NEW`, `ESTABLISHED`, `RELATED`, and `INVALID` to match the upstream conntrack semantics more closely.
- The basic outbound DNS example only allowed UDP/53. I added TCP/53 so the example does not block DNS over TCP fallback or TCP-first DNS usage.
- The firewall examples applied `DROP` policies before all allow rules were installed. I reordered the short example and adjusted the full script to start permissive, flush rules, add allow rules, and only then apply final `DROP` policies so the ruleset does not temporarily drop all traffic during installation.
- The `conntrack` tools install command was written as if it were generic Linux. I clarified that `apt install conntrack` is the Debian/Ubuntu form.
- The FTP helper section implied that loading `nf_conntrack_ftp` alone was enough. I corrected this by adding an explicit `CT --helper ftp` rule, because current kernels disable automatic helper assignment by default, and clarified that FTP data channels are then tracked as `RELATED`.

## Review Notes
- The post is correctly scoped to IPv4 and `iptables`.
- The `state` match is still supported, but it is a subset of `conntrack`; using `conntrack` is the more current and more capable form.
- On many modern Linux distributions, `iptables` commands are implemented by the `iptables-nft` compatibility layer over `nf_tables`. The examples remain valid in that setup.
