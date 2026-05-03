# Validation Summary: How to Delete a Connection Profile with nmcli

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- nmcli (NetworkManager command-line interface)
- NetworkManager
- Linux (RHEL/CentOS/Fedora)
- Bash shell scripting (awk, xargs, while loops)
- NetworkManager keyfile format (`.nmconnection` files)
- Legacy ifcfg format

## Sources Consulted
- nmcli man page (https://man.archlinux.org/man/nmcli.1)
- NetworkManager keyfile reference (https://networkmanager.dev/docs/api/latest/nm-settings-keyfile.html)
- Red Hat documentation on NetworkManager connection profiles

## Issues Found
No technical issues found. Verified items:
- `nmcli connection show` lists all in-memory and on-disk connection profiles — correct.
- `nmcli connection show --active` filters to active connections — correct flag.
- `nmcli connection delete <id|uuid>` accepts both name and UUID — correct.
- `nmcli connection down <name>` deactivates without preventing auto-activation — correct.
- `nmcli connection reload` re-reads connection profile files from disk — correct.
- Deleting an active connection disconnects it automatically — correct behavior.
- `/etc/NetworkManager/system-connections/` is the canonical keyfile location — correct.
- `.nmconnection` is the correct extension for keyfile-format profiles — correct.
- Legacy ifcfg files at `/etc/sysconfig/network-scripts/ifcfg-*` — correct for older RHEL/CentOS.
- `nmcli connection add type ethernet …` syntax with `ipv4.method`, `ipv4.addresses`, `ipv4.gateway` properties — correct.

## Review Notes
- The note "keyfile format, NM >= 1.20" is loose but not wrong: keyfile has been supported by NetworkManager since well before 1.20, and became the default for new connections on Fedora ~33+ (NM 1.30+) and RHEL 9 (NM 1.36+). The post does not claim 1.20 was the cutover for default, only that the format applies on modern RHEL/CentOS — acceptable.
- The batch-deletion shell snippets using `nmcli connection show | grep ... | awk '{print $1}'` work for simple cases but can break on connection names containing whitespace or matching tokens like "ethernet" or "vpn" inside the NAME column. A more robust approach is `nmcli -t -f NAME,TYPE connection show | awk -F: '$2=="802-3-ethernet"{print $1}'` (using terse output mode). Not a correctness bug for typical environments — left as-is per scope.
- `nmcli connection show <name>` dumps all connection settings, which can include sensitive data (PSKs, VPN credentials) when redirected to a backup file. This is a security consideration rather than a technical inaccuracy and was not flagged in scope.
- The Key Takeaways correctly note `nmcli device disconnect <iface>` as a follow-up to ensure interface deactivation — accurate.
