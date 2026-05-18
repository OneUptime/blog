# Validation Summary: How to Turn Ubuntu into a WiFi Access Point with hostapd

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- hostapd (IEEE 802.11 AP daemon)
- dnsmasq (DHCP / DNS server)
- iptables (NAT / MASQUERADE / FORWARD)
- iptables-persistent / netfilter-persistent
- NetworkManager (unmanaged-devices configuration)
- netplan (Ubuntu network configuration)
- systemd / systemctl service management
- iw (wireless configuration CLI)
- Linux IP forwarding (sysctl net.ipv4.ip_forward)
- WPA2-PSK (CCMP/RSN)

## Sources Consulted
- hostapd upstream documentation and example hostapd.conf: https://w1.fi/cgit/hostap/plain/hostapd/hostapd.conf
- dnsmasq man page: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- Ubuntu hostapd package documentation (notes that the unit ships masked)
- netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- NetworkManager.conf manual (keyfile [keyfile] unmanaged-devices syntax): https://man.archlinux.org/man/NetworkManager.conf.5
- iw(8) and iproute2 (ip(8)) manuals
- iptables(8) / iptables-extensions(8) man pages
- Ubuntu wiki on WifiDocs / WirelessAccessPoint

## Issues Found
No technical issues found. All commands, package names, config-file paths, configuration keys, and explanations match official documentation:

- `hostapd` keys verified: `interface`, `driver=nl80211`, `ssid`, `country_code`, `hw_mode=g`, `channel`, `ieee80211n`, `ht_capab` (`[HT40+][SHORT-GI-40][DSSS_CCK-40]` are valid capability strings), `max_num_sta`, `wpa=2`, `wpa_key_mgmt=WPA-PSK`, `wpa_passphrase`, `rsn_pairwise=CCMP`, `wpa_group_rekey`, logger options.
- `dnsmasq` keys verified: `interface`, `domain-needed`, `bogus-priv`, `dhcp-range`, `dhcp-option=3` (router) and `dhcp-option=6` (DNS), `log-dhcp`, `domain`, `dhcp-authoritative`.
- `sudo systemctl unmask hostapd` is correctly required on Ubuntu — the hostapd unit ships masked.
- iptables MASQUERADE + FORWARD ESTABLISHED,RELATED ruleset is the canonical NAT setup.
- `iptables-persistent` is the correct Debian/Ubuntu package and `netfilter-persistent save` is the correct save command.
- NetworkManager `[keyfile] unmanaged-devices=interface-name:wlan0` and `mac:<addr>` formats are both valid syntax.

## Review Notes
- `wpa_pairwise=TKIP CCMP` is included alongside `wpa=2`. Because `wpa=2` selects WPA2/RSN only, `wpa_pairwise` (which applies to WPA v1) is silently ignored and only `rsn_pairwise=CCMP` takes effect — so this is harmless, but TKIP is deprecated by the Wi-Fi Alliance and a future revision could simply drop the `wpa_pairwise` line to avoid confusion.
- `ht_capab=[HT40+]` with `channel=6` makes the secondary HT channel be channel 10, which overlaps channel 11 — fine technically but somewhat at odds with the post's own "use 1, 6, or 11" advice. Acceptable as written; readers in dense RF environments may prefer to drop `[HT40+]` or move to 5 GHz.
- `domain=ap.local` uses the `.local` TLD which is reserved for mDNS (RFC 6762). It can co-exist with Avahi in practice but using a non-mDNS domain like `ap.lan` would be cleaner. Common in tutorials and not a functional defect.
- The netplan snippet declares `wlan0` under `wifis:` with only an address and no `access-points`. With networkd as the renderer this still applies the static address; with the NetworkManager renderer the interface should be marked unmanaged (which the post covers in the preceding section), so the two work together. Manually assigning the IP in the start-ap.sh script (as the post also does) is the more robust path and the post correctly shows both.
- `sudo systemctl stop NetworkManager` (rather than just marking wlan0 unmanaged) drops all NM-managed connections; readers relying on NM for `eth0` should prefer the `unmanaged-devices` approach the post documents immediately after.
