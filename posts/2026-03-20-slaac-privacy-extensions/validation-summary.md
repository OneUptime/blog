# Validation Summary: How to Configure IPv6 Privacy Extensions (RFC 8981)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 SLAAC
- IPv6 Privacy Extensions / temporary addresses
- RFC 8981 and RFC 6724
- Linux IPv6 sysctl settings
- iproute2 `ip` and `ss` commands
- NetworkManager
- systemd-networkd
- Windows `netsh`
- macOS IPv6 sysctls
- Router IPv6 addressing guidance

## Sources Consulted
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://datatracker.ietf.org/doc/html/rfc8981
- RFC 6724: Default Address Selection for Internet Protocol Version 6: https://datatracker.ietf.org/doc/html/rfc6724
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/v6.15/networking/ip-sysctl.html
- iproute2 `ip-address(8)` manual: https://man7.org/linux/man-pages/man8/ip-address.8.html
- NetworkManager IPv6 settings reference: https://www.networkmanager.dev/docs/api/latest/settings-ipv6.html
- systemd.network documentation: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- Microsoft `netsh interface` documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-interface
- Apple XNU IPv6 sysctl source: https://github.com/apple-oss-distributions/xnu/blob/main/bsd/netinet6/in6_proto.c
- Apple XNU IPv6 source address selection source: https://github.com/apple-oss-distributions/xnu/blob/main/bsd/netinet6/in6_src.c
- Cisco IOS IPv6 command reference: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html

## Issues Found
- The post described privacy extensions as simply hiding or replacing MAC-based EUI-64 addresses. Updated the wording to account for stable privacy addresses and to clarify that temporary addresses avoid long-lived identifiers for outbound traffic.
- The RFC 8981 temporary valid lifetime was listed as 604800 seconds / 7 days. Updated it to 172800 seconds / 2 days, matching RFC 8981 and current Linux kernel documentation.
- The lifecycle text said a new temporary address is generated after the preferred lifetime expires. Updated it to state that regeneration happens before deprecation.
- The Linux `use_tempaddr=0` explanation implied EUI-64 is always used. Updated it to refer to the stable/public SLAAC address.
- `max_addresses` was described as a maximum number of temporary addresses per prefix. Corrected it to the Linux meaning: maximum autoconfigured addresses per interface.
- The systemd-networkd snippet showed a nonexistent `[IPv6PrivacyExtensions]` section. Corrected it to use `IPv6PrivacyExtensions=yes` in the `[Network]` section.
- The macOS enable command used `net.inet6.ip6.use_tempaddr=2`, which is not the macOS model. Corrected it to `use_tempaddr=1` plus `prefer_tempaddr=1`.
- The Cisco router command `ipv6 nd privacy-disable` could not be verified in Cisco IOS command documentation. Replaced it with vendor-neutral guidance to use stable/static router interface addresses.
- The source address verification section used `ip -6 rule show`, which shows routing policy rules, not RFC 6724 source address selection policy. Replaced it with `ip -6 route get` and `ip addrlabel list`.

## Review Notes
Some operating systems and Linux distributions override kernel defaults through NetworkManager, systemd-networkd, or vendor policy, so runtime verification remains important even when the RFC or kernel default is documented.
