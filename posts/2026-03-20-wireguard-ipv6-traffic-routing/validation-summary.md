# Validation Summary: How to Configure WireGuard for IPv6 Traffic Routing

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- WireGuard (wg / wg-quick configuration)
- IPv6 addressing, ULA (RFC 4193), documentation prefix (RFC 3849)
- Linux IPv6 forwarding (`sysctl net.ipv6.conf.all.forwarding`)
- ip6tables (FORWARD, NAT/MASQUERADE)
- iproute2 (`ip -6 route`)
- BIRD2 routing daemon (BGP / OSPF)
- Diagnostics: `ping6`, `tcpdump`, `curl -6`

## Sources Consulted
- WireGuard official site and protocol overview: https://www.wireguard.com/
- `wg(8)` and `wg-quick(8)` manual pages: https://git.zx2c4.com/wireguard-tools/about/src/man/wg.8 and https://git.zx2c4.com/wireguard-tools/about/src/man/wg-quick.8
- RFC 4193 (Unique Local IPv6 Unicast Addresses)
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation — `2001:db8::/32`)
- RFC 4291 (IPv6 Addressing Architecture — global unicast `2000::/3`, link-local `fe80::/10`)
- iptables/ip6tables documentation (netfilter.org)
- Google Public DNS IPv6 addresses (`2001:4860:4860::8888`)

## Issues Found
1. **Invalid hex characters in IPv6 addresses.** Several example addresses contained non-hex tokens (`wg`, `services`, `office`, `internal`) which IPv6 syntax does not allow. These would fail to parse in any WireGuard, iproute2, or ip6tables tool. Fixed by replacing them with valid numeric hex labels:
   - `fd00:wg::...` → `fd00:1::...`
   - `fd00:services::/32` → `fd00:2::/32`
   - `2001:db8:internal::/48` → `2001:db8:1::/48`
   - `2001:db8:office::/48` → `2001:db8:2::/48`
2. **Invalid Endpoint literal.** `Endpoint = [2001:db8::server]:51820` contained `server` inside a bracketed IPv6 literal, which is not a valid IPv6 address. Replaced with `[2001:db8::1]:51820`.
3. **Inline `#` comments on a multi-line `AllowedIPs` value.** The wg/wg-quick INI parser does not reliably support inline comments after values on the same line, and the split-tunnel example wrapped a single directive across multiple lines with trailing `# ...` annotations. Rewrote as a single-line comma-separated `AllowedIPs =` with the annotations moved into preceding `#` comment lines so it actually parses.
4. **Misleading comment in full-tunnel example.** The comment read "Route ALL IPv6 traffic through VPN" above `AllowedIPs = 0.0.0.0/0, ::/0`, which routes both IPv4 and IPv6. Updated to "Route all IPv4 and IPv6 traffic through VPN" for accuracy.
5. **Imprecise private-range comment in the excluding-a-subnet example.** Comment claimed `2000::/3` "excludes fd00::/8 (private range)" which is loosely stated — `2000::/3` simply doesn't cover anything outside global unicast. Tightened the wording to note that `2000::/3` is the global unicast block and that ULA (`fc00::/7`) and link-local (`fe80::/10`) are naturally excluded. Also replaced the reference to the non-standard utility `ipcalc6` with a generic description.

## Review Notes
- `ping6` still exists on most distributions but iputils has deprecated it in favor of `ping -6`; both currently work, so this is left as-is.
- Using `MASQUERADE` with NAT66 on a ULA-to-global setup is uncommon but valid; some deployments prefer NPTv6 (`ip6tables -t nat ... -j NETMAP`) or simply routing globally-routable prefixes to clients. The post's approach is workable for a single-server ULA lab, so no change was made.
- `fd00:1::/64`, `fd00:1::1/64`, `fd00:1::2/128` etc. are illustrative; real deployments should generate a random 40-bit Global ID per RFC 4193 section 3.2.
- `AllowedIPs = 2000::/3` is a pragmatic shortcut to avoid sending ULA and link-local traffic through the tunnel; operators who need finer exclusions still need an explicit complement calculation.
- `PersistentKeepalive = 25` is the WireGuard-recommended default for NAT traversal; no change needed.
