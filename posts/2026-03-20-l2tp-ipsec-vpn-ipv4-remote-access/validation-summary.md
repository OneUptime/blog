# Validation Summary: How to Set Up L2TP/IPSec VPN for IPv4 Remote Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- L2TP
- IPsec / IKEv1
- StrongSwan
- xl2tpd
- PPP / pppd / CHAP
- iptables
- systemd
- Native Windows and macOS VPN clients

## Sources Consulted
- strongSwan Installation Documentation — https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan Introduction — https://docs.strongswan.org/docs/latest/howtos/introduction.html
- strongSwan `charon-systemd` documentation — https://docs.strongswan.org/docs/latest/daemons/charon-systemd.html
- Debian `strongswan-starter` package file list — https://packages.debian.org/sid/amd64/strongswan-starter/filelist
- Debian `xl2tpd.conf(5)` man page — https://manpages.debian.org/testing/xl2tpd/xl2tpd.conf.5.en.html
- `pppd(8)` manual page — https://www.man7.org/linux/man-pages/man8/pppd.8.html
- Microsoft Learn: Default encryption settings for the Windows L2TP/IPsec VPN client — https://learn.microsoft.com/en-us/troubleshoot/windows-client/windows-security/default-encryption-settings-for-l2tp-ipsec-vpn-client
- Microsoft Learn: VPN connection types — https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/vpn/vpn-connection-type
- Apple Support: Change options for L2TP over IPSec VPN connections on Mac — https://support.apple.com/en-kg/guide/mac-help/mh119412/mac
- RFC 9395: Deprecation of the Internet Key Exchange Version 1 (IKEv1) Protocol and Obsoleted Algorithms — https://datatracker.ietf.org/doc/html/rfc9395

## Issues Found
- `ipsec saref = yes` was incorrect for this setup. The `xl2tpd.conf(5)` man page documents SAref tracking as an Openswan KLIPS-specific feature, so I changed it to `ipsec saref = no` for a StrongSwan-based server.
- `name = L2TPVPN` was not a valid `xl2tpd.conf` directive. I changed it to `hostname = L2TPVPN`, then added `name L2TPVPN` to `/etc/ppp/options.xl2tpd` so PPP authentication uses an explicit local server name.
- The `chap-secrets` entries used `l2tpvpn` while the PPP local name was otherwise unset. I updated the server field to `L2TPVPN` so the secrets match the PPP `name` value.
- The service commands used `strongswan`, but the Debian/Ubuntu `strongswan` metapackage installs the legacy starter backend used by `ipsec.conf`/`ipsec.secrets`, which is managed by `strongswan-starter.service`. I updated Step 7 to use `strongswan-starter`.
- The firewall snippet allowed AH, but Microsoft's L2TP/IPsec client documentation states AH is not supported for this client mode. I removed the AH rule and kept ESP plus UDP 500/4500/1701.
- The closing note was too soft about protocol status. I updated it to state that L2TP/IPsec relies on deprecated IKEv1 and that IKEv2 is the preferred choice for new deployments.

## Review Notes
- The post is now technically consistent, but it still documents a legacy stack: native L2TP/IPsec remote access depends on IKEv1, and strongSwan documents both IKEv1 and the `ipsec.conf`/`ipsec.secrets` starter path as legacy/deprecated.
- The configured IKE/ESP proposals preserve compatibility with native L2TP/IPsec clients, but they necessarily include legacy algorithms associated with IKEv1 interoperability.
- `sysctl -w` and the `iptables` commands make runtime changes only. Persisting forwarding and firewall rules is distro-specific and intentionally not covered in this post.
