# Validation Summary: How to Persist ip rule Entries Across Reboots on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux policy routing (`ip rule`)
- iproute2 (`ip rule`, `ip route`)
- systemd-networkd (`.network` files, `[RoutingPolicyRule]` section, `networkctl reload`)
- Debian ifupdown (`/etc/network/interfaces`)
- systemd service units (`Type=oneshot`, `RemainAfterExit`, `network-online.target`)
- NetworkManager dispatcher scripts (`/etc/NetworkManager/dispatcher.d/`)

## Sources Consulted
- `systemd.network(5)` man page — https://www.freedesktop.org/software/systemd/man/systemd.network.html (confirms `[RoutingPolicyRule]` section with `From=`, `Table=`, `Priority=` settings)
- `networkctl(1)` man page — `reload` subcommand, available since systemd 248
- `ip-rule(8)` man page (iproute2) — confirms default rule priorities (0, 32766, 32767) and the `from`/`lookup`/`priority` syntax
- `interfaces(5)` man page (ifupdown) — confirms `up`/`down` hook syntax
- `systemd.service(5)` and `systemd.unit(5)` man pages — confirms `Type=oneshot`, `RemainAfterExit=yes`, `After=network-online.target`, `WantedBy=multi-user.target` patterns
- NetworkManager documentation on dispatcher scripts — https://networkmanager.dev/docs/api/latest/NetworkManager.html (confirms `$1=interface`, `$2=action` argument convention and the `up` action name)

## Issues Found
No technical issues found.

## Review Notes
- The default `ip rule show` output is correct (priorities 0/32766/32767 for local/main/default tables).
- The systemd-networkd `[RoutingPolicyRule]` settings (`From`, `Table`, `Priority`) match the documented options. Note that `networkctl reload` was added in systemd 248 (April 2021); for older systemd versions, users would need `systemctl restart systemd-networkd`. This is not currently noted but is a reasonable assumption for modern systems.
- Method 2's `down` hook only removes the `ip rule` and not the `ip route` added in the second `up` line; routes in a non-default table associated with a downed interface are typically removed by the kernel automatically, so this is acceptable.
- Method 4's `chmod +x` line appears inside the bash code block alongside the dispatcher script content; it's intended as a setup step rather than part of the script body. The intent is clear from context but could be visually clearer in a future edit.
- NetworkManager dispatcher scripts must additionally be owned by root and not group/world-writable; this is not explicitly mentioned but is a standard shell-script safety practice.
