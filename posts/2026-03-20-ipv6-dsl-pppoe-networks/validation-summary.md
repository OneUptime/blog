# Validation Summary: How to Configure IPv6 for DSL/PPPoE Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 over PPPoE
- PPP / IPv6CP
- DHCPv6 Prefix Delegation
- accel-ppp
- OpenWrt network configuration
- FreeRADIUS reply attributes
- Huawei access-switch / DSL aggregation PPPoE+ configuration

## Sources Consulted
- RFC 2516, PPPoE: https://www.rfc-editor.org/rfc/rfc2516.html
- RFC 5072, IP Version 6 over PPP: https://www.rfc-editor.org/rfc/rfc5072.html
- RFC 3633, DHCPv6 Prefix Delegation: https://www.rfc-editor.org/rfc/rfc3633.html
- RFC 3162, RADIUS and IPv6: https://www.rfc-editor.org/rfc/rfc3162.html
- RFC 4818, Delegated-IPv6-Prefix RADIUS attribute: https://www.rfc-editor.org/rfc/rfc4818.html
- OpenWrt IPv6 configuration: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- accel-ppp configuration overview: https://docs.accel-ppp.org/configuration/configuration.html
- accel-ppp `[pppoe]` configuration: https://docs.accel-ppp.org/configuration/pppoe.html
- accel-ppp `[ipv6-pool]` configuration: https://docs.accel-ppp.org/configuration/ipv6-pool.html
- accel-ppp `[ipv6-dns]` configuration: https://docs.accel-ppp.org/configuration/ipv6-dns.html
- accel-ppp `[radius]` configuration: https://docs.accel-ppp.org/configuration/radius.html
- accel-ppp CLI / `show sessions` syntax: https://docs.accel-ppp.org/configuration/cli.html
- accel-ppp generic installation / run command: https://docs.accel-ppp.org/installation/generic_inst.html
- Huawei `pppoe intermediate-agent information enable`: https://support.huawei.com/enterprise/en/doc/EDOC1100248439/2a691654/pppoe-intermediate-agent-information-enable
- Huawei `pppoe uplink-port trusted`: https://support.huawei.com/enterprise/en/doc/EDOC1100325914/8e493bd0/pppoe-uplink-port-trusted

## Issues Found
- The post referred to a separate `PPPoEv6` protocol. I corrected this to IPv6 over PPPoE using IPv6CP for link negotiation and DHCPv6-PD for delegated prefixes, because PPPoE itself is not extended into a separate protocol variant.
- Several IPv6 examples were syntactically invalid because they used non-hex hextets such as `dsl`, `dns`, `radius`, and `dslam`. I replaced them with valid documentation addresses under `2001:db8::/32`.
- The `accel-ppp` configuration used the wrong section name, `[ipv6pool]`. I changed it to `[ipv6-pool]` to match the official configuration format.
- The `accel-ppp` IPv6 DNS example used `dns1` and `dns2` inside `[ipv6-dns]`. I changed these to repeated `dns=` entries, which is the documented syntax for that section.
- The PPPoE server section did not bind the delegated-prefix pool to the PPPoE service. I added `ipv6-pool-delegate=default` and named the delegate pool accordingly so the example aligns with the documented `accel-ppp` configuration model.
- The OpenWrt example used `option ifname` in interface sections. I updated those entries to `option device`, which matches current OpenWrt documentation.
- The DSLAM section incorrectly suggested DHCPv6 snooping was needed to pass DHCPv6-PD requests on a Layer 2 access bridge. I replaced that guidance with a technically correct explanation that DHCPv6-PD runs inside the PPP session and updated the Huawei example to optional PPPoE+ trusted-uplink configuration.
- The monitoring example used an invalid `accel-cmd show sessions username ...` form and attempted to grep for IPv6 fields that are not shown by default. I replaced it with the documented `show sessions [columns] [match ...]` syntax.
- The startup example used distro-specific `systemctl` unit commands that were not documented upstream. I replaced them with the upstream `accel-pppd -d -p ... -c ...` invocation and added the required IPv6 forwarding step.
- The section heading called the PPPoE termination point an `LNS`, which is L2TP-specific terminology. I updated it to `BNG/BRAS`.

## Review Notes
- Some ISPs provide only link-local addressing on the PPP interface plus a delegated prefix; they do not always assign a separate global WAN address. The updated wording reflects that.
- The `sysctl -w net.ipv6.conf.all.forwarding=1` example enables forwarding immediately but is not persistent across reboot unless also added to a persistent sysctl configuration.
- The post remains intentionally generic. Exact DSLAM, BRAS, and RADIUS behavior can vary by platform and software release, so vendor-specific production deployments may require additional interface, VLAN, MTU, and policy details.
