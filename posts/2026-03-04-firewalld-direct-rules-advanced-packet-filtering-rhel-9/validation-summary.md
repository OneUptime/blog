# Validation Summary: How to Use Firewalld Direct Rules for Advanced Packet Filtering on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewall-cmd
- firewalld direct rules
- iptables-style packet filtering
- nftables backend considerations

## Sources Consulted
- firewalld firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd
- firewalld direct interface options: https://firewalld.org/documentation/direct/options
- firewalld.direct manual page and caveats: https://firewalld.org/documentation/man-pages/firewalld.direct.html
- Red Hat Enterprise Linux 9 Configuring firewalls and packet filters: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index

## Issues Found
- Several `firewall-cmd --direct --add-rule` and `--remove-rule` examples placed `--permanent` after the direct rule arguments. The documented syntax places `--permanent` before `--direct`; the examples were updated to avoid ambiguity because direct rule arguments are variable-length iptables-style arguments.
- The ICMP rate-limit example said it limited ping replies and used only a limited `ACCEPT` rule. It was changed to describe incoming echo requests and to add a follow-up `DROP` rule so packets above the rate limit are actually dropped.
- The custom chain example applied string matching to both HTTP and HTTPS. Because HTTPS payloads are encrypted, the jump was limited to unencrypted HTTP traffic.
- The SYN flood example used only a limited `ACCEPT` rule, which would not necessarily drop excess SYN packets if later zone rules allowed the traffic. A follow-up `DROP` rule was added and priorities were adjusted.
- The interaction with zone rules was too broad. It was updated to mention internal direct chains, direct DROP precedence, and the documented caveat that direct ACCEPT rules can still be evaluated by firewalld's nftables ruleset.
- The migration guidance did not mention Red Hat's recommendation to replace low-level direct rules with nftables where firewalld abstractions do not fit. A minimal nftables migration bullet and wording update were added.
- The direct rule syntax and permanent listing example were adjusted to place `--permanent` before `--direct`, and the priority explanation was corrected because `--add-rule` requires an explicit priority.

## Review Notes
Direct rules and the direct interface are deprecated. The post is technically useful, but future updates should continue to emphasize rich rules, policies, and nftables as preferred approaches on RHEL 9.
