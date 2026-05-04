# Validation Summary: How to Create a New Connection Profile with nmcli

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nmcli (NetworkManager CLI, version 1.46.0 verified)
- NetworkManager
- Linux networking (Ethernet, WiFi, DHCP, static IP, DNS)
- WPA-PSK WiFi authentication

## Sources Consulted
- Local `nmcli connection add help` output (NetworkManager 1.46.0)
- Local `nmcli connection clone help` output
- Local `nmcli connection show help` output
- NetworkManager nmcli reference: https://networkmanager.dev/docs/api/latest/nmcli.html
- nm-settings man page: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html

## Issues Found
No technical issues found.

All commands and property syntax were verified against the local `nmcli` 1.46.0 help output:

- `nmcli connection add type ethernet con-name <name> ifname <iface>` — valid COMMON_OPTIONS form.
- Property-based settings on the same line (`ipv4.method manual`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`, `connection.autoconnect yes`, `wifi-sec.key-mgmt wpa-psk`, `wifi-sec.psk`) are valid; `nmcli connection add` accepts `<setting>.<property> <value>` pairs directly without requiring the `--` separator shown in the synopsis.
- `type wifi ssid <SSID>` matches the documented WiFi TYPE_SPECIFIC_OPTIONS.
- `nmcli connection show [--active]`, `nmcli connection up/down/delete`, and `nmcli connection clone <ID> <new name>` all match the documented usage.
- DNS values as a single space-separated string (`"8.8.8.8 1.1.1.1"`) is the correct format for the `ipv4.dns` property.

## Review Notes
- The post's description mentions "VLAN, bond, bridge, and other connection types" but the body only demonstrates Ethernet and WiFi. This is a content-scope mismatch rather than a technical inaccuracy, so it was left unchanged per the "only fix technical errors" rule.
- For WPA3 networks, `wifi-sec.key-mgmt sae` would be required instead of `wpa-psk`; the post's WPA-PSK example remains accurate for WPA2-PSK networks, which is what is implied.
- `ipv4.method auto` in the auto-connect example is the default when no IP method is specified, but stating it explicitly is harmless and arguably clearer.
