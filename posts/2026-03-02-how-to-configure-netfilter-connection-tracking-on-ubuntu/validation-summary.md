# Validation Summary: How to Configure Netfilter Connection Tracking on Ubuntu

## Status
validated

## Post Type
Technical tutorial / operations guide

## Technologies Covered
- Ubuntu
- Linux Netfilter connection tracking
- conntrack-tools
- iptables
- nftables
- Linux kernel net.netfilter sysctls

## Sources Consulted
- Ubuntu conntrack(8) man page: https://manpages.ubuntu.com/manpages/noble/man8/conntrack.8.html
- iptables-extensions(8) man page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux kernel nf_conntrack sysctl documentation: https://www.kernel.org/doc/html/latest/networking/nf_conntrack-sysctl.html
- Linux kernel conntrack netlink specification and statistics attributes: https://www.kernel.org/doc/html/next/networking/netlink_spec/conntrack.html
- nftables wiki, setting packet connection tracking metainformation: https://wiki.nftables.org/wiki-nftables/index.php/Setting_packet_connection_tracking_metainformation

## Issues Found
- The conntrack example for showing connections to a specific host used `--dst-nat 192.168.1.100`. The conntrack man page defines `--dst-nat` as a NAT filter without an IP argument, so this was changed to `--dst 192.168.1.100`.
- The post described a conntrack table entry as recording `NEW`, `ESTABLISHED`, `RELATED`, and `INVALID`. Those are packet/connection states used for firewall matching; `INVALID` is not a normal stored conntrack entry state. The wording was changed to "Connection state/status used for firewall matching."
- The explanation said every subsequent packet matching an entry is classified as `ESTABLISHED`. The iptables conntrack match defines `ESTABLISHED` as having seen packets in both directions, so the wording was corrected.
- The UDP replied/stream timeout default was listed as 180 seconds. The kernel documentation lists `nf_conntrack_udp_timeout_stream` as 120 seconds, so the default was corrected.
- The post recommended a fixed `nf_conntrack_buckets` ratio of about one quarter of `nf_conntrack_max`. The kernel documentation does not define that as the current rule and notes that `nf_conntrack_buckets` is only writeable in the initial network namespace, so the tuning comment was made more precise.
- The delete-by-state example used `conntrack -D -s INVALID`; `-s` filters by source address and `INVALID` is not a source address. It was replaced with a valid TCP-state deletion example: `conntrack -D -p tcp --state TIME_WAIT`.
- The `conntrack -S` statistics comments overstated `insert_failed` as hash collisions or table-full events and `drop` as table-full-only drops. The wording was changed to match the kernel statistics more generally.
- The "Count connections per remote IP" pipeline printed field `$7`, which is typically a port field in conntrack output. It now extracts the first `dst=` field for TCP and UDP entries.
- The troubleshooting example used `conntrack -L -s INVALID`, which again treats `INVALID` as a source address. It was replaced with `conntrack -S | grep invalid`.
- The INVALID logging rule used the older `state` match. It was updated to the current `conntrack` match form: `-m conntrack --ctstate INVALID`.

## Review Notes
The post is now technically valid for current Ubuntu-style conntrack and iptables usage. Some examples still assume the relevant kernel modules, sysctls, tables, and chains exist on the target host, which is normal for a concise operations tutorial but worth noting for future expansion.
