# Validation Summary: How to Configure a Wi-Fi Connection with nmcli

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- nmcli (NetworkManager command-line tool)
- NetworkManager
- Wi-Fi (WPA2/WPA3 Personal)
- WPA2 Enterprise (802.1X / EAP-PEAP / MSCHAPv2)
- IPv4 static address configuration
- Linux network stack

## Sources Consulted
- nmcli man page (https://networkmanager.dev/docs/api/latest/nmcli.html)
- `nmcli device wifi help` and `nmcli connection add` help output (verified locally against nmcli 1.46.0)
- nm-settings-keyfile(5) man page — secret storage behavior
- nm-settings-nmcli(5) — property names (`wifi.hidden`, `wifi-sec.key-mgmt`, `wifi-sec.psk`, `802-1x.*`, `ipv4.*`)
- NetworkManager Reference Manual (https://networkmanager.dev/docs/api/latest/settings-spec.html)

## Issues Found
- **Incorrect claim about credential encryption.** The original "Key Takeaways" stated that Wi-Fi credentials are *stored encrypted* under `/etc/NetworkManager/system-connections/`. Per `nm-settings-keyfile(5)`, secrets in keyfile-format system connections are written in **plaintext** by default; protection is provided by `0600` file permissions (root-owned), not by encryption. Updated the bullet to accurately describe the storage and protection mechanism.

## Review Notes
- All `nmcli` commands, property names (`wifi-sec.key-mgmt`, `wifi-sec.psk`, `wifi.hidden`, `802-1x.eap`, `802-1x.phase2-auth`, `802-1x.identity`, `802-1x.password`, `802-1x.ca-cert`, `ipv4.method`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`), and subcommand syntax were verified against nmcli 1.46.0 and current NetworkManager documentation.
- The example output of `nmcli device wifi list` is representative — column order and header names match current nmcli output (IN-USE, BSSID, SSID, MODE, CHAN, RATE, SIGNAL, BARS, SECURITY); the post omits the BARS column, which is acceptable as illustrative output.
- `nmcli device wifi` with no arguments correctly defaults to `list`, so the example under "Managing Wi-Fi Connections" works; the inline comment ("Show signal strength and current AP") is slightly loose phrasing — it lists all visible APs with signal columns rather than only the current AP — but is not technically wrong, so left unchanged per the "fix only what is wrong" guideline.
- For WPA3-Personal (SAE), `wpa-psk` works because NetworkManager negotiates SAE automatically when the AP supports it; an explicit `wifi-sec.key-mgmt sae` may be needed for SAE-only networks. Not an error in the post but worth noting for future revisions.
