# Validation Summary: How to Configure 802.1X Port-Based Authentication on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- IEEE 802.1X
- FreeRADIUS
- RADIUS
- EAP, PEAP-MSCHAPv2, and EAP-TLS
- wpa_supplicant
- systemd
- Cisco IOS / IOS XE switch 802.1X configuration

## Sources Consulted
- FreeRADIUS Getting Started documentation: https://www.freeradius.org/documentation/freeradius-server/4.0.0/getstarted.html
- FreeRADIUS EAP-PEAP tutorial for version 3.2.9: https://www.freeradius.org/documentation/freeradius-server/3.2.9/tutorials/eap-peap.html
- FreeRADIUS EAP certificate documentation: https://www.freeradius.org/documentation/freeradius-server/4.0.0/troubleshooting/eap_certificates.html
- RFC 3580, IEEE 802.1X RADIUS usage guidelines and VLAN tunnel attributes: https://www.freeradius.org/rfc/rfc3580.html
- Debian wpa_supplicant man page: https://manpages.debian.org/wpa_supplicant
- Debian wpa_supplicant wired systemd unit source: https://sources.debian.org/src/wpa/2%3A2.10-25/wpa_supplicant/systemd/wpa_supplicant-wired.service.arg.in
- Cisco IOS XE 802.1X port-based authentication guide: https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/sec_usr_8021x/configuration/xe-3e/sec-usr-8021x-xe-3e-book/config-ieee-802x-pba.html
- Local Ubuntu wpasupplicant package files and command help: `wpa_supplicant -h`, `man wpa_supplicant.conf`, `/lib/systemd/system/wpa_supplicant-wired@.service`

## Issues Found
- The Ubuntu FreeRADIUS verification command used `radiusd -v`. On Debian-based systems the installed daemon command is `freeradius`, so this was changed to `freeradius -v`.
- The VLAN reply attribute was written as `Tunnel-Private-Group-Id`. RFC 3580 and FreeRADIUS documentation use `Tunnel-Private-Group-ID`, so the attribute name was corrected.
- The EAP TLS certificate paths pointed to `/etc/ssl/...` files that were not the files generated in the following certificate step. The paths were changed to `/etc/freeradius/3.0/certs/server.key`, `/etc/freeradius/3.0/certs/server.pem`, and `/etc/freeradius/3.0/certs/ca.pem`.
- The PEAP inner method setting used `default_method = mschapv2`; FreeRADIUS 3.x examples and documentation use `default_eap_type = mschapv2`, so this was corrected.
- VLAN assignment with PEAP was shown while `use_tunneled_reply = no` was configured. For PEAP with reply attributes such as VLAN assignment, the tunneled reply must be copied to the outer reply, so this was changed to `use_tunneled_reply = yes`.
- The debug command piped `freeradius -X` to `head`, which would terminate the debug server and prevent the second-terminal `radtest` command from working. The command was changed to `sudo freeradius -X`.
- The wired wpa_supplicant section used the generic `wpa_supplicant@eth0` unit and `wpa_supplicant-eth0.conf`. Ubuntu's packaged wired unit uses the wired driver and the `wpa_supplicant-wired-%I.conf` naming pattern, so the service and config path were changed to `wpa_supplicant-wired@eth0` and `/etc/wpa_supplicant/wpa_supplicant-wired-eth0.conf`.
- The wired wpa_supplicant configuration omitted `ap_scan=0`, which is shown in the wpa_supplicant wired IEEE 802.1X example. This was added to the configuration.

## Review Notes
The remaining examples are broadly correct for a basic FreeRADIUS 3.x and Ubuntu wired 802.1X setup. In a future revision, the guide could recommend `domain_suffix_match` or a similarly strict server identity check for wpa_supplicant instead of leaving server subject validation commented out, but the current text does at least include CA validation.
