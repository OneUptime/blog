# Validation Summary: How to Configure IPv6 Firewall Rules on macOS pf

## Status
validated

## Post Type
Guide

## Technologies Covered
- macOS
- pf
- pfctl
- IPv6
- ICMPv6
- launchd

## Sources Consulted
- Apple Technical Note TN3165, "Packet Filter is not API": https://developer.apple.com/documentation/technotes/tn3165-packet-filter-is-not-api
- Apple, "Creating Launch Daemons and Agents": https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
- OpenBSD `pf.conf(5)` manual: https://man.openbsd.org/pf.conf.5
- OpenBSD `pfctl(8)` manual: https://man.openbsd.org/OpenBSD-6.1/pfctl.8
- OpenBSD PF FAQ, "Packet Filtering": https://www.openbsd.org/faq/pf/filter.html
- OpenBSD PF FAQ, "Tables": https://www.openbsd.org/faq/pf/tables.html
- OpenBSD `icmp6(4)` manual: https://man.openbsd.org/icmp6
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)": https://datatracker.ietf.org/doc/rfc4861/
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls": https://datatracker.ietf.org/doc/rfc4890/

## Issues Found
- The example used invalid IPv6 literals (`fd00:mgmt::/48`, `2001:db8:admin::1`, and `2001:db8:lan::/48`). I replaced them with valid documentation-prefix addresses.
- The bogon table blocked `2001:db8::/32` while the same example also used `2001:db8::/32` as its documentation prefix. I removed that conflicting entry so the example does not block its own sample management source.
- The default policy was `block all`, which would also block IPv4 traffic even though the post is specifically about IPv6 rules. I changed it to `block in inet6 all`.
- The code comment labeled the ICMPv6 block as "RFC 4890" even though the rule subset was not a full RFC 4890 policy. I corrected the comment to avoid overstating compliance.
- The Neighbor Discovery rules incorrectly required Neighbor Solicitation and Neighbor Advertisement packets to come from `fe80::/10`. Per RFC 4861, Neighbor Solicitations may use the unspecified source address during Duplicate Address Detection, and Neighbor Advertisements are sourced from an address assigned to the sending interface. I kept the `fe80::/10` restriction for Router Solicitation and Router Advertisement only, and broadened the NS/NA rules.
- The "Echo request (rate limited)" comment was inaccurate because the rule did not implement rate limiting. I corrected the comment.
- The inbound TCP rule described as "Allow established inbound" actually permitted new inbound TCP SYN traffic from anywhere and was unnecessary because return traffic is already handled by PF state. I removed the rule and corrected the explanation.
- The state-table examples filtered on `grep 6:`, which is not a reliable way to isolate IPv6 states from `pfctl -s states` output. I changed those commands to plain state-table inspection and counting.
- The persistence section claimed that macOS does not automatically load `/etc/pf.conf`. I revised the wording to describe the LaunchDaemon approach directly instead of making that blanket claim.

## Review Notes
PF on macOS remains available for advanced local administration, but Apple explicitly documents in TN3165 that PF is not considered a public API for distributed software products. The post is still technically relevant as an admin-focused guide.
