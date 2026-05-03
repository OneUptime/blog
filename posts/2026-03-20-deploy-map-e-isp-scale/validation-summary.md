# Validation Summary: How to Deploy MAP-E at ISP Scale

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- MAP-E (Mapping of Address and Port - Encapsulation, RFC 7597)
- DHCPv6 S46 options (RFC 7598)
- Linux ip6tnl (`ip4ip6` mode)
- iptables / sysctl (Linux forwarding)
- OpenWRT `map` package
- Kea DHCPv6 server (illustrative config)
- tcpdump
- Python (PSID port-range calculator)

## Sources Consulted
- RFC 7597 — Mapping of Address and Port with Encapsulation (MAP-E): https://datatracker.ietf.org/doc/html/rfc7597
- RFC 7598 — DHCPv6 Options for Configuration of Softwire Address and Port-Mapped Clients: https://datatracker.ietf.org/doc/html/rfc7598
- RFC 7599 — MAP-T (used for MAP-E vs MAP-T comparison)
- OpenWRT `map` package source / mapcalc semantics for `ealen`, `offset`, and `ip4prefixlen`
- Linux iproute2 `ip -6 tunnel` documentation for `ip4ip6` mode

## Issues Found
1. **BR description claimed it "performs NAPT from the shared pool"** — incorrect. Per RFC 7597, the MAP-E BR is stateless and does not perform NAPT; the CE handles NAPT before encapsulation. Rewrote the section to state this correctly and replaced the misleading `iptables -t nat ... MASQUERADE` rule with `sysctl` IPv4/IPv6 forwarding enables, which is what a stateless BR actually needs.
2. **OpenWRT CE config: `option ealen '8'` with `option ip4prefixlen '24'` produced PSID_len = 0** (since PSID_len = ealen - (32 - ip4prefixlen) = 8 - 8 = 0), but the verification script later assumes `psid_len = 8`. Changed `ealen` to `16` so that the IPv4 suffix (8 bits) plus the PSID (8 bits) sum to the EA-bits length and the configuration is internally consistent with the script.
3. **DHCPv6 option `data` had `ea-len=8`** for the same reason — updated to `ea-len=16` to stay consistent with the corrected CE config.
4. **Python port-range calculator misinterpreted `offset`** as the M (port-within-set) bit count, treating `offset` as if it were the low-order bits. RFC 7597 defines `offset` (a) as the high-order bit count (default 6 to exclude well-known ports), with the port layout `[A | PSID | M]`. Rewrote the loop to iterate `a` over `2**offset` and compute `m = 16 - offset - psid_len`, so `port_start = (a << (psid_len + m)) | (psid << m)` and the per-set width is `2**m`. This now produces port ranges that match the standard MAP-E formula.

## Review Notes
- The simple `ip -6 tunnel add ... mode ip4ip6` on the BR is an illustrative tunnel endpoint, not a real production MAP-E BR data plane. A production BR needs a MAP-aware forwarder (e.g., a kernel MAP module, VPP MAP plugin, or a vendor MAP appliance) so that return traffic from the IPv4 internet can be encapsulated back to the correct CE IPv6 address using the MAP rule. Worth noting this caveat for readers in a future revision.
- The Kea DHCPv6 snippet uses a simplified free-form `data` string. Real Kea S46 (option 94) configuration requires nested sub-options (s46-rule code 89, s46-br code 90, s46-portparams code 93) rather than a flat string. Acceptable as conceptual illustration but a reader copy-pasting it would not get a working Kea config.
- The MTU note is correct (IPv6 header = 40 bytes; 1500 - 40 = 1460), but in practice operators often go lower (e.g., 1452) to leave headroom for additional encapsulation along the path.
- For the chosen `offset=6, psid=3, psid_len=8` parameters, set `A=0` produces ports below 1024 (12-15). Production deployments typically skip A=0 (or use a sufficient `offset`) to fully exclude system ports — the script as written demonstrates the algorithm but not the well-known-port exclusion. Worth a follow-up note in a future revision.
