# Validation Summary: How to Configure IKEv2 for IPv6 on Linux with Libreswan

## Status
validated

## Post Type
Guide

## Technologies Covered
- Libreswan
- IKEv2
- IPsec
- IPv6
- Linux XFRM/IPsec tooling
- NSS certificate tooling (`certutil`, `pk12util`)

## Sources Consulted
- Libreswan `ipsec.conf` man page: https://libreswan.org/man/ipsec.conf.5.html
- Libreswan `ipsec` man page: https://libreswan.org/man/ipsec.8.html
- Libreswan `ipsec-up` man page: https://libreswan.org/man/ipsec-up.8.html
- Libreswan `ipsec-initnss` man page: https://libreswan.org/man/ipsec-initnss.8.html
- Libreswan `ipsec.secrets` man page: https://libreswan.org/man/ipsec.secrets.5.html
- Libreswan `ipsec-pluto` man page: https://libreswan.org/man/ipsec-pluto.8.html
- Libreswan NSS HOWTO: https://libreswan.org/wiki/HOWTO%3A_Using_NSS_with_libreswan
- Mozilla NSS `certutil` documentation: https://nss-crypto.org/reference/security/nss/legacy/tools/certutil/index.html
- strongSwan introduction and configuration docs: https://docs.strongswan.org/docs/latest/howtos/introduction.html and https://docs.strongswan.org/docs/latest/swanctl/swanctlConf.html
- strongSwan logging and credential-directory docs: https://docs.strongswan.org/docs/latest/config/logging.html and https://docs.strongswan.org/docs/latest/swanctl/swanctlDir.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The post used invalid IPv6 examples such as `2001:db8:gw1::1` and `2001:db8:net1::/48`. These were replaced with valid `2001:db8::/32` documentation-prefix addresses.
- The post mixed obsolete Libreswan syntax with current syntax by using `ikev2=insist` and `keylife=`. These were updated to the current `keyexchange=ikev2` and `salifetime=` forms documented by Libreswan.
- The IKE/ESP proposal examples were not valid current Libreswan proposal syntax. They were corrected to `esp=aes_gcm256` and `ike=aes256-sha2_256;dh19`.
- The operational command examples used outdated `ipsec auto --add/--up` and `ipsec --version` forms. These were updated to `ipsec add`, `ipsec up`, and `ipsec version`, and `ipsec rereadsecrets` was added for PSK changes on a running daemon.
- The certificate instructions used the old NSS database path `/etc/ipsec.d`, omitted `-k rsa`, and used `certutil -8` incorrectly with an IPv6 address. These were corrected to use `sql:/var/lib/ipsec/nss`, explicit RSA key generation, and a DNS SAN matching the configured gateway ID.
- The CA export step was wrong: it exported a gateway PKCS#12 bundle instead of the CA certificate. This was corrected to export the CA certificate with `certutil -L -a`.
- The troubleshooting section used an invalid `ipsec pluto --debug-all` example. It was replaced with documented `plutodebug=all` guidance.
- The strongSwan comparison table overstated config/logging differences and implied comparable NSS handling. It was corrected to reflect current strongSwan `swanctl.conf`/legacy `ipsec.conf` usage, logging backends, and file-based credential handling.

## Review Notes
- No runtime validation was performed in this workspace because Libreswan is not installed here; the review was completed against current official Libreswan, strongSwan, NSS, and RFC documentation.
- The `certutil -S` commands are interactive unless additional automation flags/files are supplied. The examples are technically valid, but they still require operator input during certificate creation.
- Because the sample connections use `auto=start`, restarting the `ipsec` service will also try to initiate the tunnels automatically.
