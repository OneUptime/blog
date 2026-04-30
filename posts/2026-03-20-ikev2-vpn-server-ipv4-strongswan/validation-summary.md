# Validation Summary: How to Set Up IKEv2 VPN Server with IPv4 Using StrongSwan

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- IKEv2
- IPsec
- strongSwan
- strongSwan `pki`
- EAP-MSCHAPv2
- X.509 PKI
- Linux `iptables`
- Linux `systemd`

## Sources Consulted
- strongSwan Documentation: Configuration Files — https://docs.strongswan.org/docs/latest/config/config.html
- strongSwan Documentation: Introduction to strongSwan — https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan Documentation: `pki --gen` — https://docs.strongswan.org/docs/latest/pki/pkiGen.html
- strongSwan Documentation: `pki --self` — https://docs.strongswan.org/docs/latest/pki/pkiSelf.html
- strongSwan Documentation: `pki --issue` — https://docs.strongswan.org/docs/latest/pki/pkiIssue.html
- strongSwan Documentation: Windows Certificate Requirements — https://docs.strongswan.org/docs/latest/interop/windowsCertRequirements.html
- strongSwan Documentation: strongSwan EAP Configuration with Passwords — https://docs.strongswan.org/docs/latest/interop/windowsEapServerConf.html
- strongSwan Documentation: Forwarding and Split-Tunneling — https://docs.strongswan.org/docs/latest/howtos/forwarding.html
- strongSwan Documentation: NAT Traversal — https://docs.strongswan.org/docs/latest/features/natTraversal.html
- strongSwan Documentation: MOBIKE — https://docs.strongswan.org/docs/latest/features/mobike.html
- strongSwan Documentation: strongSwan VPN Client for Android — https://docs.strongswan.org/docs/latest/os/androidVpnClient.html
- Android Developers: VPN — https://developer.android.com/develop/connectivity/vpn
- Android Enterprise Help: Set up VPN on Android devices — https://support.google.com/work/android/answer/9213914
- strongSwan `ipsec.conf(5)` man page for 6.0.6 — https://manpages.opensuse.org/Tumbleweed/strongswan-ipsec/ipsec.conf.5.en.html
- strongSwan `ipsec(8)` man page for 6.0.6 — https://manpages.opensuse.org/Tumbleweed/strongswan-ipsec/ipsec.8.en.html
- strongSwan Installation Documentation — https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan Documentation: Apple IKEv2 Configuration Profile — https://docs.strongswan.org/docs/latest/interop/appleIkev2Profile.html

## Issues Found
- The description and opening paragraph implied generic certificate authentication, but the configuration actually uses server certificate authentication with EAP-MSCHAPv2 for users. I corrected the wording so the auth model matches the posted `ipsec.conf` and `ipsec.secrets`.
- The PKI copy step copied the CA private key onto the VPN server. I changed it to copy only the server private key, server certificate, and CA certificate, because the CA signing key is not required at runtime and should not be deployed to the gateway.
- The certificate generation note said to use an FQDN or public IP, but the rest of the post uses `leftid=@vpn.example.com` and the advertised Windows/macOS/iOS interoperability depends on hostname/SAN handling. I narrowed the instruction to an FQDN so it matches the shown configuration.
- The `ipsec.conf` connection omitted `leftauth=pubkey`. I added it to make the gateway’s local authentication method explicit and consistent with strongSwan’s EAP/MSCHAPv2 server examples.
- The firewall section said it was allowing ESP, but the rules only opened UDP 500 and UDP 4500 while the config forces UDP encapsulation. I corrected the wording to IKEv2/NAT-T and added a stateful forward rule so return traffic is allowed when forwarding client traffic.
- The startup command used a service-management detail that depends on packaging and backend choice. I changed it to `ipsec restart`, which matches the legacy `ipsec.conf` / `starter` workflow used by the post.
- The final client instruction said trusting the CA certificate was enough. I corrected it to require trusting the CA certificate and supplying a configured username and password, and I fixed the Android compatibility claim to refer to Android IKEv2 clients such as the strongSwan app rather than Android native clients.

## Review Notes
The post is technically valid after the fixes above, but it uses the legacy `ipsec.conf` / `ipsec.secrets` (`stroke`/`starter`) backend. Current strongSwan documentation prefers the modern `swanctl.conf` / VICI workflow, so a future refresh should consider updating the article to that configuration model.
