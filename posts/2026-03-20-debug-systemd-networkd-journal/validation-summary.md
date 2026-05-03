# Validation Summary: How to Debug systemd-networkd with Journal Logs

## Status
validated

## Post Type
Tutorial / how-to guide

## Technologies Covered
- systemd-networkd
- journalctl / systemd journal
- networkctl
- systemd unit drop-ins (override.conf)
- DHCP, MTU, link-layer concepts

## Sources Consulted
- `networkctl(1)` man page (local) and upstream documentation: https://www.freedesktop.org/software/systemd/man/latest/networkctl.html
- `journalctl(1)` man page (local) and upstream: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- `systemd.network(5)` man page (for `MTUBytes=` and `[Match]` semantics): https://www.freedesktop.org/software/systemd/man/latest/systemd.network.html
- Live `networkctl --help` output on a current systemd installation

## Issues Found

1. **Non-existent `networkctl verify` command.** The post recommended `networkctl verify` to validate `.network`/`.netdev` files. networkctl has no `verify` subcommand — its commands are `list, status, lldp, label, delete, up, down, renew, forcerenew, reconfigure, reload, edit, cat`. Replaced the "Validating Configuration Files" section with the actual workflow: `networkctl reload` followed by inspecting the journal for parse errors, and using `networkctl cat` / `networkctl status` to inspect the effective configuration. Also removed the `networkctl verify` reference from the "Common Error Messages" section and from the Key Takeaways.

2. **Misattributed error cause.** "Failed to open configuration file" was attributed to a syntax error, but that message comes from systemd failing to read the file (permissions, missing path). Syntax errors produce "Failed to parse" / "Invalid section header"-style messages. Split this into two distinct entries with correct causes and fixes.

3. **Broken `journalctl` filter combination.** The original `journalctl -k -u systemd-networkd -b | grep …` does not return what the author intended. Per `journalctl(1)`, `-k` adds a `_TRANSPORT=kernel` match and `-u` adds `_SYSTEMD_UNIT=…` — matches on different fields are combined with logical AND, so the result is effectively empty (kernel messages are not tagged with a systemd unit). Replaced with the correct OR-style query using the `+` separator: `journalctl -b _TRANSPORT=kernel + _SYSTEMD_UNIT=systemd-networkd.service`, with a comment explaining why.

4. **Inaccurate `degraded` description.** The post said `degraded` means "interface is up but missing some configuration (e.g., no default route)". Per the `networkctl(1)` man page, the operational state `degraded` specifically means the link has carrier and a link-local address but no routable address. Tightened both the inline comment and the corresponding Key Takeaway to match the documented definition.

## Review Notes
- The `SYSTEMD_LOG_LEVEL=debug` mechanism, the `/usr/lib/systemd/systemd-networkd` binary path, the drop-in directory pattern, and `MTUBytes=` are all correct against current systemd documentation.
- `networkctl reload` and `networkctl reconfigure` are correct and documented as added in systemd v244 — fine for any contemporary distribution but worth noting if a reader is on an older system.
- The Method 1 debug invocation (`SYSTEMD_LOG_LEVEL=debug /usr/lib/systemd/systemd-networkd`) requires the daemon to not already be running and is rarely the right approach in practice; the systemd override (Method 2) is the standard path. Not technically wrong, just a stylistic note.
