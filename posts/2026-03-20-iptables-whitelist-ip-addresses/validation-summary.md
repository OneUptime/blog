# Validation Summary: How to Whitelist IP Addresses with iptables

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Linux `iptables`
- Linux `ip6tables`
- Linux `ipset`
- Bash shell scripting
- SSH access control
- TCP port filtering

## Sources Consulted
- Netfilter `iptables(8)` man page: https://ipset.netfilter.org/iptables.man.html
- Netfilter `iptables-extensions(8)` man page: https://ipset.netfilter.org/iptables-extensions.man.html
- Netfilter `ipset(8)` man page: https://ipset.netfilter.org/ipset.man.html
- Netfilter iptables project page: https://www.netfilter.org/projects/iptables/index.html

## Issues Found
- The post used only `iptables` examples but did not say that those rules affect IPv4 traffic only. Per the Netfilter `iptables(8)` documentation, IPv6 filtering is handled separately with `ip6tables`. I added a one-sentence clarification near the introduction so readers do not assume the shown rules also protect IPv6.

## Review Notes
- The `iptables` and `ipset` command syntax in the examples is correct, including `-A`, `-I`, `-D`, `--dport`, `--line-numbers`, and `-m set --match-set ... src`.
- The rule-order explanation is accurate: `iptables` evaluates rules in chain order, so the allow rules must appear before the terminal `DROP` rule for the same traffic.
- The `ipset` example assumes the `ipset` userspace tool and kernel set-match support are available on the target system.
- The post covers runtime firewall rules only. Persistence across reboot is distribution-specific and outside the stated scope of this article.
