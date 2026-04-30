# Validation Summary: How to Use Netmiko for IPv6 Network Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Netmiko
- Python
- IPv6
- SSH
- Cisco IOS XE
- Junos OS
- Arista EOS
- BGP
- TextFSM / ntc-templates
- OneUptime webhook alerts

## Sources Consulted
- Netmiko Supported Platforms: https://ktbyers.github.io/netmiko/PLATFORMS.html
- Netmiko API documentation: https://ktbyers.github.io/netmiko/docs/netmiko/
- Netmiko utilities documentation: https://ktbyers.github.io/netmiko/docs/netmiko/utilities.html
- Cisco IPv6 Configuration Guide, IOS XE 17: https://www.cisco.com/c/en/us/td/docs/ios/ipv6/configuration/guide/ipv6-xe-16-book-cat8000/m_ip6-addrg-bsc-con.html
- Cisco BGP Command Reference (`neighbor activate`): https://www.cisco.com/c/en/us/td/docs/ios/iproute_bgp/command/reference/irg_book/irg_bgp3.html?bookSearch=true
- Juniper `show interfaces terse` command reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-interfaces-terse.html
- Juniper CLI pipe filter reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/pipe.html
- Arista EOS IPv6 command documentation (`show ipv6 interface brief`): https://www.arista.com/en/um-eos/eos-ipv6
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- OneUptime on-call / alerting page: https://oneuptime.com/on-call

## Issues Found
1. Netmiko device type values for Cisco IOS XE were incorrect. The post used `cisco_ios_xe`, but Netmiko’s supported SSH `device_type` value is `cisco_xe`. I updated all Cisco examples accordingly.
2. Several literal IPv6 example addresses were invalid. Values such as `2001:db8::router1` and `2001:db8::r1` contain non-hexadecimal characters and are not valid IPv6 addresses. I replaced them with valid documentation addresses from `2001:db8::/32`.
3. The TextFSM parsing prerequisites were incomplete. Because the article demonstrates `use_textfsm=True`, I updated installation and explanatory text to include `ntc-templates`, which Netmiko checks for when locating TextFSM templates.
4. The manual IPv6 route parsing regex was too narrow. It would miss common Cisco route codes that include digits or mixed-case suffixes, such as `OI`, `OE2`, `I1`, or `NDp`. I widened the regex and corrected the explanatory comment.
5. The BGP example had two technical problems: it omitted `from netmiko import ConnectHandler`, and it activated the neighbor before entering the IPv6 address-family section. I added the missing import and removed the premature `neighbor ... activate` line so activation remains in the IPv6 address-family context.
6. The conclusion referenced “OneUptime event webhooks,” which is not the clearest product terminology. I changed this to “OneUptime webhook alerts” to match OneUptime’s documented alerting terminology.

## Review Notes
- `use_textfsm=True` only returns structured data when a matching template is available; the post’s fallback to raw string parsing is appropriate and was preserved.
- The Cisco `ipv6 enable` command is redundant after assigning an explicit IPv6 address, because Cisco documents that interface IPv6 processing is enabled by IPv6 address assignment as well. It is still valid syntax, so it was left unchanged to preserve the author’s flow.
