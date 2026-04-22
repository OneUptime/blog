# Validation Summary: How to Configure SoftEther VPN with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- SoftEther VPN Server
- IPv6
- vpncmd
- SecureNAT
- L2TP/IPsec
- OpenVPN compatibility mode
- Linux networking commands

## Sources Consulted
- SoftEther VPN Specification: https://www.softether.org/spec
- SoftEther VPN Server Administration manual: https://www.softether.org/4-docs/1-manual/3._SoftEther_VPN_Server_Manual/3.3_VPN_Server_Administration
- SoftEther vpncmd command reference for server commands: https://www.softether.org/4-docs/1-manual/6/6.3
- SoftEther vpncmd command reference for Virtual Hub commands: https://www.softether.org/4-docs/1-manual/6/6.4
- SoftEther Layer-2 Ethernet-based VPN documentation: https://www.softether.org/1-features/2._Layer-2_Ethernet-based_VPN
- SoftEther L2TP/IPsec setup guide: https://www.softether.org/4-docs/2-howto/L2TP%2F%2FIPsec_Setup_Guide_for_SoftEther_VPN_Server/1.Setup_L2TP%2F%2F%2F%2FIPsec_VPN_Server_on_SoftEther_VPN_Server
- SoftEtherVPN Stable source repository: https://github.com/SoftEtherVPN/SoftEtherVPN_Stable
- OpenVPN 2.6 manual: https://openvpn.net/community-docs/community-articles/openvpn-2-6-manual.html
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862

## Issues Found
- The introduction overstated IPv6 support across all SoftEther protocols. Updated it to clarify that IPv6 support is strongest in Layer 2 VPN modes and that some compatibility protocols and SecureNAT remain IPv4-oriented.
- `ListenerCreate /PORT:443` used the wrong vpncmd argument form. Changed it to `ListenerCreate 443`.
- SecureNAT was described as providing IPv6 address assignment. Corrected the text to state that SecureNAT provides IPv4 NAT/DHCP and IPv6 needs SLAAC or DHCPv6 from another router/server.
- The post suggested enabling DHCPv6 in SecureNAT and showed an IPv4 `SecureNatHostSet` command as if it were IPv6 configuration. Reworded it as IPv4 SecureNAT host configuration.
- `RoutingTableAdd` is not a SoftEther vpncmd command, and SoftEther's built-in Virtual Layer 3 Switch routing table is IPv4-only. Removed the invalid IPv6 route command and replaced it with guidance to use an external IPv6 router or OS routing/radvd.
- The L2TP/IPsec listener check used `ss -6 -tlnp`, which checks TCP. Changed it to `ss -6 -ulnp` because IPsec/L2TP uses UDP listeners.
- Several placeholder IPv6 addresses were syntactically invalid. Replaced them with documentation-range IPv6 literals such as `2001:db8::10`.
- `OpenVpnMakeConfig /FILE:openvpn-config.zip` used a nonexistent `/FILE` option. Changed it to the documented positional argument form, `OpenVpnMakeConfig openvpn-config.zip`.
- The OpenVPN client `remote` example did not force IPv6 transport. Changed the protocol suffix to `udp6`, matching OpenVPN's documented protocol selectors.
- The `vpn_server.config` example implied a literal `::` listener binding inside `ListenerList`. Updated it to show `DisableIPv6Listener false`, which is how SoftEther controls IPv6 listener mirroring.
- `SessionGet /NAME:VPN_session1` used the wrong vpncmd argument form. Changed it to `SessionGet VPN_session1`.

## Review Notes
The pinned SoftEther download URL still resolves successfully, but it points to a 2023 beta build. A future update could use the current SoftEther download page or package manager instructions instead of pinning an old build.
