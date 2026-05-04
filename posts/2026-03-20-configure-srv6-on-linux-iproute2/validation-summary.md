# Validation Summary: How to Configure SRv6 on Linux with iproute2 - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Linux kernel SRv6 (Segment Routing over IPv6)
- iproute2 `ip route encap seg6` (source routing)
- iproute2 `ip route encap seg6local` (endpoint behaviors: End, End.X, End.DT6, End.DX4, End.DX6)
- Linux VRFs (`ip link add ... type vrf`)
- `ip sr hmac` (HMAC authentication for SRH)
- SRv6 sysctls (`seg6_enabled`, `seg6_require_hmac`)

## Sources Consulted
- iproute2 source code on GitHub: https://github.com/iproute2/iproute2 (`ip/ipvrf.c`, `ip/iplink_vrf.c`, `ip/iproute_lwtunnel.c`)
- `ip-route(8)`, `ip-vrf(8)`, `ip-sr(8)` man pages from iproute2 6.1.0
- Linux kernel documentation: `Documentation/networking/seg6-sysctl.rst`, `Documentation/networking/vrf.rst`
- Kernel commit `d1df6fd8a1d2` introducing `net/ipv6/seg6_local.c` (v4.14)
- kernelnewbies.org/Linux_4.10 (SRv6 encap support)
- RFC 9602 §6 (IANA allocation of `5f00::/16` for SRv6 SIDs)
- RFC 8754 (IPv6 Segment Routing Header)
- RFC 8986 (SRv6 Network Programming / endpoint behaviors)

## Issues Found

1. **Invalid `ip vrf add CUSTOMER_A` command** in Step 1. The `ip vrf` subcommand only supports `show`, `exec`, `identify`, and `pids` (per `ip-vrf(8)` and `ip/ipvrf.c`). VRF devices are created with `ip link add NAME type vrf table TABLEID`. Replaced with the correct `ip link add CUSTOMER_A type vrf table 100` plus `ip link set dev CUSTOMER_A up`.

2. **Incorrect attempt to enslave `lo` into a VRF** (`ip link set dev lo master CUSTOMER_A`). The system loopback belongs to the default VRF; enslaving it would break local services bound to `127.0.0.1` / `::1`. Standard practice is a dedicated dummy/loopback per VRF. Removed the line.

3. **Misleading `ip netns add vrf-customer-a`** mixed in with VRF setup — netns and VRF are different mechanisms. Removed.

4. **`cat /proc/net/ipv6_route | grep "seg6"` does not work**. `/proc/net/ipv6_route` is a hex-encoded fixed-width format with no string content; the literal "seg6" never appears. Replaced with `ip -6 route show encap seg6local` and `ip -6 route show encap seg6` which is the proper way to filter.

5. **`ss -6 -t -i | grep "seg6"` is misleading**. `ss -i` shows TCP-level counters such as `segs_out`/`segs_in` (TCP segments), which are unrelated to SRv6/SRH state. `ss` does not expose SRv6 information at all. Replaced with `ip -6 route get` for resolving the encap applied to a destination.

6. **Incorrect `ip sr hmac set` syntax**. The post used `ip sr hmac set 1 SHA256 aabbcc...` passing the key on the command line. Per `ip-sr(8)` and the iproute2 source, the syntax is `ip sr hmac set KEYID ALGO`; the passphrase is read interactively from stdin (newline-terminated), and supported algorithms are lowercase `sha1` / `sha256`. Updated to the correct usage with explanatory comment.

7. **Demo script used `vrftable 254` without creating a VRF**. Added the `ip link add ... type vrf table 254` setup so the example actually works end-to-end.

## Review Notes
- The kernel-version timeline (4.10 for `seg6` encap, 4.14 for `seg6local`) is correct.
- The `5f00::/16` prefix is in fact an IANA-allocated SRv6 SID prefix per RFC 9602 (not just a documentation prefix), so its use in examples is appropriate.
- `vrftable` and `table` are both accepted by `End.DT6` (per iproute2 `iproute_lwtunnel.c`); the post's use of `vrftable` is fine. Note that `End.DT4` only accepts `vrftable`.
- `mode l2encap` is valid (present in `seg6_mode_types[]` in iproute2). Newer kernels also support `encap.red` / `l2encap.red` (reduced SRH variants), which the post does not cover but is not an error.
- `seg6_require_hmac` values: `-1` (ignore HMAC), `0` (accept with or without), `1` (require HMAC). The post's use of `0` and `1` is correct.
- The `default` sysctl form persisted in `/etc/sysctl.d/99-srv6.conf` controls the template applied to newly created interfaces; existing interfaces still need their per-iface knob set explicitly. Not strictly an error, just a caveat.
- `ping6` and `traceroute6` are deprecated aliases on many distributions in favor of `ping -6` / `traceroute -6`, but they still work — left unchanged.
