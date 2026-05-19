# Validation Summary: How to Set Up 802.11ac (5GHz) Access Point on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- hostapd (user-space AP daemon)
- 802.11ac (Wi-Fi 5) / VHT
- 802.11n (HT) capabilities
- 5GHz WLAN (UNII-1, UNII-2, UNII-2E, UNII-3)
- DFS (Dynamic Frequency Selection)
- iw / nl80211
- WPA2/WPA3 (SAE) security, PMF (ieee80211w)
- iperf3
- systemd / journalctl

## Sources Consulted
- hostapd reference config (hostapd.conf in upstream w1.fi/hostap repo) for `vht_capab`, `ht_capab`, `vht_oper_chwidth`, `vht_oper_centr_freq_seg0_idx`, `ieee80211ac`, `ieee80211h`, `ieee80211d`, `wpa_key_mgmt`, `ieee80211w`, `multicast_to_unicast`.
- iw(8) man page / iw source for `iw list`, `iw phy <name> info`, `iw phy <name> channels`, `iw reg get`, `iw dev <iface> interface add ... type __ap`, `iw dev <iface> station dump`.
- IEEE 802.11ac-2013 / FCC UNII rules for 5GHz channel allocations, DFS channel ranges, and TX power limits.
- ETSI EN 301 893 / FCC §15.407 for DFS CAC and non-occupancy period (typically 30 min after radar detection; CAC 60 s for non-weather-radar channels).
- 802.11ac VHT modulation tables for MCS 9 / 80MHz / 2 SS / SGI → 866.7 Mbps PHY rate (matches the "867 Mbps" example).

## Issues Found
No technical issues found.

Key items spot-checked and confirmed correct:
- `hw_mode=a` is the correct setting for 5GHz operation.
- `vht_oper_chwidth` values (0=20/40, 1=80, 2=160, 3=80+80) are accurate.
- 80MHz center-frequency-segment indexes for each channel group (42, 58, 106, 122, 138, 155) and 160MHz center (50 for channels 36–64) are correct.
- All vht_capab flags used (`[MAX-MPDU-11454]`, `[RXLDPC]`, `[SHORT-GI-80]`, `[SHORT-GI-160]`, `[TX-STBC-2BY1]`, `[RX-STBC-1]`, `[MAX-A-MPDU-LEN-EXP7]`, `[SU-BEAMFORMEE]`, `[VHT160]`) are valid hostapd tokens.
- All ht_capab flags used (`[HT40+]`, `[SHORT-GI-20]`, `[SHORT-GI-40]`, `[DSSS_CCK-40]`) are valid hostapd tokens.
- `wpa_key_mgmt=WPA-PSK SAE` with `ieee80211w=1` is the standard WPA2/WPA3 transition-mode configuration.
- `iw phy <name> channels` is a real iw subcommand.
- `sudo hostapd /path/conf1 /path/conf2` is the supported way to start hostapd with multiple BSS/radio configs.
- 802.11ac VHT-MCS 9, 80MHz, 2 spatial streams, short GI ≈ 867 Mbps is correct.

## Review Notes
- `[DSSS_CCK-40]` in the ht_capab line is a 2.4GHz-only capability indicator (DSSS/CCK rate support in 40MHz). It is harmless on a 5GHz AP (hostapd accepts and largely ignores it on 5GHz), but it is not meaningful here. Not worth changing — it is a common practice in widely shared example configs.
- CAC duration on DFS channels is generally 60 seconds, but channels overlapping weather-radar bands (typically 120–128 in the US/EU regulatory domain) require an extended 10-minute CAC. The post states "60 seconds" as a generic figure, which is accurate for the common case but worth knowing if users hit weather-radar channels.
- The sample VHT capability list also surfaces "MU Beamformee" from `iw` output. hostapd does have a `[MU-BEAMFORMEE]` token; the mapping table in the post intentionally omits it (likely because MU-MIMO beamformee on the AP side is unusual), which is fine — omitting it just leaves that capability disabled.
- `ieee80211w=1` (optional PMF) is correct for WPA2/WPA3 transition mode; users running SAE-only should set `ieee80211w=2`.
- 160MHz operation on channels 36–64 will trigger DFS because the band covers UNII-2 (52–64). The post correctly calls this out.
- The post does not cover masking the default `wpa_supplicant`/`NetworkManager` management of `wlan0`, which is often required in practice; this is a content gap rather than a technical error.
