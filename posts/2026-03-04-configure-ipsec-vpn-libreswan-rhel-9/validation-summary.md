# Validation Summary: How to Configure an IPsec VPN Using Libreswan on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Libreswan
- IPsec/IKEv2
- NSS certificate database
- firewalld
- Linux IP forwarding and XFRM

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Setting up an IPsec VPN": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/setting-up-an-ipsec-vpn_configuring-and-managing-networking
- Libreswan `ipsec.conf(5)` manual: https://libreswan.org/man/ipsec.conf.5.html
- Libreswan `ipsec(8)` manual: https://libreswan.org/man/ipsec.8.html
- Libreswan `ipsec-pluto(8)` manual: https://libreswan.org/man/ipsec-pluto.8.html
- Libreswan `ipsec.secrets(5)` manual: https://libreswan.org/man/ipsec.secrets.5.html
- firewalld service examples documentation: https://firewalld.org/documentation/service/examples.html

## Issues Found
- The post stated that Libreswan is usually installed by default on RHEL. Red Hat documents installing the `libreswan` package before configuring IPsec, so this was changed to say that Libreswan is available in the RHEL repositories.
- The firewall section added the `ipsec` firewalld service and then separately opened UDP 500 and 4500. The official firewalld `ipsec` service already includes UDP 500/4500 and ESP/AH, so the redundant port commands were removed and the comment was corrected.
- The certificate-based connection used `leftcert` but did not configure `leftrsasigkey=%cert`, `rightrsasigkey=%cert`, or certificate-derived IDs. Red Hat and Libreswan document these settings for certificate-backed RSA authentication, so the example was updated to use `%fromcert`, `%cert`, and `leftsendcert=always`.
- The troubleshooting command `ipsec showhostkey --list` was presented as a PSK check, but it lists host keys rather than pre-shared secrets. This was replaced with a check of the PSK secrets file entry.
- The direct `ipsec pluto --stderrlog` troubleshooting command was incomplete for foreground debugging. The example now stops the service first and uses `--nofork --stderrlog`, matching Libreswan's debugging guidance.

## Review Notes
The guide is technically sound after the corrections. The explicit `ike=` and `esp=` proposals are valid, but RHEL normally follows system-wide cryptographic policies when proposals are not pinned; future revisions could mention that leaving these unset is often preferable unless interoperability requires fixed proposals.
