# Validation Summary: How to Configure hostapd for WPA2/WPA3 on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Ubuntu
- hostapd
- WPA2-Personal / WPA2-Enterprise
- WPA3-Personal SAE / WPA3 transition mode
- IEEE 802.11w Protected Management Frames
- Linux wireless nl80211 / iw
- RADIUS authentication

## Sources Consulted
- hostapd project overview and configuration-file reference: https://w1.fi/hostapd/
- Upstream hostapd.conf mirror with WPA/SAE/PMF options: https://android.googlesource.com/platform/external/wpa_supplicant_8/+/master/hostapd/hostapd.conf
- Hostapd configuration mirror with SAE options and WPA3 key-management descriptions: https://git.ti.com/cgit/wilink8-wlan/hostap/tree/hostapd/hostapd.conf
- Linux kernel nl80211 netlink specification: https://docs.kernel.org/netlink/specs/nl80211.html
- Linux Wireless iw documentation: https://wireless.docs.kernel.org/en/latest/en/users/documentation/iw.html
- Linux Wireless hostapd documentation: https://wireless.docs.kernel.org/en/latest/en/users/documentation/hostapd.html

## Issues Found
- The WPA3 support and troubleshooting checks implied that `grep -i sae /boot/config-$(uname -r)` and `CONFIG_IEEE80211W` were kernel SAE support checks. Replaced them with `iw list` checks for AP mode and SAE-related capabilities, and clarified that hostapd itself must be built with SAE support.
- `sae_pwe=2` was described as H2E-only. Corrected it to mean both hunting-and-pecking and hash-to-element are enabled, matching hostapd's documented values.
- `sae_anti_clogging_threshold` was used even though current hostapd documents it as deprecated. Replaced it with `anti_clogging_threshold`.
- `wpa_ptk_rekey=0` was described as deauthenticating clients that fail authentication. Corrected the comment to describe pairwise key rekeying.
- `max_auth_tries=5` is not a documented hostapd.conf option in the reviewed upstream examples. Replaced it with `anti_clogging_threshold=5` and adjusted the comment to describe SAE anti-clogging behavior.
- `rsn_preauth_interfaces=wlan0` was presented as a minimum RSN/cipher setting. Corrected the comments to identify it as optional WPA-Enterprise roaming support and changed the example interface to `eth0`, since hostapd documents that the normal wireless data interface should not be listed there.

## Review Notes
The remaining configuration examples are version- and driver-dependent, especially 802.11ac `vht_capab` values and WPA3 support in Wi-Fi adapters. The hostapd WPA3 Enterprise example is a baseline 802.1X/PMF configuration; deployments that specifically require WPA3-Enterprise 192-bit mode should use the Suite-B-192 AKM and matching cipher/certificate requirements.
