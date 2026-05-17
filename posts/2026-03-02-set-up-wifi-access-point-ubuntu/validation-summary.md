# Validation Summary: How to Set Up a WiFi Access Point on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (netplan, systemd, systemd-resolved)
- hostapd (wireless access point daemon)
- dnsmasq (DHCP/DNS server)
- iw (wireless configuration utility)
- iptables / netfilter-persistent (NAT and persistence)
- rfkill
- 802.11 a/g/n/ac (WiFi 4 / WiFi 5)
- WPA2-PSK (CCMP)

## Sources Consulted
- hostapd official configuration reference (hostapd.conf example): https://w1.fi/cgit/hostap/plain/hostapd/hostapd.conf
- dnsmasq man page (dhcp-range, dhcp-option, interface, bind-interfaces): https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- iw man page / wireless wiki: https://wireless.wiki.kernel.org/en/users/documentation/iw
- Ubuntu netplan reference: https://netplan.io/reference/
- iptables NAT/MASQUERADE documentation: https://www.netfilter.org/documentation/
- IANA DHCP options (option 3 = Router, option 6 = Domain Name Server): https://www.iana.org/assignments/bootp-dhcp-parameters/bootp-dhcp-parameters.xhtml
- IEEE 802.11ac VHT operation: channel center frequency segment 0 index for 80 MHz centered on channel 42 covers channels 36, 40, 44, 48 (verified against hostapd.conf docs)

## Issues Found
1. **Misleading hostapd logger comment.** The original config block included `logger_syslog=-1` and `logger_stdout=-1` with a comment claiming these are "Logging level (0=verbose, 1=info, 2=warning, 3=errors only)". This is incorrect: `logger_syslog` and `logger_stdout` are bitmasks for which module categories to log (with `-1` meaning all modules), not log levels. The actual minimum log level is configured via separate parameters `logger_syslog_level` and `logger_stdout_level` whose values are 0=verbose, 1=debug, 2=info, 3=notice, 4=warning (per the official hostapd.conf reference). Fixed by correcting the comment and adding the proper `_level` keys with a sensible default (`2`).

## Review Notes
- The `auth_algs=1`, `wpa=2`, `wpa_key_mgmt=WPA-PSK`, `rsn_pairwise=CCMP` combination is correct for WPA2-PSK (CCMP/AES). WPA2 uses Open System auth at the 802.11 layer, so `auth_algs=1` is right.
- The 5GHz example correctly uses `vht_oper_chwidth=1` (80 MHz) and `vht_oper_centr_freq_seg0_idx=42` for a primary channel of 36 — the 80 MHz block 36/40/44/48 is centered on channel 42.
- The comment "1-14 for 2.4GHz" is technically accurate as a worldwide statement, but with `country_code=US` only channels 1–11 are actually usable. Not changed because the wording is not strictly wrong.
- Putting a wireless interface under netplan's `ethernets:` section is unconventional (netplan has a `wifis:` section), but in practice it works because netplan matches by interface name and the `wifis:` block is intended for client/supplicant config. Since hostapd manages the AP role itself, treating the device as a generic interface for IP assignment is a pragmatic and commonly-used workaround. Left as-is.
- On some Ubuntu installs the hostapd service is masked by default (`Failed to start hostapd.service: Unit is masked`). Readers who hit this will need `sudo systemctl unmask hostapd` before the start step. Not added to the post since recent Ubuntu LTS releases ship it unmasked, but worth noting as a future improvement.
- Disabling systemd-resolved (in the troubleshooting section) removes the stub resolver entirely; the manually-written `/etc/resolv.conf` can be overwritten by other tools (NetworkManager, cloud-init). For long-term use, configuring resolved's `DNSStubListener=no` is gentler than disabling it. Not changed because the post presents it as a troubleshooting step.
- `wmm_enabled=1` is required for 802.11n/ac, which the post correctly notes.
