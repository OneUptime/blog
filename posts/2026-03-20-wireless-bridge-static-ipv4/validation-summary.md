# Validation Summary: How to Set Up a Wireless Bridge with Static IPv4 Addressing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux wireless networking (cfg80211/mac80211)
- `iw` and 4-address mode (WDS) for wireless bridging
- `bridge-utils` (`brctl`)
- `hostapd` (AP-side WDS configuration)
- `wpa_supplicant` (client association)
- Netplan (systemd-networkd renderer)
- NetworkManager (`nmcli`)
- Static IPv4 addressing and routing (`ip addr`, `ip route`)

## Sources Consulted
- Netplan YAML reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- `iw` user documentation: https://wireless.wiki.kernel.org/en/users/documentation/iw
- `wpa_supplicant.conf` man page: https://linux.die.net/man/5/wpa_supplicant.conf
- hostapd upstream configuration docs (w1.fi hostapd.conf reference)
- NetworkManager settings reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- Debian bridge-utils package tracker: https://tracker.debian.org/pkg/bridge-utils

## Issues Found

1. **Netplan YAML indentation error (Step 4).** `wifis:` was incorrectly nested under `ethernets:` at the same indentation level as `eth0:`. Per the Netplan schema, `wifis`, `ethernets`, and `bridges` are all top-level device-type keys directly under `network:`. As written, the file would fail to parse / be interpreted incorrectly. Fixed by de-indenting `wifis:` to the top level alongside `ethernets:` and `bridges:`.

2. **Deprecated `gateway4` key (Step 4).** Netplan has deprecated `gateway4` in favor of the `routes:` syntax. Replaced:
   ```yaml
   gateway4: 192.168.1.1
   ```
   with:
   ```yaml
   routes:
     - to: default
       via: 192.168.1.1
   ```
   This silences the deprecation warning and is forward-compatible.

## Review Notes

- The core technique (enabling 4-address mode with `iw dev wlan0 set 4addr on`, pairing with `wds_sta=1` on the AP) is correct — standard 3-address 802.11 frames cannot carry the original source MAC needed for transparent bridging, so 4addr/WDS is genuinely required. This is a real limitation, and the post explains it accurately.
- `brctl` and `bridge-utils` still ship in Debian/Ubuntu and work, but `ip link add name br0 type bridge` + `ip link set eth0 master br0` from `iproute2` is the modern replacement. A future revision might prefer the newer syntax.
- The `nmcli` `connection.slave-type` / `connection.master` properties still work but were superseded by `connection.port-type` / `connection.controller` starting in NetworkManager 1.46. The old names remain as aliases, so the commands are still correct today.
- In the `wpa_supplicant.conf` snippet, `mode=0` is valid (it is the default "infrastructure" mode). Adding `key_mgmt=WPA-PSK` would be the more conventional form for a WPA2-PSK network, but wpa_supplicant defaults to `WPA-PSK WPA-EAP` so the snippet still works.
- NetworkManager-managed wireless bridging only works when the STA interface is itself in 4-address mode — this is consistent with the post's earlier `iw dev wlan0 set 4addr on` step, so the guidance is coherent.
