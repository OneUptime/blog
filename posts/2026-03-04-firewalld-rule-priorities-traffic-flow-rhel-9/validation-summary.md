# Validation Summary: How to Use Firewalld Rule Priorities to Control Traffic Flow on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- firewalld
- firewalld rich rules
- firewall-cmd
- nftables

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using and configuring firewalld": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_firewalls_and_packet_filters/using-and-configuring-firewalld_firewall-packet-filters
- firewalld.richlanguage manual page: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewall-cmd manual page: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- firewalld project article, "Rich Rule Priorities": https://firewalld.org/2018/12/rich-rule-priorities
- firewalld project article, "Zone Priorities": https://firewalld.org/2023/04/zone-priorities

## Issues Found
- The post stated that all rich rules are evaluated before standard services and ports. This was corrected because firewalld places negative-priority rich rules in pre chains, positive-priority rich rules in post chains, and priority 0 rich rules into action-specific chains.
- The post claimed a deny rich rule at any priority overrides a standard service allow. This was corrected because a positive-priority rich rule runs after standard service rules and cannot override traffic already accepted by a service.
- The default processing diagram implied a fixed source-based then interface-based zone classification order. This was simplified to "zone classification" because modern firewalld also supports zone priorities, and the exact classification order can depend on that configuration.
- The rate-limiting example allowed all traffic from the monitoring server rather than only SSH. The rich rule was narrowed to `service name="ssh"` to match the example's purpose.
- The rate-limiting example did not remove the standard SSH service. A `--remove-service=ssh` command was added so the rich rule actually controls SSH access instead of being bypassed by the zone's standard SSH service.
- The "Viewing Rule Priorities" section said `--list-rich-rules` shows rules in priority order. This was softened to say it can be used to confirm priority values, because the official `firewall-cmd` documentation documents listing rich rules but does not guarantee that output order as the evaluation order.
- The priority range guidance described `1000+` as logging rules. This was changed to low-precedence logging or catch-all rules to reflect that high positive priorities run late.

## Review Notes
The corrected post is technically accurate for RHEL 9 firewalld behavior. The local container did not have `firewall-cmd` or firewalld man pages installed, so CLI validation was performed against the official Red Hat and firewalld documentation instead of local `--help` output.
