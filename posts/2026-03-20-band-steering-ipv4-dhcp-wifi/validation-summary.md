# Validation Summary: How to Configure Band Steering with Proper IPv4 DHCP for 2.4GHz and 5GHz

## Status
validated

## Post Type
Guide

## Technologies Covered
- Wi-Fi band steering
- Ubiquiti UniFi
- OpenWrt
- dnsmasq
- DHCP for IPv4
- 802.11k
- 802.11v

## Sources Consulted
- Ubiquiti Help Center, UniFi WiFi SSID and AP Settings Overview: https://help.ui.com/hc/en-us/articles/32065480092951-UniFi-WiFi-SSID-and-AP-Settings-Overview
- Ubiquiti Help Center, Understanding and Implementing Minimum RSSI: https://help.ui.com/hc/en-us/articles/221321728-Understanding-and-Implementing-Minimum-RSSI
- OpenWrt Wiki, Wi-Fi `/etc/config/wireless`: https://openwrt.org/docs/guide-user/network/wifi/basic
- OpenWrt Wiki, Setting up `usteer` and band-steering: https://openwrt.org/docs/guide-user/network/wifi/usteer
- OpenWrt Wiki, Wireless Utilities: https://openwrt.org/docs/guide-user/network/wifi/wireless-tool/wireless.utilities
- OpenWrt Wiki, FAQ after Installation of OpenWrt: https://openwrt.org/docs/guide-user/installation/after.installation
- dnsmasq man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html

## Issues Found
- The UniFi navigation and setting names were outdated. I updated the path to `Settings → WiFi → MyNetwork`, changed the band-steering setting to `Enabled`, and separated Minimum RSSI into the per-AP settings path because current UniFi documentation treats it as an AP-level setting.
- The post described Minimum RSSI as moving weak 5GHz clients to 2.4GHz. I corrected this to reflect UniFi's documented behavior: Minimum RSSI disconnects low-signal clients, and the client then chooses what to join next.
- The OpenWrt example presented `ieee80211r` as part of band steering. I replaced that with `ieee80211k` and clarified that OpenWrt band steering is typically implemented with `usteer` or `DAWN`, while `bss_transition` and `ieee80211k` are the relevant 802.11v/k building blocks.
- The dnsmasq VLAN example used `tag:` on `dhcp-range`, which does not set a tag for later `dhcp-option` matching. I changed those lines to `set:vlan20` and `set:vlan50`, which matches dnsmasq's documented tagging behavior.
- The single-SSID DHCP explanation overstated the relationship between SSID and DHCP scope. I corrected it to specify that a shared pool applies when both bands are bridged to the same LAN/VLAN.
- The final takeaway overstated AP control over roaming. I revised it so the post accurately states that band steering can encourage compatible clients, but clients ultimately decide whether to roam.

## Review Notes
- The OpenWrt snippets remain partial configuration examples rather than complete `wifi-iface` sections. That is acceptable for a focused guide, but full production configs would also need the surrounding interface settings already in place.
- UniFi UI labels can change across Network Application releases; the corrected wording matches current official documentation as of May 6, 2026.
