# Validation Summary: How to Configure iptables Firewall Rules

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux netfilter
- iptables and ip6tables
- iptables tables, chains, matches, and targets
- Connection tracking
- NAT, DNAT, and MASQUERADE
- sysctl IPv4 forwarding
- iptables rule persistence

## Sources Consulted
- iptables(8) Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html
- iptables-extensions(8) Linux manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- iptables-save(8) and iptables-restore(8) local manual pages
- sysctl(8) and sysctl.conf(5) local manual pages
- netfilter project homepage: https://www.netfilter.org/
- Netfilter Packet Filtering HOWTO, NAT and packet filtering: https://www.netfilter.org/documentation/HOWTO/packet-filtering-HOWTO-9.html

## Issues Found
- The tables diagram and table omitted the `security` table and omitted the modern `nat` table `INPUT` chain. Added the `security` table and corrected the `nat` chain list to match the iptables manual.
- The complete firewall script saved to `/etc/iptables/rules.v4` without ensuring that `/etc/iptables` exists. Added `mkdir -p /etc/iptables` before saving.
- The port-forwarding example accepted the inbound forwarded packet but did not allow established return traffic when `FORWARD` policy is `DROP`. Added an `ESTABLISHED,RELATED` `FORWARD` rule.
- The SYN flood example used a broad `ACCEPT` rule for all TCP SYN packets under the rate limit, which could unintentionally permit connections to otherwise blocked ports. Replaced it with a `hashlimit` rule that drops excessive SYN packets per source IP.
- The scheduled rollback example cancelled every queued `at` job for the user. Changed it to capture and cancel only the rollback job ID.
- The packet-processing diagram omitted the `security` chains and `nat INPUT` chain. Updated the diagram to include those chains and avoid misleading table-order omissions.

## Review Notes
- The post is IPv4-focused because it uses `iptables`; IPv6 deployments need equivalent `ip6tables` or nftables rules.
- `iptables` remains supported, but many current distributions use nftables or firewalld by default. The guide appropriately mentions newer tools while focusing on iptables.
