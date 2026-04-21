# Validation Summary: How to Configure TACACS+ with IPv6

## Status
validated

## Post Type
Technical tutorial / configuration guide

## Technologies Covered
- TACACS+
- IPv6
- AAA authentication, authorization, and accounting
- tac_plus
- tac_plus-ng
- Cisco IOS XE
- Cisco NX-OS
- Juniper Junos OS
- Arista EOS
- Linux networking tools (`ss`, `nc`, `ping`)

## Sources Consulted
- RFC 8907, The Terminal Access Controller Access-Control System Plus (TACACS+) Protocol: https://www.rfc-editor.org/rfc/rfc8907
- Ubuntu `tac_plus` man page: https://manpages.ubuntu.com/manpages/bionic/man8/tac_plus.8.html
- Ubuntu `tac_plus.conf` man page: https://manpages.ubuntu.com/manpages/bionic/man5/tac_plus.conf.5.html
- tac_plus-ng documentation: https://projects.pro-bono-publico.de/event-driven-servers/doc/tac_plus-ng.html
- Cisco IOS XE TACACS+ over IPv6 documentation: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_aaa/configuration/xe-3e/sec-usr-aaa-xe-3e-book/ip6-tacacs.html
- Cisco NX-OS TACACS+ configuration guide: https://www.cisco.com/c/en/us/td/docs/dcn/nx-os/nexus9000/106x/configuration/security/cisco-nexus-9000-series-nx-os-security-configuration-guide-release-106x/m-configuring-tacacs.html
- Juniper Junos `tacplus-server` CLI reference: https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/tacplus-server-edit-system.html
- Juniper Junos TACACS+ authentication guide: https://www.juniper.net/documentation/us/en/software/junos/user-access/topics/topic-map/user-access-tacacs-authentication.html
- Arista EOS User Security documentation: https://www.arista.com/en/um-eos/eos-user-security
- Local command help for OpenBSD netcat (`nc -h`) and iproute2 `ss` (`ss --help`)

## Issues Found
- Several example IPv6 addresses used placeholders such as `2001:db8::tacacs`, `2001:db8::tacacs2`, `2001:db8:net::1`, and `2001:db8:mgmt::router1`. These are not valid IPv6 address literals. Replaced them with valid documentation-prefix IPv6 addresses such as `2001:db8:100::49`.
- The install commands implied the legacy `tacacs+` package is generally available on Debian/Ubuntu and RHEL/CentOS. Qualified those commands because current distribution repositories and service unit names vary.
- The tac_plus-ng section was labeled `RADSEC/tac_plus-ng`, but RADSEC is not TACACS+. Removed the RADSEC label.
- The tac_plus-ng listener example used an invalid `listen = { ... }` form for tac_plus-ng. Replaced it with the documented `id = spawnd { listen { address = ::0 port = 49 } }` syntax.
- The Cisco IOS example used `ip tacacs source-interface` for an IPv6 TACACS+ flow. Changed it to `ipv6 tacacs source-interface` and updated the test command to target the named server group.
- The Cisco NX-OS example omitted the required `feature tacacs+` enablement step. Added it before the TACACS+ server configuration.
- The Junos example mixed `set` commands with brace-style hierarchical syntax, which is not valid Junos CLI input. Rewrote the block as valid `set system ...` commands.
- The Junos user authorization example used `authentication tacplus` under a local user, which is not the standard TACACS+ user mapping model in Junos. Replaced it with a `remote` user template assigned to the `NETOPS` login class.
- The Junos verification command `show system tacplus statistics` was not supported by the consulted Juniper documentation. Replaced it with `show system tacplus-server`.
- The conclusion incorrectly grouped IOS and NX-OS under the IOS-style `address ipv6` syntax. Updated it to distinguish IOS XE `address ipv6` from NX-OS `tacacs-server host`.
- The troubleshooting hint used `ping6`. Replaced it with the current `ping -6` form.

## Review Notes
Package names, systemd unit names, and tac_plus configuration details vary by distribution and daemon implementation. The examples are now technically valid for the documented command families, but operators should still confirm package and service names for their selected TACACS+ daemon and OS release.
