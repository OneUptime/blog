# Validation Summary: How to Configure WiFi Roaming with Seamless IPv4 Address Retention

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- IEEE 802.11r (Fast BSS Transition)
- IEEE 802.11k (Neighbor Reports / RRM)
- IEEE 802.11v (BSS Transition Management)
- OpenWrt / hostapd wireless configuration
- Cisco WLC WLAN configuration
- ISC DHCP server (`dhcpd.conf`)
- `wpa_supplicant` (Linux Wi-Fi client)
- Windows `netsh wlan`
- `iw`, `journalctl`, `ping` (Linux monitoring)

## Sources Consulted
- OpenWrt Wireless configuration wiki: https://openwrt.org/docs/guide-user/network/wifi/basic
- hostapd/wpa_supplicant source docs (`hostap.git`)
- `wpa_supplicant.conf` reference (FT-PSK / FT-EAP, `key_mgmt`, `bgscan`)
- Microsoft `netsh wlan` documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netsh-wlan
- Cisco Auto-Anchor Mobility configuration guide: https://www.cisco.com/c/en/us/td/docs/wireless/controller/8-5/config-guide/b_cg85/configuring_auto_anchor_mobility.html
- Cisco 802.11r/FT deployment guide: https://www.cisco.com/c/dam/en/us/td/docs/wireless/controller/technotes/80211r-ft/b-80211r-dg.html
- IEEE 802.11-2020 (802.11r/k/v amendments)
- ISC DHCP `dhcpd.conf(5)` manual

## Issues Found

1. **Invalid OpenWrt option `ieee80211v '1'`** — The OpenWrt/hostapd config does not expose a generic `ieee80211v` toggle. 802.11v features are configured via individual options such as `bss_transition`, `wnm_sleep_mode`, and `time_advertisement`. The existing `option bss_transition '1'` already enables BSS Transition Management (the 802.11v feature that matters for roaming). **Fix:** removed the invalid `option ieee80211v '1'` line; the comment "802.11v - BSS transition management" remains above `bss_transition '1'`.

2. **Misuse of `ft_eap_pmksa_caching=1` in wpa_supplicant** — This option, as its name suggests, applies only to FT-EAP (802.1X), not FT-PSK, and does not itself enable 802.11r. The example uses PSK. The correct way to enable 802.11r with PSK is to add `FT-PSK` to `key_mgmt`. **Fix:** replaced `ft_eap_pmksa_caching=1` with `key_mgmt=WPA-PSK FT-PSK` and updated the comment.

3. **Misleading Windows `netsh` comment** — The comment claimed the `netsh wlan set profileparameter ... connectionmode=auto` command sets "roaming aggressiveness (0=lowest, 3=medium, 5=highest)". It does not — `connectionmode` controls whether Windows auto-connects to the SSID. Roaming aggressiveness is a driver-specific adapter property configured via Device Manager. **Fix:** corrected the comment to accurately describe what `connectionmode=auto` does, and clarified that roaming aggressiveness must be set via adapter properties (with a 1–5 range, not 0–5).

4. **Misleading Cisco `mobility anchor` line** — The WLAN-level `mobility anchor <ip>` command configures guest-anchor / auto-anchor tunneling (client traffic is tunneled via CAPWAP/EoIP to a designated anchor WLC, typically in a DMZ for guest access). It is not what keeps clients on the same subnet during intra-campus roaming; that is done by mapping the WLAN to the same VLAN on every AP/WLC within a mobility group. **Fix:** removed the `mobility anchor 192.168.1.200` line and the misleading comment; updated the `client vlan 10` comment to note that all APs must map the WLAN to the same VLAN.

## Review Notes
- The 200–1000 ms WPA2 re-auth figure is directionally correct but mainly reflects WPA2-Enterprise (802.1X/EAP) with a RADIUS server; plain WPA2-PSK (no RADIUS) non-FT roams are usually already in the tens of milliseconds. The post's headline comparison (`~500ms` → `<50ms`) is accurate for the Enterprise case that benefits most from 802.11r.
- `ft_psk_generate_local '1'` is a valid OpenWrt/hostapd FT-PSK option (AP generates the FT response locally rather than requiring R0KH/R1KH key distribution).
- The `bgscan="simple:30:-70:300"` syntax is correct: `simple:<short_interval>:<signal_threshold_dBm>:<long_interval>`.
- The Cisco WLC `ft dot11r` / `ft-over-ds enable` syntax varies across AireOS vs IOS-XE (C9800) — the example is a reasonable illustration but a production deployment should consult the exact syntax for the target controller software version.
- CCX (`ccx aironetiesupport enable`) is a legacy Cisco Compatible Extensions feature; it is not required for 802.11r and is largely superseded by 802.11k/v on modern clients.
