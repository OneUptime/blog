# Validation Summary: How to Understand the NAT64 Well-Known Prefix (64:ff9b::/96) - 64ff9b

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- NAT64 (RFC 6146) and the Well-Known Prefix `64:ff9b::/96` (RFC 6052)
- IPv4 / IPv6 address representation and translation
- Python `ipaddress` standard library
- DNS64 in BIND 9 (`dns64` clause, ACLs, `mapped`/`clients`)
- `dig` for AAAA lookup verification
- Jool 4.x stateful NAT64 (kernel module, `instance`, `pool4`, `pool6`)
- `ip6tables` for filtering at internet boundaries

## Sources Consulted
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators (esp. §2.1 Well-Known Prefix, §2.2 Address Format)
- RFC 6146 — Stateful NAT64
- RFC 6147 — DNS64
- ISC BIND 9 Administrator Reference Manual — `dns64` options, built-in ACLs (`any`, `none`, `localhost`, `localnets`)
- Jool project documentation (https://nicmx.github.io/Jool/) — Stateful NAT64 basic tutorial, `jool instance`, `jool pool4`
- Python docs for the `ipaddress` module
- `bash(1)` man page — line continuation rules with `\` and comment handling
- `dig(1)` / BIND9 dig manual — `@server` IPv6 syntax

## Issues Found
1. **Unused import in Python sample.** `import socket` was imported but never used in `synthesize_nat64_address`. Removed the unused import so the example is minimal and clean.
2. **Misleading comment on BIND9 `mapped` clause.** The original comment said `mapped` excludes "actual IPv6 addresses from synthesis." That is wrong — `mapped` filters which **IPv4 A-record addresses** are eligible for AAAA synthesis. Replaced with an accurate comment explaining the clause filters IPv4 addresses and excludes RFC1918 private space.
3. **`rfc1918` is not a built-in BIND9 ACL.** BIND9 only ships `any`, `none`, `localhost`, and `localnets`. The config as written would fail to load. Added an explicit `acl rfc1918 { 10/8; 172.16/12; 192.168/16; };` definition before the `options` block so the snippet is loadable.
4. **`dig @[::1]` syntax.** The `dig` man page documents `@server` accepting an IPv6 address in colon-delimited notation, without brackets. Changed to `dig AAAA ipv4only.example.com @::1` for the canonical form.
5. **Jool 4.x configuration was incomplete.** `jool global update pool6 ...` does not work without an existing instance; in Jool 4.x, `pool6` is set at instance creation. Replaced the `global update pool6` step with `jool instance add "default" --netfilter --pool6 64:ff9b::/96` and scoped subsequent `pool4`/`global` commands with `-i "default"` per the official Jool stateful NAT64 tutorial. Also added a port range (`1-65535`) to the `--icmp` `pool4 add` line for consistency with the TCP/UDP entries.
6. **Bash line continuation broken by inline `#` comments.** In `ip6tables -A FORWARD ... -i eth0 \          # External interface`, the `\` is followed by a space (escapes the space), and `#` then starts a comment that consumes the rest of the line including the newline that would have continued the command — so the next line runs as a separate (broken) command. Moved the explanatory comment above the block and removed the inline comments so the snippet executes as a single command.

## Review Notes
- The IPv4-to-IPv6 conversion math is correct: `93.184.216.34` → `0x5db8d822` → `64:ff9b::5db8:d822`, and `8.8.8.8` → `0x08080808` → `64:ff9b::808:808`. The Python `IPv6Network.network_address | int(IPv4Address)` approach works cleanly because the `/96` network address has zeros in the lower 32 bits.
- RFC 6052 §2.2 reference in the docstring is accurate (Address Format / Translation Algorithm).
- `example.com` historically resolved to `93.184.216.34`; the IANA-administered example domains were re-pointed in 2025. The address still works as a static illustration of bit-mapping into the well-known prefix, so it has been left in place as a didactic example.
- The Jool snippet uses `--netfilter` mode; readers on newer kernels who prefer the `iptables`/`nftables`-driven mode can substitute `--iptables`. Out of scope for this fix.
- The BIND `dns64` clause could additionally include an `exclude { ::ffff:0.0.0.0/96; };` rule to skip already-mapped IPv4-in-IPv6 records; this is a refinement, not a correctness issue, so it was not added.
