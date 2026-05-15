# Validation Summary: How to Configure 802.1X Network Authentication on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- IEEE 802.1X wired network authentication
- NetworkManager and nmcli
- wpa_supplicant
- PEAP/MSCHAPv2
- EAP-TLS
- EAP-TTLS/PAP
- RADIUS
- OpenSSL certificate inspection

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Authenticating a RHEL client to the network by using the 802.1X standard with a certificate stored on the file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/authenticating-a-rhel-client-to-the-network-using-the-802-1x-standard-with-a-certificate-stored-on-the-file-system_configuring-and-managing-networking
- Red Hat Enterprise Linux 9 documentation, "Managing wifi connections" / 802.1X PEAP examples and password storage notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/assembly_managing-wifi-connections_configuring-and-managing-networking
- NetworkManager 802-1x setting reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/settings-802-1x.html
- NetworkManager nm-settings-nmcli reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-nmcli.html
- NetworkManager keyfile plugin reference: https://networkmanager.pages.freedesktop.org/NetworkManager/NetworkManager/nm-settings-keyfile.html
- Local NetworkManager manual pages on this system: `nm-settings-nmcli(5)` and `nm-settings-keyfile(5)`

## Issues Found
- The post stated that passwords in NetworkManager keyfiles are encrypted at rest on RHEL. Red Hat and NetworkManager documentation state that passwords and passphrases can be stored in clear/plain text in connection profiles or keyfiles, protected by root-only file permissions. I changed the note to say the keyfile password is stored in plain text but readable only by root.
- The troubleshooting command `nmcli connection modify corporate-802.1x 802-1x.phase1-auth-flags 0x00000001` was described as disabling server certificate validation. NetworkManager documents `0x00000001` for `phase1-auth-flags` as `tls-1-0-disable`, not a certificate-validation bypass. I changed the example to temporarily unset `802-1x.ca-cert`, which matches NetworkManager's documented behavior that leaving `ca-cert` unset skips CA-based server validation and is not recommended for production.

## Review Notes
- The nmcli property names used in the PEAP, EAP-TLS, PKCS#12, and EAP-TTLS examples match NetworkManager's documented 802-1x setting names.
- The direct keyfile example uses the documented INI-style keyfile format, including the semicolon-delimited `eap=peap;` list syntax and root-only permissions requirement.
- Red Hat's RHEL 9 documentation demonstrates configuring 802.1X on an existing Ethernet profile with `nmcli connection modify`; this post creates new Ethernet profiles with `nmcli connection add`, which is valid NetworkManager usage but assumes the interface name and IP settings are appropriate for the host.
