# Validation Summary: How to Configure IPv6 for Fiber (GPON/XGS-PON) Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- GPON
- XGS-PON
- OLT configuration
- DHCPv6 relay
- DHCPv6 Prefix Delegation (IA_PD)
- Kea DHCPv6
- TR-069 / CWMP
- OMCI
- Huawei CLI
- Nokia SR OS-style CLI

## Sources Consulted
- Huawei Basic IPv6 Configuration Commands: https://support.huawei.com/enterprise/en/doc/EDOC1100325913/e6ca48ed/basic-ipv6-configuration-commands
- Huawei Configuring the DHCPv6 Relay Function: https://support.huawei.com/enterprise/en/doc/EDOC1100468595/9bcb7026/configuring-the-dhcpv6-relay-function
- Huawei `display ipv6 interface` command reference: https://info.support.huawei.com/hedex/api/pages/EDOC1100331435/AEM10132/04/resources/dc/display_ipv6_interface.html
- Nokia Configuring a DHCPv6 Relay Agent: https://infocenter.nokia.com/public/7750SR225R1A/topic/com.nokia.Triple_Play_Service_Delivery_Architecture_Guide/configuring_a_d-d1060e6169.html
- Nokia VPRN Services Command Reference: https://infocenter.nokia.com/public/7210SAS203R1A/topic/com.sas.services.m/html/tms_vprn_cli.html
- Broadband Forum TR-181 Device Data Model for CWMP Endpoints and USP Agents: https://device-data-model.broadband-forum.org/index.htm
- Kea Administrator Reference Manual, DHCPv6 Server: https://kea.readthedocs.io/en/kea-2.5.2/arm/dhcp6-srv.html
- `kea-shell` man page: https://kea.readthedocs.io/en/kea-3.0.0/man/kea-shell.8.html
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc8415
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861.html
- RFC 4649, DHCPv6 Relay Agent Remote-ID Option: https://www.rfc-editor.org/rfc/rfc4649.html
- ITU-T G.9807.1, 10-Gigabit-capable symmetric passive optical network (XGS-PON): https://www.itu.int/rec/T-REC-G.9807.1
- ITU-T G.984.1 excerpt on GPON split ratios: https://www.itu.int/rec/dologin_pub.asp?id=T-REC-G.984.1-200303-S%21%21PDF-E&lang=e&type=items

## Issues Found
- The post used multiple invalid IPv6 example addresses such as `2001:db8:olt::1`, `2001:db8:subs:1::1`, `2001:db8:dhcp::10`, and `2001:db8:fiber::/40`. These were replaced with syntactically valid documentation prefixes because IPv6 hextets may contain only hexadecimal digits.
- The Huawei global IPv6 command was incorrect. I changed `ipv6 enable` in system view to `ipv6`, which is the documented command to enable IPv6 globally before interface-level IPv6 configuration.
- The Huawei ND/RA configuration was incorrect and was attached to the wrong interface. I replaced `undo ipv6 nd ra halt` and `ipv6 nd ra-interval 30` with the documented current syntax on the subscriber-facing interface: `ipv6 nd ra halt disable`, `ipv6 nd autoconfig managed-address-flag`, `ipv6 nd autoconfig other-flag`, and `ipv6 nd ra max-interval 30`.
- The Nokia relay example did not match documented DHCPv6 relay CLI. I replaced the `dhcp ... relay-agent-remote-id` block with a valid `dhcp6-relay` hierarchy using `server`, `option`, and `remote-id`, and corrected the interface `no shutdown` placement.
- The TR-069 example used vendor-specific `X_` parameters instead of the current Broadband Forum TR-181 data model. I replaced it with standard CWMP/TR-181 objects for enabling IPv6 and requesting delegated prefixes with a DHCPv6 client.
- The Kea example used `kea-shell --service dhcp6`, which current Kea documentation marks as obsolete. I removed the obsolete flag and kept the command in a documented form.
- The XGS-PON section stated `128 vs 64` as if it were a universal rule. I changed this to a deployment-dependent statement because ITU material treats split ratio as dependent on design and optical budget rather than as a fixed GPON/XGS-PON rule.
- The conclusion implied that ONTs automatically request prefix delegation once relay exists. I corrected this to reflect DHCPv6 behavior: CPEs configured as DHCPv6 clients request IA_PD, not arbitrary ONTs by default.

## Review Notes
- Exact interface names, service objects, and subscriber attachment steps vary by vendor platform and software release. The corrected snippets are technically valid examples, but production deployments still need platform-specific adaptation.
- The Nokia section is now phrased as SR OS-style CLI rather than a model-specific 7360 recipe because the original commands did not match documented Nokia DHCPv6 relay syntax for that claimed platform.
