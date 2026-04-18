# Validation Summary: How to View Bridge FDB (Forwarding Database) Entries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux bridge (iproute2 `bridge` command)
- `ip link` command (iproute2)
- Linux network bridge FDB (Forwarding Database)
- sysfs bridge attributes (`/sys/class/net/*/bridge/`)

## Sources Consulted
- iproute2 `bridge(8)` man page: https://man7.org/linux/man-pages/man8/bridge.8.html
- iproute2 `ip-link(8)` man page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux kernel bridge source (`net/bridge/br_sysfs_br.c`, `net/bridge/br_netlink.c`) for sysfs/netlink flush attribute semantics
- iproute2 source (`ip/iplink_bridge.c`, `bridge/fdb.c`) for command keyword validation

## Issues Found

1. **Invalid `ip link set ... flush_fdb 1` command.** The original post used `ip link set br0 type bridge flush_fdb 1` to flush the FDB. This is incorrect for several reasons:
   - The iproute2 keyword is `fdb_flush`, not `flush_fdb`.
   - `fdb_flush` is a `bridge_slave` (port) option, not a bridge-level option — it is applied on the slave interface (e.g. `ip link set eth0 type bridge_slave fdb_flush`), not on the bridge itself.
   - It is a boolean trigger attribute and does not take a `1` argument.

   **Fix applied:** Replaced the invalid line with the well-known sysfs flush alternative (`echo 1 > /sys/class/net/br0/bridge/flush`) which is backed by the kernel's `flush` sysfs attribute in `net/bridge/br_sysfs_br.c`. The `bridge fdb flush dev br0` variant (previously the second example) was promoted to the primary example.

## Review Notes

- `bridge fdb show dev eth0` works because iproute2's `fdb_show` treats `dev` as an alias for `brport`, so the command is accepted even though the official man page documents only `brport`.
- `permanent` is accepted by `bridge fdb add` as a synonym for `local`/`NUD_PERMANENT` in iproute2's command parser, even though the man page primarily documents `local`, `static`, and `dynamic`.
- The `ageing_time` comment says the value is in "seconds", which matches the `ip-link(8)` man page. The kernel's internal sysfs representation is in USER_HZ ticks (centiseconds), but since the post uses the `ip link` command and the command's documented unit is seconds, the post's usage is consistent with the official iproute2 documentation and was left unchanged.
- The sample FDB output line with both `master br0 self` on the same entry is atypical (most entries show either `master BRIDGE` or `self`), but it is a plausible illustrative example and not technically wrong, so it was left alone.
