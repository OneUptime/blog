# Validation Summary: How to Configure BGP IPv6 Unicast Address Family on Juniper

## Status
validated

## Post Type
Guide

## Technologies Covered
- Juniper Junos OS
- BGP
- MP-BGP
- IPv6 unicast routing
- Junos routing policy

## Sources Consulted
- Juniper Networks, `family (Protocols BGP)` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/family-edit-protocols-bgp.html
- Juniper Networks, `local-address (Protocols BGP)` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/local-address-edit-protocols-bgp.html
- Juniper Networks, `show bgp neighbor` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-bgp-neighbor.html
- Juniper Networks, `show route advertising-protocol` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-advertising-protocol.html
- Juniper Networks, `show route receive-protocol` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-route-receive-protocol.html
- Juniper Networks, `policy-statement` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/policy-statement-edit-policy-options.html
- Juniper Networks, `Understanding Route Filters for Use in Routing Policy Match Conditions`: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/policy-configuring-route-lists-for-use-in-routing-policy-match-conditions.html
- Juniper Networks, `Default Routing Policies`: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/topics/concept/policy-routing-policies-actions-defaults.html
- Juniper Networks, Junos OS CLI User Guide: https://www.juniper.net/documentation/us/en/software/junos/cli/cli.pdf
- Juniper Networks, Junos OS Routing Policies, Firewall Filters, and Traffic Policers User Guide: https://www.juniper.net/documentation/us/en/software/junos/routing-policy/routing-policy.pdf

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:peer::2` and `2001:db8:remote::/48`, which are not syntactically valid IPv6 addresses. I replaced them with valid documentation-prefix examples.
- The iBGP `next-hop-self` example used `set protocols bgp group IBGP_V6 family inet6 unicast next-hop-self`, which is not valid Junos BGP configuration syntax. I replaced it with a Junos routing policy example that uses `then next-hop self` and applies that policy as BGP export.
- The verification command used `match "NLRI\|AFI\|family"`. Junos CLI pipe filtering uses POSIX extended regular expressions, so `|` should not be escaped for alternation here. I corrected the expression to `match "NLRI|AFI|family"`.
- Two configuration blocks were labeled as `bash` and `python` even though they are Junos configuration snippets. I changed those fences to `text` to reflect the actual syntax being shown.
- The post referred to the OS as `JunOS`. I corrected this to `Junos OS` for product-name accuracy.
- The verification comment described `show bgp neighbor` as a summary command, but that command provides neighbor details rather than summary output. I corrected the wording without changing the command.

## Review Notes
- `show route receive-protocol bgp <neighbor>` displays routes as received from the peer before import policy effects are applied; this is expected Junos behavior.
- The post does not target a specific Junos OS release. The reviewed syntax and commands are present in current Juniper documentation as of May 6, 2026.
