# Validation Summary: How to Configure IPsec VPN with IPv6 on Libreswan

## Status
validated

## Post Type
Guide

## Technologies Covered
- Libreswan
- IPsec
- IKEv2
- IPv6
- RHEL / Fedora style system administration
- firewalld

## Sources Consulted
- Libreswan `ipsec.conf(5)`: https://libreswan.org/man/ipsec.conf.5.html
- Libreswan `ipsec(8)`: https://libreswan.org/man/ipsec.8.html
- Libreswan `ipsec-whack(8)`: https://libreswan.org/man/ipsec-whack.8.html
- Libreswan `ipsec.secrets(5)`: https://libreswan.org/man/ipsec.secrets.5.html
- Libreswan `ipsec-import(8)`: https://libreswan.org/man/ipsec-import.8.html
- Libreswan wiki, VPN server for remote clients using IKEv2: https://libreswan.org/wiki/VPN_server_for_remote_clients_using_IKEv2%C2%A0
- Red Hat Enterprise Linux 9 networking documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_networking/configuring_and_managing_networking
- Local command help used to confirm `ip xfrm` and modern `ping` syntax on the review host: `ip xfrm help`, `ping -h`

## Issues Found
- The post used invalid IPv6 example literals such as `2001:db8::site-a-gateway`, `2001:db8:site-a::/48`, and `fd00:ipsec::/64`. These are not syntactically valid IPv6 addresses or prefixes, so they were replaced with valid documentation addresses and a valid ULA prefix.
- The IKE proposal syntax used `ike=aes256-sha2_256-dh14`. Current Libreswan syntax separates the DH group with a semicolon, so this was corrected to `ike=aes256-sha2_256;dh14`.
- The IKEv2 road-warrior example used `rightsourceip` and `rightdns`. For Libreswan IKEv2 client address assignment and pushed DNS settings, the correct options are `rightaddresspool` and `modecfgdns`, so those lines were corrected and `narrowing=yes` was added to match the documented IKEv2 remote-access pattern.
- The IPv6 PSK example in `/etc/ipsec.secrets` used `%any %any`, which is not the right match pattern for an IPv6 road-warrior responder. It was corrected to use the server IPv6 address with `%any6`, and the per-peer example was updated to valid IPv6 addresses.
- The certificate example treated `leftcert=` like a PEM filename in `/etc/ipsec.d/certs/`. Current Libreswan uses NSS, so `leftcert=` must reference the certificate nickname in the NSS database. The example was updated accordingly, along with `leftrsasigkey=%cert`, `rightrsasigkey=%cert`, and `leftsendcert=always`.
- The certificate inspection command used `certutil -d /etc/ipsec.d -L`, which does not match the default NSS database location on current rpm-based Libreswan systems. It was corrected to `certutil -d sql:/var/lib/ipsec/nss -L`.
- Several operational commands were inaccurate or outdated for the stated purpose. `ipsec --version` was corrected to `ipsec version`, `ipsec auto --start` to `ipsec auto --up`, `ipsec verify` to `ipsec checkconfig` for syntax validation, `ip -6 xfrm ...` to `ip xfrm ...`, `ping6` to `ping -6`, and `ipsec auto --log-all` to `ipsec whack --debug all`.
- The troubleshooting note about certificate mismatches referred to matching the certificate CN to `left/right`. This was corrected to matching certificate SAN/ID data to `leftid/rightid`, which is the relevant Libreswan identity check.

## Review Notes
- `ipsec verify` still appears in Libreswan examples as a broader system/environment check, but `ipsec checkconfig` is the correct command when the goal is to validate configuration syntax specifically.
- `leftcert=` must match the nickname stored in the NSS database after `ipsec import`. If the imported PKCS#12 bundle uses a different nickname than `vpn.example.com`, that line must be adjusted to match the imported name.
- Libreswan's official IKEv2 remote-access documentation focuses on certificate-based authentication for broad client interoperability. The corrected PSK-based road-warrior example is syntactically valid, but client support depends on the peer implementation.
