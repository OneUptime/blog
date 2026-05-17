# Validation Summary: How to Use the ip Command Instead of ifconfig on Ubuntu

## Status
validated

## Post Type
Reference / Tutorial — a mapping guide between `ifconfig` and `ip` commands with examples.

## Technologies Covered
- iproute2 (`ip` command suite)
- net-tools (`ifconfig`, `route`, `arp`)
- Ubuntu Linux (18.04+)
- VLAN, bridge, dummy virtual interfaces
- jq for JSON parsing
- IPv4 / IPv6 addressing and routing
- ARP / NDP neighbor table

## Sources Consulted
- iproute2 source / man pages: `man ip`, `man ip-link`, `man ip-address`, `man ip-route`, `man ip-neighbour`
- iproute2 release notes (https://wiki.linuxfoundation.org/networking/iproute2)
- Ubuntu Server documentation on networking (https://ubuntu.com/server/docs/network-configuration)
- Local verification against iproute2-6.1.0 (`ip -V`, `ip -j addr show`, `ip -br addr show`, `ip route get`, `ip neigh show`, `ip link show type ...`)
- Debian net-tools deprecation discussion (net-tools obsolete since the early 2010s)

## Issues Found
1. **`ip --version` is not a valid flag.** The post recommended `ip --version` to check the installed version, but iproute2's `ip` utility does not accept `--version` (only `-V` or `-Version`). Running `ip --version` produces `Option "-version" is unknown`. **Fix:** changed to `ip -V`, which is the documented short form.
2. **`ip link show type ether` returns no results.** The `type` filter in `ip link show` matches against virtual link kinds (bridge, vlan, bond, veth, dummy, vxlan, etc.) reported by the kernel, not against the layer-2 media type. Physical ethernet NICs have no kind, so `type ether` matches nothing. **Fix:** changed the example to `ip link show type bridge` and updated the comment to clarify which kinds are valid (bridge, vlan, bond, veth, dummy).

## Review Notes
- The `ifconfig eth0 0.0.0.0` example is shown only as the legacy way to clear an address; behavior varies slightly across `net-tools` versions but it is the canonical historical idiom, so it's acceptable in a comparison context.
- The JSON output examples (`ip -j addr show ...` piped through `jq`) were verified against current iproute2 (6.1.0). Fields used — `addr_info`, `family`, `local`, `scope`, `operstate`, `ifname` — are all present in current output.
- The `ip route get` cache line in newer iproute2 may include extra fields like `uid` and `cache`; this doesn't affect the example's correctness.
- `ip -br` (brief) output is correct for current iproute2 and is well-suited for scripting as the post claims.
- The post correctly notes that `net-tools` is no longer installed by default on modern Ubuntu (true since 17.10 / 18.04 LTS).
- No other technical inaccuracies were found in the command syntax, route/neighbor/link examples, VLAN/bridge/dummy creation, or the quick-reference table.
