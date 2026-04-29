# Validation Summary: How to Configure L2TP/IPsec with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- L2TP
- IPsec
- IKEv1
- IPv6 / IPv6CP
- xl2tpd
- pppd
- strongSwan
- Libreswan
- iptables / ip6tables

## Sources Consulted
- strongSwan installation documentation: https://docs.strongswan.org/docs/latest/install/install.html
- strongSwan protocol overview and transport mode notes: https://docs.strongswan.org/docs/5.9/howtos/ipsecProtocol.html
- strongSwan introduction and deprecation notes for IKEv1 / `ipsec.conf`: https://docs.strongswan.org/docs/latest/howtos/introduction.html
- pppd documentation: https://ppp.samba.org/pppd.html
- xl2tpd upstream repository: https://github.com/xelerance/xl2tpd
- xl2tpd.conf(5) man page mirror: https://www.systutorials.com/docs/linux/man/5-xl2tpd.conf/
- RFC 3193, Securing L2TP using IPsec: https://datatracker.ietf.org/doc/html/rfc3193
- RFC 5072, IP Version 6 over PPP: https://datatracker.ietf.org/doc/html/rfc5072
- Android built-in VPN client documentation: https://support.google.com/work/android/answer/9213914?hl=en-GB
- Apple L2TP over IPsec VPN documentation: https://support.apple.com/en-sg/guide/mac-help/-mh119412/mac
- Microsoft L2TP/IPsec client documentation: https://learn.microsoft.com/en-us/troubleshoot/windows-client/networking/l2tp-ipsec-vpn-client-connection-issue

## Issues Found
- The post implied the shown configuration would generally assign usable IPv6 addresses inside the tunnel. I corrected the architecture and explanatory text to say that `+ipv6` enables IPv6CP and typically only provides link-local IPv6 unless additional routing or prefix configuration is added, which matches RFC 5072 and pppd behavior.
- The `ipsec saref = yes` example was incorrect for the stated strongSwan/Libreswan setup. I removed it because xl2tpd documents SAref support as specific to Openswan KLIPS in `mast` mode.
- The PPP authentication example used `xl2tpd` as the server field in `chap-secrets` without setting pppd's local authentication name. I added `name xl2tpd` so the secret lookup matches documented pppd behavior.
- The service example used `systemctl start strongswan`, which corresponds to the `charon-systemd` backend, while the post configures the legacy `ipsec.conf` backend. I changed the command to `strongswan-starter` and kept a separate Libreswan `ipsec` note so the commands align with the documented packages.
- The commented IPv6 DNS line said `ms-dns6` was "not standard in xl2tpd". I corrected that note to reflect the actual issue: pppd does not provide an `ms-dns6` option.

## Review Notes
- The guide is now technically consistent, but it still documents a legacy compatibility path: L2TP/IPsec depends on IKEv1 for broad native-client interoperability, and strongSwan's `ipsec.conf` / `stroke` backend is deprecated in current upstream documentation even though it is still shipped by the Debian/Ubuntu `strongswan` metapackage.
- The post now accurately states the IPv6 limitation, but readers who need routed global IPv6 over the tunnel will still need additional per-environment routing, prefix delegation, or address management beyond what this article covers.
