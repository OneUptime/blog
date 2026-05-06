# Validation Summary: How to Set Up Captive Portal Authentication on a WiFi Network

## Status
validated

## Post Type
Guide

## Technologies Covered
- NoDogSplash
- OpenWrt
- pfSense
- dnsmasq
- DHCP
- Captive portal networking

## Sources Consulted
- NoDogSplash installation docs: https://nodogsplash.readthedocs.io/en/latest/install.html
- NoDogSplash customization docs: https://nodogsplash.readthedocs.io/en/latest/customize.html
- NoDogSplash sample config (`resources/nodogsplash.conf`): https://github.com/nodogsplash/nodogsplash/blob/v5.0.2/resources/nodogsplash.conf
- NoDogSplash sample splash page (`resources/splash.html`): https://github.com/nodogsplash/nodogsplash/blob/v5.0.2/resources/splash.html
- OpenWrt routing feed package config for NoDogSplash: https://git.openwrt.org/feed/routing/tree/nodogsplash/files/etc/config/nodogsplash
- OpenWrt DHCP and DNS config docs: https://openwrt.org/docs/guide-user/base-system/dhcp
- OpenWrt dnsmasq docs: https://openwrt.org/docs/guide-user/base-system/dhcp.dnsmasq
- pfSense Captive Portal configuration docs: https://docs.netgate.com/pfsense/en/latest/captiveportal/configuration.html
- pfSense common Captive Portal scenarios: https://docs.netgate.com/pfsense/en/latest/captiveportal/common-scenarios.html
- OpenWrt NoDogSplash overview and caveats: https://openwrt.org/docs/guide-user/services/captive-portal/nodogsplash

## Issues Found
- The OpenWrt NoDogSplash config example used the non-OpenWrt flat config file syntax and included outdated directives such as `AuthenticateImmediately` and `ClientTimeout`. I replaced it with the documented `/etc/config/nodogsplash` UCI-style example and updated the timeout setting to `authidletimeout`, which is the current option name.
- The post implied per-client bandwidth limiting through NoDogSplash config. Current NoDogSplash docs note that traffic/quota settings are reserved for future development, so I removed that guidance from the config example and changed the takeaway to recommend separate traffic shaping such as SQM.
- The custom splash page linked to `/terms`, but the post did not define or host that page, and NoDogSplash docs warn that captive portal detection browsers often restrict normal links. I changed the line to plain text so the example remains self-contained.
- The pfSense example combined incompatible authentication modes (`Local User Manager / No Authentication`). I corrected it to the documented click-through option: `Authentication Method: None, don't authenticate users`, and updated the redirect field name to the current pfSense label.
- The DHCP example used a nonstandard OpenWrt file path and advertised `8.8.8.8` as DNS. With the default NoDogSplash/OpenWrt setup, pre-auth clients are expected to use the router's dnsmasq instance unless extra firewall exceptions are added. I replaced the snippet with a standard `/etc/config/dhcp` example that points clients at `192.168.100.1` for gateway and DNS.

## Review Notes
- The OpenWrt NoDogSplash page notes that NoDogSplash v5 has nftables compatibility issues on OpenWrt 22.03 and newer, so readers should verify behavior on their exact OpenWrt release before using it in production.
- pfSense Captive Portal is IPv4-only according to the current Netgate documentation, which is consistent with the post's `IPv4` tag.
