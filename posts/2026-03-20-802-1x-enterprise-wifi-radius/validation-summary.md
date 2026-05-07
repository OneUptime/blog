# Validation Summary: How to Configure 802.1X Enterprise WiFi Authentication with RADIUS

## Status
validated

## Post Type
Guide

## Technologies Covered
- IEEE 802.1X
- RADIUS
- FreeRADIUS
- PEAP / EAP-MSCHAPv2
- Dynamic VLAN assignment
- Cisco Catalyst 9800 Wireless Controller
- Ubiquiti UniFi

## Sources Consulted
- FreeRADIUS, "Adding a new user to the server": https://www.freeradius.org/documentation/freeradius-server/4.0.0/tutorials/new_user.html
- FreeRADIUS, "The default Virtual Server": https://www.freeradius.org/documentation/freeradius-server/4.0.0/reference/raddb/sites-available/default.html
- FreeRADIUS, "EAP-PEAP: Tunneled authentication" (3.2.9): https://www.freeradius.org/documentation/freeradius-server/3.2.9/tutorials/eap-peap.html
- FreeRADIUS, "EAP Certificates": https://www.freeradius.org/documentation/freeradius-server/4.0.0/troubleshooting/eap_certificates.html
- FreeRADIUS `radtest` manual page: https://www.freeradius.org/radiusd/man/radtest.txt
- FreeRADIUS `users` manual page: https://www.freeradius.org/radiusd/man/users.txt
- RFC 3580, "IEEE 802.1X RADIUS Usage Guidelines": https://datatracker.ietf.org/doc/rfc3580/
- RFC 2868, "RADIUS Attributes for Tunnel Protocol Support": https://datatracker.ietf.org/doc/html/rfc2868
- Cisco, "Configure 802.1X Authentication on Catalyst 9800 Wireless Controller Series": https://www.cisco.com/c/en/us/support/docs/wireless/catalyst-9800-series-wireless-controllers/213919-configure-802-1x-authentication-on-catal.pdf
- Cisco, "Cisco Catalyst 9800 Series Wireless Controller Software Configuration Guide, Cisco IOS XE 17.18.x - WLAN Security": https://www.cisco.com/c/en/us/td/docs/wireless/controller/9800/17-18/config-guide/b_wl_17_18_cg/m_wlan_security_9800.html
- Ubiquiti, "Configuring a RADIUS Server in UniFi": https://help.ui.com/hc/en-us/articles/360015268353-Configuring-a-RADIUS-Server-in-UniFi

## Issues Found
- The post told readers to edit `/etc/freeradius/3.0/users`. FreeRADIUS v3 documentation says the default `files` module reads `mods-config/files/authorize`, so the example was corrected to `/etc/freeradius/3.0/mods-config/files/authorize`.
- The VLAN assignment example used bare numeric `Tunnel-Private-Group-ID` values. RFC 3580 and RFC 2868 define that attribute as a string for VLAN assignment, so the VLAN IDs were quoted.
- The EAP/TLS snippet pointed `private_key_file` at `server.pem` and used `CA_file`. FreeRADIUS documents a separate key file (`server.key`) and the `ca_file` setting, so those values were corrected.
- The explanation of RADIUS clients was too narrow. In controller-based WLANs, the wireless controller often acts as the RADIUS client instead of the AP, so the wording was broadened.
- The Cisco controller example used incomplete or outdated generic CLI and did not show the AAA override configuration required for RADIUS-assigned VLANs on Catalyst 9800. It was replaced with a documented Catalyst 9800 example.
- The UniFi navigation path was outdated (`Settings → Profiles → RADIUS`) and the VLAN step did not match current UniFi terminology. It was updated to the current `Settings → Networks → RADIUS Servers` flow and `RADIUS Assigned VLAN` wording.
- The `radtest` example used the AP shared secret against the server IP, which would fail unless the test host were separately defined as a RADIUS client. It was changed to a localhost test using the default `testing123` client secret documented by FreeRADIUS.
- The troubleshooting command piped `freeradius -X` into `tail -50`, which would not provide the live debug output needed for diagnosis. It was corrected to run `sudo freeradius -X` directly.

## Review Notes
- `use_tunneled_reply = yes` is valid for FreeRADIUS 3.x, which matches the `/etc/freeradius/3.0/...` paths used in the post, but that option is removed in FreeRADIUS 4.x.
- PEAP/EAP-MSCHAPv2 is still widely supported, but new enterprise WiFi deployments often prefer EAP-TLS where client certificate management is practical.
- On Debian and Ubuntu packages, the server binary is `freeradius`; upstream documentation often uses `radiusd` for the same debug workflow.
