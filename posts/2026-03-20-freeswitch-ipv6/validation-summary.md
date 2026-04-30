# Validation Summary: How to Configure FreeSWITCH with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- FreeSWITCH
- Sofia SIP
- IPv6
- SIP
- RTP
- Linux `ip6tables`

## Sources Consulted
- FreeSWITCH Documentation: Sofia Configuration Files - https://developer.signalwire.com/freeswitch/FreeSWITCH-Explained/Configuration/Sofia-SIP-Stack/Sofia-Configuration-Files_7144453/
- FreeSWITCH Documentation: `local_ip_v6` - https://developer.signalwire.com/freeswitch/Channel-Variables-Catalog/local_ip_v6_17170729/
- FreeSWITCH Documentation: Access Control List (ACL) - https://developer.signalwire.com/freeswitch/FreeSWITCH-Explained/Networking/3965687/
- FreeSWITCH Documentation: XML Switch Configuration - https://developer.signalwire.com/freeswitch/FreeSWITCH-Explained/Configuration/XML-Switch-Configuration_13173223/
- FreeSWITCH Documentation: NAT Traversal - https://developer.signalwire.com/freeswitch/FreeSWITCH-Explained/Networking/NAT-Traversal_3375417/
- FreeSWITCH Documentation: Sofia SIP Stack - https://developer.signalwire.com/freeswitch/confluence-to-docs-redirector/display/freeswitch/sofia%2Bsip%2Bstack
- FreeSWITCH Documentation: `mod_commands` originate - https://developer.signalwire.com/freeswitch/FreeSWITCH-Explained/Modules/mod_commands_1966741
- FreeSWITCH vanilla `internal-ipv6.xml` - https://raw.githubusercontent.com/signalwire/freeswitch/master/conf/vanilla/sip_profiles/internal-ipv6.xml
- RFC 3986: Uniform Resource Identifier (URI): Generic Syntax - https://www.rfc-editor.org/rfc/rfc3986.html

## Issues Found
- The post bound `sip-ip` and `rtp-ip` to `::`. I changed both to `$${local_ip_v6}` to match FreeSWITCH's shipped `internal-ipv6.xml` profile and avoid using an unspecified address in the profile.
- The post used `enable-ipv6`, which is not a documented Sofia profile parameter. I removed it.
- The post placed `rtp-port-min` and `rtp-port-max` in the SIP profile. I removed them and added a note that RTP port range is configured in `autoload_configs/switch.conf.xml` with `rtp-start-port` and `rtp-end-port`.
- The post set `apply-nat-acl` to `nat.auto` for an IPv6 profile. I changed it to `apply-inbound-acl="ipv6-internal"` because `nat.auto` is for RFC 1918 NAT handling and does not describe the intended IPv6 access control behavior.
- The post set `ext-sip-ip` and `ext-rtp-ip` on the IPv6 profile and described them as critical. I removed that guidance and corrected the explanation to match the shipped IPv6 profile, which leaves those settings unset.
- Several sample IPv6 values were syntactically invalid, including `2001:db8::freeswitch`, `2001:db8:internal::/48`, and `2001:db8::sip-gateway/128`. I replaced them with valid documentation-prefix IPv6 addresses and CIDRs.
- The dial string examples used an invalid remote URI. I corrected them to valid FreeSWITCH `sofia/<profile>/<user>@[ipv6]` syntax with bracketed IPv6 literals.
- The internal profile domain parsing example used `parse="true"`. I changed it to `parse="false"` to match the usual internal-profile behavior documented by FreeSWITCH.
- The firewall section implied the event socket rule alone "restricted" access to localhost and used a distro-specific persistence path without context. I corrected the wording and labeled the persistence example as Debian/Ubuntu-specific.

## Review Notes
- The `ip6tables-save > /etc/ip6tables/rules.v6` persistence example is appropriate for Debian/Ubuntu systems using `iptables-persistent`, but not for every Linux distribution.
- The RTP UDP port range in the firewall must stay aligned with the global FreeSWITCH `switch.conf.xml` RTP port range.
