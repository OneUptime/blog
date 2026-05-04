# Validation Summary: How to Configure SRv6 for Service Chaining

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6) - RFC 8754, RFC 8986
- Linux kernel SRv6 support (`seg6` and `seg6local` lwtunnel encap)
- iproute2 (`ip -6 route` with `encap seg6` / `encap seg6local`)
- SRv6 endpoint behaviors: End.X, End.DT6
- Linux policy routing (`ip -6 rule`, `fwmark`)
- ip6tables mangle table marking
- IPv6 SID locator/function model (5f00::/16 SRv6 SID block per RFC 9602)
- tcpdump for IPv6 routing extension header (proto 43)
- traceroute6 / ping6
- Mermaid diagrams

## Sources Consulted
- man ip-route(8) — `seg6` / `seg6local` encap, `End.X nh6 NEXTHOP`, `End.DT6 { table | vrftable } TABLEID` syntax
- RFC 8986 — SRv6 Network Programming (defines End, End.X, End.DT6 behaviors)
- RFC 8754 — IPv6 Segment Routing Header (SRH)
- RFC 9602 — IANA allocation of `5f00::/16` as the SRv6 SID block
- Bash manual — line continuation rules (`\<newline>` only continues when backslash is the final char of the line)
- Bash manual — parameter expansion `${var%pattern}` vs `${var%%pattern}` (shortest vs longest match from end)
- IETF draft-ietf-spring-sr-service-programming — SRv6 SFC behaviors

## Issues Found

1. **Broken line continuation with inline comments (Step 1).** Each `ip -6 route add ... seg6local action End.X` block had `\<spaces># comment` in the middle of multi-line commands. In bash, `\` is only line-continuation when followed *immediately* by a newline; `\<space>` is just an escaped space, after which `# ...` starts a comment that swallows the rest of the line, breaking the command. Verified with a runnable test (`echo a \    # comment\n  b` produces `a` plus a "command not found" for `b`). Fixed by removing the inline comments and collapsing each `End.X nh6 …` clause onto a single continued line.

2. **Broken line continuation in Step 2 ingress encap.** The multi-line `segs \<newline>  SID,\   # comment` pattern had the same line-continuation defect, plus extra whitespace/newlines inside what must be a single comma-separated `segs` argument. Replaced with the segment list on one line and moved the per-SID labels to a comment block above the command.

3. **Wrong parameter expansion in Step 4 health-check script.** `addr="${svc%%:*}"` uses `%%` which removes the *longest* `:*` suffix; for `5f00:svc:1::1:IDS` that returns just `5f00`, not the IPv6 address. The intent is to strip only the trailing `:NAME` segment, which requires `%` (shortest match). Verified empirically: `${svc%:*}` correctly yields `5f00:svc:1::1`. Changed to `addr="${svc%:*}"`.

## Review Notes

- **Mnemonic IPv6 addresses.** The post uses readable but non-hex labels in IPv6 addresses (`5f00:svc:1::/48`, `5f00:app:1::/48`, `2001:db8:vip::/48`, `fe80::fw1`, `2001:db8:app::server1`, etc.). Characters like `s`, `v`, `p`, `g`, `r`, `t`, `i` are not valid hex digits, so these would fail `inet_pton` if pasted literally. This is a common didactic shorthand in networking tutorials (read as "substitute your real SID here"), but readers copy-pasting verbatim will hit parser errors. Left in place because rewriting every address would substantively change the post; flagged here for awareness.
- **End.X vs SFC proxy behaviors.** End.X cross-connects to an L3 next-hop *after* SRv6 endpoint processing (Segments Left decremented, DA updated to next SID). It is appropriate when the service function is SRv6-aware and forwards transit traffic, but for SRv6-unaware service functions the IETF SR-service-programming draft defines End.AS / End.AD / End.AM proxy behaviors. The post's framing ("After inspection, forward to FW") implicitly assumes SRv6-aware SFs along the L3 path; worth a future note for readers running legacy middleboxes.
- **End.DT6 `vrftable` requires VRF strict mode.** Per `man ip-route`, when `vrftable` is used, the table id must be a VRF device with `net.vrf.strict_mode=1`. The plain `table TABLEID` form works without VRF. The example uses `vrftable 100`; readers without VRF configured should use `table 100` instead.
- **`ping6` is deprecated** on most modern distros in favor of `ping -6` / `ping`. The wrapper still exists, so the script works as written; consider switching in a future revision.
- **tcpdump `ip6 proto 43`.** Protocol 43 is the IPv6 Routing Header (which carries the SRH). The `grep -A5 "routing:"` matches tcpdump's verbose-mode label for routing extension headers; this is correct on current libpcap/tcpdump versions.
