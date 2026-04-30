# Validation Summary: How to Configure IPsec IPv6 on Juniper Routers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Junos OS
- Juniper SRX IPsec VPNs
- IKEv2
- IPv6
- Route-based VPNs
- Security zones and policies

## Sources Consulted
- Juniper Networks, "IPv6 IPsec VPNs" - https://www.juniper.net/documentation/us/en/software/junos/vpn-ipsec/topics/topic-map/security-ipv6-ipsec-vpns.html
- Juniper Networks, "gateway (Security IKE)" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/security-edit-gateway-ike.html
- Juniper Networks, "Route-Based IPsec VPNs" - https://www.juniper.net/documentation/us/en/software/junos/vpn-ipsec/topics/topic-map/security-route-based-ipsec-vpns.html
- Juniper Networks, "ping | Junos OS" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/ping.html
- Juniper Networks, "show security ike security-associations" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-ike-security-associations.html
- Juniper Networks, "show security ipsec security-associations" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-ipsec-security-associations.html
- Juniper Networks, "show security ipsec statistics" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-ipsec-statistics.html
- Juniper Networks, "show security ike stats" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-security-ike-stats.html
- Juniper Networks, "local-identity" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/security-edit-local-identity.html
- Juniper Networks, "remote-identity" - https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/security-edit-remote-identity.html
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation" - https://www.rfc-editor.org/info/rfc3849
- RFC 4291, "IP Version 6 Addressing Architecture" - https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The original examples used invalid IPv6 literals such as `2001:db8:gw2::1`, `2001:db8:vti::1`, and `2001:db8:site2::/48`. I replaced them with syntactically valid documentation-range IPv6 addresses under `2001:db8::/32`.
- The configuration blocks were written as wrapped `set` commands and mixed `set` syntax with hierarchical braces under the IPsec VPN stanza, which is not executable Junos CLI syntax. I converted the snippets to valid one-command-per-line `set` syntax.
- The IKE gateway snippet omitted the `external-interface` statement that Junos documents for SRX IKE gateways. I added `external-interface ge-0/0/0.0` and the matching host-inbound IKE allowance on the `UNTRUST` zone.
- The policy section referenced an `INTERNAL` zone without showing any interface binding. I added `ge-0/0/1.0` to the `INTERNAL` zone so the policy example and test traffic example are coherent.
- The verification section used `ping6`, which is not the documented Junos operational CLI form. I changed it to `ping inet6 ... interface ge-0/0/1.0 count 5`.
- The troubleshooting section used `show security ike statistics`, but the documented command is `show security ike stats`. I corrected that.
- The sample operational output used Junos-inaccurate field names and ordering. I updated the sample output to align with the Junos CLI reference more closely.
- The post description and overview were too broad for the configuration shown. Because the post uses SRX-specific `security zones` and `[edit security]` VPN configuration, I narrowed the wording to Juniper SRX devices running Junos OS.

## Review Notes
- Junos accepts `set security ike policy ... mode main` even when the gateway uses `version v2-only`, and Juniper still shows that statement in official examples. However, Juniper’s CLI reference also notes that IKEv2 does not negotiate using mode configuration.
- The post still assumes the LAN and WAN interfaces already have their IPv6 addresses configured on the device. The VPN snippets are now technically correct, but readers still need matching interface addressing and peer-side configuration for the tunnel to come up.
