# Validation Summary: How to Configure Multi-Path (ECMP) Static Routes on Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux kernel routing (FIB / multipath)
- iproute2 (`ip route`, `ip -s link`)
- ECMP (Equal-Cost Multi-Path) routing
- `sysctl` / `net.ipv4.fib_multipath_hash_policy`
- systemd-networkd (`.network` files, `[Route]`, `MultiPathRoute=`)

## Sources Consulted
- Linux kernel networking docs — ip-sysctl.rst (`net.ipv4.fib_multipath_hash_policy` values 0/1/2/3): https://www.kernel.org/doc/Documentation/networking/ip-sysctl.rst
- systemd.network(5) — `MultiPathRoute=` syntax `address[@name] [weight]`: https://www.man7.org/linux/man-pages/man5/systemd.network.5.html
- ECMP on Linux (FHR's blog) — confirmation of `nexthop ... via ... dev ... weight ...` syntax and hash policy values: https://blog.fhrnet.eu/2019/03/07/ecmp-on-linux/
- iproute2 `ip-route(8)` man page — `nexthop` directive, `weight` (1..256), `ip route get ... from ...` form

## Issues Found
- **systemd-networkd "true ECMP" section was technically incorrect.** The original post claimed that "for true ECMP in systemd-networkd, define routes on each interface" and showed two separate `.network` files (one per interface) each declaring a `[Route]` with the same `Destination=` but a different `Gateway=`. That does **not** produce an ECMP/multipath route — it installs two independent routes that the kernel does not combine into a single multipath FIB entry. The supported way to configure ECMP in systemd-networkd is with the `MultiPathRoute=` directive (which the post had already shown correctly above). Replaced the misleading subsection with a correct example showing the documented `MultiPathRoute=address[@name] [weight]` syntax with an explicit interface and weight, which is the proper way to add additional nexthops on a different interface.

## Review Notes
- All `ip route` syntax (nexthop / via / dev / weight), the `ip route show` expected output, and `ip route get DEST from SRC` are correct.
- `weight` range note: iproute2 accepts 1..256; the post uses values 1 and 2, which are fine.
- `fib_multipath_hash_policy` values 0/1/2 are correctly described. A fourth value (`3` — custom hash fields via `fib_multipath_hash_fields`) exists in newer kernels (≥ 5.12) but is not required for the post's scope; omitting it is acceptable.
- The `ip -s link show` "similar TX packet counts" verification is a reasonable rough check, but readers should be aware the per-flow hash means distribution depends entirely on the source/destination (and L4) tuple variety in the test traffic — single-flow benchmarks will appear to use only one path. Not a correctness issue, just a caveat worth mentioning in a future revision.
- Post does not mention IPv6 ECMP (`ip -6 route add ... nexthop ...`) or that prior to kernel 4.4 IPv4 ECMP used per-packet hashing rather than per-flow; both are out-of-scope but could be follow-up content.
