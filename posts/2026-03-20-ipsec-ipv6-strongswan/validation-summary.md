# Validation Summary: How to Configure IPsec VPN with IPv6 on strongSwan

## Status
validated

## Post Type
Guide

## Technologies Covered
- strongSwan
- IPsec
- IKEv2
- IPv6
- `swanctl`
- Legacy `ipsec.conf` / `stroke` backend
- Linux `ip xfrm`

## Sources Consulted
- strongSwan Installation Documentation: https://docs.strongswan.org/docs/latest/install/install.html
- `swanctl.conf` reference: https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- Algorithm Proposals (Cipher Suites): https://docs.strongswan.org/docs/latest/config/proposals.html
- Virtual IP Addresses: https://docs.strongswan.org/docs/latest/features/vip.html
- `swanctl` tool reference: https://docs.strongswan.org/docs/latest/swanctl/swanctl.html
- `swanctl --initiate`: https://docs.strongswan.org/docs/latest/swanctl/swanctlInitiate.html
- `swanctl --terminate`: https://docs.strongswan.org/docs/latest/swanctl/swanctlTerminate.html
- `swanctl --version`: https://docs.strongswan.org/docs/latest/swanctl/swanctlVersion.html
- `strongswan.conf` reference: https://docs.strongswan.org/docs/latest/config/strongswanConf.html
- strongSwan EAP configuration with passwords: https://docs.strongswan.org/docs/latest/interop/windowsEapServerConf.html
- Windows clients / EAP-MSCHAPv2 notes: https://docs.strongswan.org/docs/latest/interop/windowsClients.html
- strongSwan plugin list: https://docs.strongswan.org/docs/latest/plugins/plugins.html
- Debian `charon-systemd` package details: https://packages.debian.org/bookworm/charon-systemd
- Debian `libcharon-extauth-plugins` package details: https://packages.debian.org/bookworm/libcharon-extauth-plugins
- Debian `ipsec.conf(5)` man page: https://manpages.debian.org/bookworm/strongswan-starter/ipsec.conf.5.en.html
- Official strongSwan legacy EAP gateway example (`rightauth=eap-mschapv2`): https://docs.strongswan.org/docs/5.9/_attachments/LinuxKongress_Dresden_2009.pdf
- RFC 6434: https://www.rfc-editor.org/rfc/rfc6434
- RFC 9099: https://www.ietf.org/rfc/rfc9099.html

## Issues Found
- The Debian/Ubuntu install command mixed the legacy `strongswan` metapackage with the modern `swanctl`/`charon-systemd` backend. I changed it to `strongswan-swanctl charon-systemd` and added `libcharon-extauth-plugins` because the post configures `EAP-MSCHAPv2`.
- The version check used `strongswan version`, which does not match the modern `swanctl` workflow documented by strongSwan. I changed it to `swanctl --version`.
- Several IPv6 examples used invalid literals or prefixes (`2001:db8::vpn-server`, `fd00:ipsec::/64`, `2001:db8:server::/48`, `2001:db8:client::/48`, `2001:db8::server`). I replaced them with syntactically valid documentation/test addresses.
- The main `swanctl.conf` server example set `remote_ts = ::/0` while also assigning virtual IPs from a pool. Per strongSwan's virtual IP documentation, the responder side should use the default/dynamic remote traffic selector so it narrows to the assigned client address. I changed this to `remote_ts = dynamic`.
- The main `swanctl.conf` example used `install_routes = yes` inside a child definition. That is not a valid `swanctl.conf` child option; route installation is controlled via `charon.install_routes` in `strongswan.conf`. I removed the invalid setting and corrected the note.
- The site-to-site IPv4-transport/IPv6-tunnel example used `esp_proposals = aes256gcm16-sha384`, which incorrectly mixes an AEAD algorithm with a separate integrity algorithm. I changed it to `aes256gcm16-ecp384`, which is valid strongSwan proposal syntax.
- Both example connections used the same child name `ipv6-child`, which makes the later `swanctl --initiate --child ...` example ambiguous if both configs are loaded. I renamed the child sections and updated the initiation command to use the unique child name.
- The legacy `ipsec.conf` section was labeled as "strongSwan 4.x style", which is misleading. `ipsec.conf` is a deprecated `stroke` backend, not a 4.x-only format. I corrected the heading.
- The legacy `ipsec.conf` snippet was incomplete for an IKEv2 EAP-MSCHAPv2 gateway. I added the missing certificate/authentication directives (`leftcert`, `leftid`, `leftauth`, `rightsendcert`, `rightauth`, `eap_identity`) and removed the incorrect `rightsubnet=::/0` pattern.
- The IPv6/IPsec comparison table said "Originally mandatory", which could be read as mandatory for use rather than mandatory to implement. I corrected it to "Originally mandatory to implement" to match the RFC history.
- The final sentence implied hardware acceleration as a general property of the configuration. I simplified it to AES-GCM encryption because acceleration depends on the platform/kernel/crypto backend, not just the config.
- The verification command hard-coded an invalid IPv6 address and used a less explicit target assumption. I changed it to `ping -6 -c 3 <client-assigned-ipv6>`.

## Review Notes
- The post is technically valid after the fixes above.
- The legacy `ipsec.conf` / `stroke` backend is deprecated and not installed by default on modern strongSwan setups.
- The examples use documentation-only address space (`2001:db8::/32`, `192.0.2.0/24`, `198.51.100.0/24`), so they are syntactically correct but intentionally non-routable.
- The review was documentation-based; no live strongSwan tunnel was established in this workspace.
