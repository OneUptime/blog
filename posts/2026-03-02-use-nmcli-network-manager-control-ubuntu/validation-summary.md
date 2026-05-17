# Validation Summary: How to Use nmcli for Network Manager Control on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nmcli (NetworkManager command-line client)
- NetworkManager
- Ubuntu networking (WiFi, Ethernet, VPN)
- OpenVPN connection profiles
- WireGuard connection profiles
- Bash scripting for network checks

## Sources Consulted
- nmcli(1) man page (NetworkManager 1.46.0 on local system)
- nm-settings-nmcli(5) (referenced from nmcli(1))
- NetworkManager upstream documentation: https://networkmanager.dev/docs/api/latest/nmcli.html
- Live verification by running nmcli commands on a system with NetworkManager 1.46.0

## Issues Found

1. **Broken `nmcli -v` "verbose" example.** The post used `nmcli -v device wifi connect ...` claiming `-v` is verbose. In nmcli, `-v` is `--version` — running it simply prints the version string and ignores the rest of the command line (verified locally). Replaced with the proper approach: tailing `journalctl -u NetworkManager -f` in a separate terminal during the connection attempt.

2. **Broken `STATE = "connected"` script comparison.** The script did `STATE=$(nmcli -t -f GENERAL.STATE device show wlan0 | cut -d: -f2)` then `if [ "$STATE" = "connected" ]`. The actual output of that command is `100 (connected)` (numeric code plus parenthesised label, verified locally), so `$STATE` would be `100 (connected)` and the equality check would always fail. Fixed by changing the test to `echo "$STATE" | grep -q "(connected)"` and updating the comment to explain the output format.

3. **Misleading comment "List available VPN types" on `nmcli connection add help`.** That command actually lists all supported connection types (ethernet, wifi, bond, bridge, wireguard, vpn, etc.), not only VPNs. Updated the comment to reflect what the command really does.

## Review Notes
- All other commands check out against the nmcli(1) man page and live testing: `nmcli networking connectivity` states (none/portal/limited/full/unknown), `nmcli radio {all|wifi|wwan} [on|off]`, `nmcli device wifi connect ... hidden yes`, `wifi-sec.key-mgmt wpa-psk` / `wifi-sec.psk`, `ipv4.method manual|auto`, `ipv4.addresses` / `ipv4.gateway` / `ipv4.dns`, `connection.autoconnect` / `connection.autoconnect-priority`, `+ipv4.dns` append syntax, `nmcli connection import type openvpn file <path>`, `nmcli connection add type wireguard ifname wg0 con-name ...`, `-t`, `-f`, `-g`, `-w`, `-p` options, and `nmcli general logging level ... domains ...`.
- The connection-profile path `/etc/NetworkManager/system-connections/` is correct for system-wide profiles on Ubuntu.
- `nmcli -g GENERAL.CONNECTION device show wlan0` returns the active connection name, which for WiFi is typically (but not strictly guaranteed to be) the SSID — the comment is a reasonable simplification.
- The minimal `wireguard` profile created in the example is only a skeleton; users still need to add peer/key configuration before it will actually connect. The post does not claim otherwise, so this was left as-is.
