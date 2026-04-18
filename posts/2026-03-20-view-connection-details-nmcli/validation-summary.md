# Validation Summary: How to View Connection Details with nmcli connection show

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Linux
- NetworkManager
- nmcli (NetworkManager CLI)
- Ethernet / Bridge / Bond / VPN connection types
- `.nmconnection` INI-formatted profile files

## Sources Consulted
- `man nmcli` (local manpage, NetworkManager project)
- NetworkManager official documentation: https://networkmanager.dev/docs/api/latest/nmcli.html
- NetworkManager settings reference: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html

## Issues Found
- **Incorrect flag description for `nmcli -s connection show`**: The post claimed `-s` was for "Sort by connection name", but per `man nmcli`, `-s` / `--show-secrets` actually causes nmcli to display passwords and secrets in the output. Corrected the comment to "Show secrets (passwords) in output". nmcli does not have a sort flag for `connection show`.

## Review Notes
- All other commands (`nmcli connection show [--active]`, `nmcli connection show <name>`, `nmcli -f <fields> connection show`, `nmcli device show <iface>`, `nmcli device status`, `nmcli -g <field> connection show <name>`) are valid and work as described.
- The `.nmconnection` file path at `/etc/NetworkManager/system-connections/` is correct; user-scoped profiles may additionally live under `/run/NetworkManager/system-connections/` or `/var/lib/NetworkManager/` on some distros, but the post's focus on system-connections is accurate for typical setups.
- The `grep ipv4`/`grep ipv6` filtering approach works because full-detail output prefixes those fields with `ipv4.` / `ipv6.`.
- The `-g` (get-values) flag behavior is correctly described — it returns raw, colon-separated values suitable for scripting.
