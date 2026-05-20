# Validation Summary: How to Configure WiFi with WPA3 on Ubuntu

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Ubuntu
- WPA3-Personal and WPA3-Enterprise
- NetworkManager and nmcli
- wpa_supplicant
- Netplan
- Linux wireless tools (`iw`)

## Sources Consulted
- NetworkManager nm-settings-nmcli reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- wpa_supplicant local manual/help output from Ubuntu package `wpasupplicant` 2.10
- Linux Wireless `iw` documentation: https://wireless.docs.kernel.org/en/latest/en/users/documentation/iw.html
- Wi-Fi Alliance WPA3 announcement and certification material: https://www.globenewswire.com/news-release/2018/06/26/1529297/0/en/Wi-Fi-Alliance-introduces-Wi-Fi-CERTIFIED-WPA3-security.html
- Cisco WPA3 Deployment Guide for deployment-mode cross-checks: https://www.cisco.com/c/en/us/products/collateral/wireless/catalyst-9100ax-access-points/wpa3-dep-guide-og.html

## Issues Found
- Clarified the WPA3 security claim from "eliminates offline dictionary attacks" to "prevents passive offline dictionary attacks against captured handshakes" to avoid overstating SAE's protection.
- Scoped the "two main modes" statement to home and small-office networks, since WPA3-Enterprise is also covered later in the post.
- Replaced the `wpa_supplicant -h | grep CONFIG_SAE` check because `wpa_supplicant` help output does not expose compile-time `CONFIG_SAE` flags on Ubuntu. The post now uses a practical binary-string check for SAE-related support.
- Corrected the NetworkManager transition-mode note: official NetworkManager settings document `wpa-psk` as the WPA2/WPA3 personal transition setting and `sae` as WPA3-Personal only.
- Added `wpa_cli status | grep key_mgmt` where the post asks readers to verify the negotiated security method, because the nearby `nmcli device show` command does not show that detail.
- Corrected WPA3-Enterprise wording to distinguish normal 802.1X/EAP with PMF from WPA3-Enterprise 192-bit mode, which uses `WPA-EAP-SUITE-B-192`.
- Corrected the `iw dev wlan0 link` description. `iw` link status shows SSID, signal, and bitrate information, not the negotiated WPA key management method.

## Review Notes
The examples remain version-sensitive to Ubuntu packaging, WiFi adapter firmware, and AP configuration. The Netplan WPA3 example is consistent with the documented `auth.key-management: sae` form. Pure WPA3, transition mode, and enterprise connections may still fail on older drivers or access points even when the configuration syntax is correct.
