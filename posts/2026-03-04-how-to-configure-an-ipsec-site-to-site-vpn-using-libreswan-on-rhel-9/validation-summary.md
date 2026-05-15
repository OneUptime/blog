# Validation Summary: How to Configure an IPsec Site-to-Site VPN Using Libreswan on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Libreswan
- IPsec site-to-site VPN
- firewalld
- NSS certificate database
- Linux IPv4 forwarding

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up an IPsec VPN: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/setting-up-an-ipsec-vpn_configuring-and-managing-networking
- Libreswan ipsec.conf(5) manual: https://libreswan.org/man/ipsec.conf.5.html
- Libreswan ipsec.secrets(5) manual: https://libreswan.org/man/ipsec.secrets.5.html
- Libreswan ipsec(8) manual: https://libreswan.org/man/ipsec.8.html

## Issues Found
- The firewall commands opened the `ipsec` firewalld service and then separately opened UDP ports 500 and 4500. Red Hat documents adding the `ipsec` service because it covers the required IPsec ports and protocols. Removed the redundant explicit UDP port commands.
- The start commands used `auto=start` in the connection configuration, then restarted IPsec and manually ran `ipsec auto --add` and `ipsec auto --up`. Libreswan documents `auto=start` as equivalent to adding and bringing up the connection at startup, so the manual add/up sequence after restart is unnecessary and can conflict with an already loaded connection. Changed the start step to restart the `ipsec` service.
- The certificate example generated a certificate with `ipsec certutil -S` but did not match Red Hat's documented Libreswan certificate-authentication workflow, which imports a PKCS #12 bundle into the Libreswan NSS database and uses the certificate nickname. Replaced the example with `ipsec import ~/siteA.p12` and `certutil -L -d /var/lib/ipsec/nss/`.

## Review Notes
The post remains a concise overview rather than a complete production VPN design. Future improvements could mention configuring the remote peer with matching settings, adding return routes for protected subnets, and using explicit IKEv2 settings where interoperability requires them.
