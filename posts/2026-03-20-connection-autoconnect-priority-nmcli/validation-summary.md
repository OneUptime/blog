# Validation Summary: How to Set Connection Autoconnect Priority with nmcli

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NetworkManager (nmcli 1.46.0 verified)
- nmcli connection management
- Linux/RHEL networking
- Bonds/Teams/Bridges (master/slave connection model)

## Sources Consulted
- `man nm-settings-nmcli` (NetworkManager 1.46.0)
- `nmcli -f help connection show` for valid listing field names
- NetworkManager upstream docs: https://networkmanager.dev/docs/api/latest/nm-settings-nmcli.html
- nmcli man page for `connection show` field semantics

## Issues Found

1. **`connection.autoconnect-retries` semantics were inverted.**
   - Original comment: `# 5 attempts, then give up (-1 = unlimited)`
   - Per `man nm-settings-nmcli`: "Zero means forever, -1 means the global default (4 times if not overridden)."
   - Fixed comment to: `# 5 attempts, then give up (0 = forever, -1 = global default)`

2. **`connection.autoconnect-slaves` section was technically incorrect.**
   - The section title "Boot Ordering: Requiring Another Connection First" misrepresents the property. `autoconnect-slaves` does not impose ordering between unrelated connections; it only controls whether slave/port connections are auto-activated when their master (bond/team/bridge) activates.
   - The example `nmcli connection modify vpn-tunnel connection.autoconnect-slaves -1` is meaningless: VPN tunnels are not master connections, and `-1` means "use the global default", not "require all slaves to connect first".
   - Fixed by retitling the section to "Auto-Activating Slaves of Master Connections", removing the misleading vpn-tunnel example, and replacing it with a correct second example for a bridge with `0` (don't auto-activate). Updated the inline value legend on the bond0 line to reflect the actual permitted values: `1 = activate slaves, 0 = leave untouched, -1 = global default`.

3. **Last command in "Viewing What Connected and Why" used invalid field names for the listing form.**
   - Original: `nmcli -f NAME,DEVICE,GENERAL.STATE,connection.autoconnect-priority connection show --active`
   - `GENERAL.STATE` and `connection.autoconnect-priority` are detail-view fields (used with `nmcli connection show <ID>`), not listing fields. Confirmed with `nmcli`: allowed listing fields are `NAME,UUID,TYPE,TIMESTAMP,TIMESTAMP-REAL,AUTOCONNECT,AUTOCONNECT-PRIORITY,READONLY,DBUS-PATH,ACTIVE,DEVICE,STATE,ACTIVE-PATH,SLAVE,FILENAME`.
   - Fixed to: `nmcli -f NAME,DEVICE,STATE,AUTOCONNECT-PRIORITY connection show --active`

## Review Notes
- Autoconnect-priority range (`-999` to `999`), default of `0`, and the "higher = preferred" semantics are correct per NetworkManager docs.
- In NetworkManager 1.46+, `connection.autoconnect-slaves` has been renamed to `connection.autoconnect-ports` (with the same semantics). The legacy `autoconnect-slaves` form still works as an alias, so the post's usage remains valid; future revisions might prefer the `-ports` form for clarity.
- The example output table for `nmcli -f NAME,DEVICE,AUTOCONNECT,AUTOCONNECT-PRIORITY connection show` is plausible but column widths/dashes will vary by environment; this is illustrative and acceptable.
- `connection.autoconnect-retries` default global value (4) is mentioned in the man page; the post does not need to repeat it.
