# Validation Summary: How to Configure Remote Access IPv6 VPN with IPsec

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPsec / IKEv2
- strongSwan
- `swanctl` / `pki`
- Windows PowerShell VPN cmdlets
- Linux networking and `ip6tables`

## Sources Consulted
- strongSwan Documentation: Virtual IP Addresses — https://docs.strongswan.org/docs/latest/features/vip.html
- strongSwan Documentation: `swanctl.conf` — https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan Documentation: Algorithm Proposals (Cipher Suites) — https://docs.strongswan.org/docs/latest/config/proposals.html
- strongSwan Documentation: `swanctl --initiate` — https://docs.strongswan.org/docs/latest/swanctl/swanctlInitiate.html
- strongSwan Documentation: `pki --issue` — https://docs.strongswan.org/docs/latest/pki/pkiIssue.html
- strongSwan Documentation: Windows Certificate Requirements — https://docs.strongswan.org/docs/latest/interop/windowsCertRequirements.html
- strongSwan Documentation: Windows Clients — https://docs.strongswan.org/docs/latest/interop/windowsClients.html
- Microsoft Learn: `Add-VpnConnection` — https://learn.microsoft.com/en-us/powershell/module/vpnclient/add-vpnconnection?view=windowsserver2025-ps
- Microsoft Learn: `Set-VpnConnectionIPsecConfiguration` — https://learn.microsoft.com/en-us/powershell/module/vpnclient/set-vpnconnectionipsecconfiguration?view=windowsserver2025-ps
- Microsoft Learn: `Add-VpnConnectionRoute` — https://learn.microsoft.com/en-us/powershell/module/vpnclient/add-vpnconnectionroute?view=windowsserver2025-ps
- RFC 3849: IPv6 Documentation Prefix — https://www.rfc-editor.org/info/rfc3849
- RFC 4291: IPv6 Addressing Architecture — https://www.rfc-editor.org/rfc/rfc4291

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:vpn::1`, `2001:db8:corp::/48`, and `2001:db8:vpn-clients::/64`. IPv6 hextets are hexadecimal only. I replaced them with valid documentation addresses under `2001:db8::/32`.
- The gateway `children.road-warrior.remote_ts = ::/0` setting was incorrect for strongSwan virtual IP pools. strongSwan documents that the responder should leave `remote_ts` at its default `dynamic` value so it narrows to each assigned virtual IP. I removed that setting.
- The ESP proposal `aes256gcm128-prfsha256-ecp256` was not a valid strongSwan ESP proposal because PRF algorithms apply to IKE proposals, not ESP proposals. I replaced the proposal set with valid server/client settings and aligned the Windows example to match.
- The Linux client configuration did not request an IPv6 virtual IP, so it would not receive an address from the configured pool. I added `vips = ::` as required by strongSwan for IPv6 virtual IP requests.
- The Linux connection command used the wrong `swanctl --initiate` syntax (`conn:... child:...`). I corrected it to `swanctl --initiate --ike corp-vpn --child vpn-traffic` per the current `swanctl` CLI.
- The gateway certificate issuance example omitted certificate details that Windows clients rely on at issuance time. I added the SAN values to `pki --issue` and the `serverAuth` / `ikeIntermediate` EKU flags, and I added an explicit note that clients must trust `ca.cert.pem`.
- The Windows example did not install a matching IPv6 route and did not configure IPsec parameters to match the server proposals. I added `Set-VpnConnectionIPsecConfiguration`, `Add-VpnConnectionRoute`, and switched the profile to `Maximum` encryption with explicit split tunneling.
- The original `rekey_time = 3600s` on the CHILD_SA could cause server-initiated CHILD rekey failures with Windows clients behind NAT. I changed it to `rekey_time = 0s` so the client initiates CHILD rekeying, which matches strongSwan’s Windows interoperability guidance.

## Review Notes
- The guide now describes a working split-tunnel IPv6 setup for the corporate prefix, not a full-tunnel IPv6 configuration. Windows clients would need broader route configuration only if full-tunnel IPv6 were desired.
- `journalctl -u strongswan` is correct for `charon-systemd` installs, but service names can differ on other packaging layouts.
- The certificate-generation steps still create the CA private key on the VPN gateway for simplicity. That works technically, but strongSwan’s PKI guidance recommends keeping CA private keys off internet-exposed hosts.
