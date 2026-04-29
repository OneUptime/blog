# Validation Summary: How to Configure IPv6 Security Policies on Juniper SRX

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper SRX firewalls
- Junos OS
- IPv6 interface and static route configuration
- SRX security zones
- SRX address books and security policies
- Junos security flow troubleshooting
- OneUptime monitoring

## Sources Consulted
- Juniper, Configuring Security Policies: https://www.juniper.net/documentation/us/en/software/junos/security-policies/topics/topic-map/security-policy-configuration.html
- Juniper, Address Books and Address Sets: https://www.juniper.net/documentation/us/en/software/junos/security-policies/topics/topic-map/security-address-books-sets.html
- Juniper, Security Zones: https://www.juniper.net/documentation/us/en/software/junos/security-policies/topics/topic-map/security-zone-configuration.html
- Juniper, IPv6 Flow-Based Processing: https://www.juniper.net/documentation/us/en/software/junos/flow-packet-processing/topics/topic-map/security-flow-based-for-ipv6.html
- Juniper, `family inet6` statement reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/interfaces-edit-family-inet6.html
- Juniper, `[edit routing-options]` hierarchy reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/topic-map/hierarchy-edit-routing-options.html
- Juniper, `show security policies` command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-policies.html
- Juniper, `show security match-policies` command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-match-policies.html
- Juniper, `show security flow session family` command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-flow-session-family.html
- Juniper, `show security flow status` command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-flow-status.html
- Juniper, `traceoptions (Security Flow)` statement reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/security-edit-traceoptions-flow.html
- OneUptime homepage: https://oneuptime.com/

## Issues Found
1. The post explained SRX IPv6 security policies using `firewall family inet6` filters, which are stateless firewall filters rather than SRX zone-based stateful security policies. I replaced that section with valid `security forwarding-options`, `security zones`, `security address-book`, and `security policies` examples.
2. The IPv6 static-route example used invalid IPv6 literals (`2001:db8:remote::/48` and `2001:db8:wan::254`). I changed them to valid documentation-range IPv6 prefixes and next-hop addresses.
3. The original discard example blackholed all IPv6 traffic with `::/0 reject`, which was misleading in a policy-configuration guide. I changed it to a specific reject route example.
4. The DHCPv6 section did not demonstrate IPv6 security policy configuration on SRX. I replaced it with a valid IPv6 security-policy example so the post now matches its stated topic.
5. The verification section included `show arp no-resolve table inet6`, which does not match the documented Junos `show arp` syntax. I replaced the verification commands with supported SRX policy and flow commands.
6. The traceoptions section debugged router advertisements instead of SRX security policy and flow handling. I replaced it with documented `security flow traceoptions` commands.
7. The prerequisites and hierarchy explanation omitted the SRX-specific IPv6 flow-mode requirement and the correct security-policy hierarchy. I corrected both sections.

## Review Notes
- IPv6 security policies on SRX require IPv6 traffic to be handled in flow mode. Juniper documents flow mode as the default on most SRX platforms, while SRX300 Series platforms require explicit IPv6 flow-mode enablement and reboot behavior when changing modes.
- The post now validates policy behavior with SRX-specific operational commands such as `show security policies`, `show security match-policies`, and `show security flow session family inet6`, which are more relevant than generic neighbor-cache commands for this topic.
- Using the global address book for IPv6 policy objects is valid. Zone-attached address books are also supported if the deployment needs zone-specific object scoping.
