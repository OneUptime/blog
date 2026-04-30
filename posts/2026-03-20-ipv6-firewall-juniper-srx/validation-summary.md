# Validation Summary: How to Configure IPv6 Firewall Policies on Juniper SRX

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper SRX
- Junos OS security policies
- IPv6
- ICMPv6
- Security zones
- Junos address books

## Sources Consulted
- Juniper, "Configuring Security Policies" - https://www.juniper.net/documentation/us/en/software/junos/security-policies/topics/topic-map/security-policy-configuration.html
- Juniper, "Security Zones" - https://www.juniper.net/documentation/us/en/software/junos/security-policies/topics/topic-map/security-zone-configuration.html
- Juniper CLI reference, `protocols (Security Zones Host Inbound Traffic)` - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/security-edit-protocols-zone-host-inbound-traffic.html
- Juniper CLI reference, `forwarding-options (Security)` - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/security-edit-forwarding-options.html
- Juniper, "IPv6 Flow-Based Processing" - https://www.juniper.net/documentation/us/en/software/junos/flow-packet-processing/topics/topic-map/security-flow-based-for-ipv6.html
- Juniper CLI reference, `application (Applications)` - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/application-edit-applications-srx.html
- Juniper CLI reference, `show security flow session family` - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-flow-session-family.html
- Juniper CLI reference, `show security match-policies` - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-match-policies.html
- Juniper CLI reference, `show security policies hit-count` - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-policies-hit-count.html
- Juniper, "Reordering Security Policies" - https://www.juniper.net/documentation/us/en/software/junos/security-policies/topics/topic-map/security-reordering-policies.html
- RFC 4443, "Internet Control Message Protocol (ICMPv6) for the Internet Protocol Version 6 (IPv6) Specification" - https://datatracker.ietf.org/doc/html/rfc4443
- RFC 4890, "Recommendations for Filtering ICMPv6 Messages in Firewalls" - https://datatracker.ietf.org/doc/html/rfc4890

## Issues Found
- The post omitted the IPv6 flow-mode prerequisite. Juniper documents that IPv6 security policies require IPv6 flow support, so I added `set security forwarding-options family inet6 mode flow-based` and updated the overview and summary to reflect that requirement.
- Several example IPv6 addresses used non-hex strings such as `lan`, `web`, `srv`, `ext`, and `mgmt`, which are not valid IPv6 literals. I replaced them with valid documentation prefixes and host addresses.
- Multiple policy snippets were formatted as indented continuations under a single `set` command. Junos `set` syntax requires complete statements, so I rewrote those examples as valid one-line commands.
- The host-inbound protocol example used `ospf` in an IPv6-focused section. I corrected it to `ospf3`, which is the Junos host-inbound protocol for OSPFv3.
- The ICMPv6 application examples used `icmp-type` with `protocol icmp6`. I corrected them to the SRX application syntax supported by the Junos CLI reference: `protocol 58` with `icmp6-type`.
- The ICMPv6 Packet Too Big example used `from-zone any to-zone any`, which is not the normal zone-based policy form used in this article. I replaced it with an explicit `OUTSIDE` to `INSIDE` policy.
- The ICMPv6 allow rules would have been shadowed by the broader `DENY-ALL-V6` rule because SRX evaluates policies in order. I added `insert ... before policy DENY-ALL-V6` commands so the intended permits are actually matched.
- The ping example referenced `MONITORING-NET`, which was never defined. I added a valid `MONITORING-V6` address-book entry and updated the policy to use it.
- The verification command `show security flow session ipv6` is not the documented CLI form. I corrected it to `show security flow session family inet6`.
- The verification sample `show security match-policies` example was split across lines and used invalid IPv6 addresses. I rewrote it as a valid single-line command and fixed the addresses in both the command and sample session output.
- The ICMPv6 explanation was narrowed to match Juniper’s documented IPv6 flow-processing behavior instead of implying special handling details that were not documented in the sources reviewed.

## Review Notes
- Policy order is critical on SRX. New policies are appended to the end of the list unless you reorder them, so broad deny rules can easily shadow later permit rules.
- Juniper’s IPv6 flow-processing documentation notes that changing `family inet6 mode` can require a reboot on some platforms or older releases. The article is accurate as a generic configuration guide, but production rollouts should confirm platform-specific behavior before changing forwarding mode.
