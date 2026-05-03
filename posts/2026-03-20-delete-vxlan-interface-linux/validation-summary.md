# Validation Summary: How to Delete a VXLAN Interface on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- VXLAN (Virtual Extensible LAN)
- Linux networking (iproute2: `ip link`, `bridge`)
- systemd-networkd (`networkctl`, `.netdev`, `.network`)
- Debian ifupdown (`/etc/network/interfaces`, `ifdown`)
- NetworkManager (`nmcli`)
- Linux bridge / FDB

## Sources Consulted
- `ip-link(8)` man page — iproute2 (delete, set nomaster, show type, -d)
- `bridge(8)` man page — iproute2 (notes that `bridge link show` lists all ports and points users to `ip link show master <bridge>` for filtering by bridge)
- `networkctl(1)` man page — systemd (documents `reload` subcommand, added in v244)
- `nmcli(1)` man page — NetworkManager (`connection delete`)
- Linux kernel networking source — route flush on `NETDEV_UNREGISTER` (`fib_netdev_event`) and FDB flush on VXLAN device destroy (`vxlan_fdb_flush`)
- `systemd.netdev(5)` — VXLAN netdev semantics

## Issues Found

1. **Incorrect verification command — `bridge link show br-vxlan`** (used in two places: under "Detaching from Bridge Before Deletion" and under "Verifying Complete Cleanup").

   The `bridge link show DEV` form treats `DEV` as a bridge *port*, not as a bridge. A bridge device has no master, so `bridge link show br-vxlan` produces no useful output and does not verify which interfaces are enslaved to `br-vxlan`. The `bridge(8)` man page explicitly directs users to `ip link show master <bridge_device>` for this purpose. There is no `master` filter accepted by `bridge link show`.

   **Fix:** Replaced both occurrences with `ip link show master br-vxlan`, which correctly lists interfaces whose master is `br-vxlan`.

## Review Notes
- All other commands verified correct: `ip link del`, `ip link set ... nomaster`, `ip link set ... down`, `ip -d link show type vxlan`, `networkctl reload`, `nmcli connection delete`, `bridge fdb show`, `ip route show`.
- The claim "routes associated with it are removed by the kernel" upon `ip link del` is accurate — the kernel flushes routes whose output interface was the deleted device via the `NETDEV_UNREGISTER` notifier path.
- FDB entries for the destroyed VXLAN interface are also flushed automatically by the kernel (`vxlan_fdb_flush` in `vxlan_uninit`), so `bridge fdb show | grep vxlan10` after deletion is expected to return nothing.
- The batch-deletion awk pipeline is correct: only the `INDEX: name:` summary line of `ip -d link show` starts with a digit, so `grep "^[0-9]"` filters out the indented detail lines, and `awk '{print $2}' | tr -d ':'` cleanly extracts the device name. (VXLAN devices do not use the `name@parent` notation that VLAN subinterfaces do, so no `@` stripping is needed.)
- Caveat worth noting (not corrected, since the post still works as written): `networkctl reload` will pick up new and modified `.network`/`.netdev` files but it does **not** remove an existing netdev whose `.netdev` file has been deleted. The post handles this correctly by relying on the explicit `ip link del vxlan10` shown earlier in the article.
- `networkctl reload` requires systemd v244 or newer (released Nov 2019); on older systems users would need `systemctl restart systemd-networkd`. Fine to leave as-is given how widely v244+ is now deployed.
