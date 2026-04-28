# Validation Summary: How to Use Optimistic DAD for IPv6 Address Assignment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- Duplicate Address Detection (DAD)
- Optimistic DAD (RFC 4429)
- Linux IPv6 sysctl parameters
- iproute2 (`ip -6 addr`, `ip monitor`, `ip netns`)
- Linux kernel neighbor discovery / addrconf logging

## Sources Consulted
- RFC 4429 — "Optimistic Duplicate Address Detection (DAD) for IPv6" (https://datatracker.ietf.org/doc/html/rfc4429)
- RFC 4862 — "IPv6 Stateless Address Autoconfiguration" (https://datatracker.ietf.org/doc/html/rfc4862)
- Linux kernel `Documentation/networking/ip-sysctl.rst` (optimistic_dad, use_optimistic, dad_transmits, accept_dad, retrans_time_ms)
- Linux kernel source `net/ipv6/addrconf.c` (dmesg duplicate address message format)
- iproute2 source `ip/ipaddress.c` (printed address state flags)
- Live verification on Linux 6.17 (`/proc/sys/net/ipv6/...`, `ip -6 addr add`)

## Issues Found
1. **Invalid IPv6 address `2001:db8::mobile/64`** — `mobile` contains non-hex characters (`m`, `o`, `i`, `l`); `ip -6 addr add` rejects it with `Error: inet6 prefix is expected`. Replaced with `2001:db8::abcd/64`.
2. **Incorrect claim "Cannot receive traffic as unicast destination yet"** — per RFC 4429 §2.1, an Optimistic Address is treated equivalently to a deprecated address and can receive unicast traffic. The actual restrictions (RFC 4429 §3.2 / §2.2) are: do not source NS messages from it, do not send unsolicited NAs, force the Override flag to 0 in solicited NAs, and do not source RS with a SLLAO. Replaced the bullet with these accurate restrictions.
3. **`retrans_time_ms` placed under `net.ipv6.conf.X`** — the Linux sysctl lives under `net.ipv6.neigh.X.retrans_time_ms`, not `net.ipv6.conf.X.retrans_time_ms`. Corrected.
4. **`accept_dad=2` description** — the post described value `2` as "on+disable on conflict", but the kernel doc specifies it disables IPv6 only on a MAC-based duplicate link-local address. Also added the correct default (`1`).
5. **`use_optimistic` description** — softened from the misleading "Use optimistic addresses" to clarify that it controls source address selection (does not classify optimistic addresses as deprecated when picking sources).
6. **Address state list** — `preferred` is not a literal flag printed by `ip -6 addr show`; it is the implicit state when no flag is shown. Also added `dadfailed`, which is the flag shown when DAD detects a duplicate. Updated the comment block accordingly.
7. **dmesg message format** — kernel actually logs `<iface>: IPv6 duplicate address <addr> used by <MAC> detected!` (no `IPv6:` prefix; includes `used by <MAC>`). Fixed the example to match the real format.

## Review Notes
- The `ip netns exec other-ns ip -6 addr add 2001:db8::1/64 dev veth0` example only triggers a real DAD conflict if the two namespaces are bridged onto the same L2 segment via veth pairs. Left as-is — the surrounding context implies a connected veth setup, and rewriting would change the post's structure.
- `2001:db8::1/64` is the documentation prefix from RFC 3849 — appropriate for examples.
- Both `optimistic_dad=1` and `use_optimistic=1` are typically required for an optimistic address to actually be selected as a source for outgoing traffic; the post enables only `optimistic_dad`. Not strictly an error (the address still enters the optimistic state and DAD proceeds), but readers reproducing the latency measurement may want to set `use_optimistic=1` too.
- Latency figures (~1s standard vs ~50ms optimistic) are reasonable given default `dad_transmits=1` and `retrans_time_ms=1000`.
