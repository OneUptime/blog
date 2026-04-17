# Validation Summary: How to Configure ZeroTier with IPv6

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- ZeroTier (ZeroTierOne daemon, zerotier-cli, ZeroTier Central)
- IPv6 (RFC 4193 ULA addressing)
- ZeroTier 6PLANE addressing mode
- ZeroTier Central REST API
- Linux networking (`ip -6`, `ip6tables`, `sysctl net.ipv6.conf.all.forwarding`)
- Tailscale (comparison table only)

## Sources Consulted
- ZeroTier Protocol / Addressing docs: https://docs.zerotier.com/protocol/
- ZeroTier Central API reference: https://docs.zerotier.com/api/central/v1/
- ZeroTier CLI man page: https://github.com/zerotier/ZeroTierOne/blob/dev/doc/zerotier-cli.1.md
- ZeroTier download / install page: https://www.zerotier.com/download/
- ZeroTier install script repo: https://github.com/zerotier/install.zerotier.com
- Tailscale IPv6 support (KB 1121): https://tailscale.com/kb/1121/ipv6
- Tailscale source (`tsaddr.go`): https://github.com/tailscale/tailscale/blob/main/net/tsaddr/tsaddr.go
- RFC 4193 (Unique Local IPv6 Unicast Addresses)

## Issues Found
1. **Invalid CLI subcommand `zerotier-cli listroutes`** — this subcommand does not exist in `zerotier-cli`. The documented/available subcommands are `help`, `info`, `listpeers`/`peers`, `listnetworks`, `join`, `leave`, `set`, `get`, `bond`, `dump`. Routes for a managed network are visible inside `listnetworks` output; kernel IPv6 routes are seen via `ip -6 route`. **Fix:** Replaced the `sudo zerotier-cli listroutes` line with a comment clarifying where routes are visible and an `ip -6 route show` call.

2. **Incorrect Tailscale IPv6 ULA prefix** — the post wrote the Tailscale ULA range as `fd7a:115c::/48`. The correct Tailscale CGNAT v6 prefix is `fd7a:115c:a1e0::/48` (the third hextet `a1e0` is part of the /48 identifier, per Tailscale docs and `tsaddr.go`). **Fix:** Updated the comparison table entry to `fd7a:115c:a1e0::/48`.

3. **Incomplete Debian/Ubuntu install procedure** — the manual install snippet imported a GPG key and then ran `apt-get install zerotier-one`, but `zerotier-one` is not in the default Debian/Ubuntu apt repositories. Without adding ZeroTier's apt repo at `http://download.zerotier.com/debian/`, the apt install step would fail. **Fix:** Added the `echo "deb [signed-by=...] http://download.zerotier.com/debian/${RELEASE} ${RELEASE} main"` line to create `/etc/apt/sources.list.d/zerotier.list`, followed by `apt-get update`, before the `apt-get install` step. Also added `-s` to the `curl` for the GPG key to match the rest of the snippet.

4. **Stale Central API host** — the API example used `https://my.zerotier.com/api/v1/...`. Both hosts still resolve to the same backend, but ZeroTier's current Central API documentation uses `https://api.zerotier.com/api/v1/` as the canonical endpoint. **Fix:** Updated the `curl` example to `https://api.zerotier.com/api/v1/network/<nwid>` and adjusted the adjacent comment accordingly.

## Review Notes
- `/88` for RFC 4193 and `/80` for 6PLANE are both accurate and match ZeroTier's documented addressing format.
- The `v6AssignMode` JSON object in the API example (`rfc4193`, `6plane`) is valid; a third sibling field `zt` exists (for controller-managed pool addressing) but is optional and was reasonably omitted for this example.
- `zerotier-cli status` and `zerotier-cli info` behave equivalently in current releases; left the post's use of `status` intact.
- `ping6` still works on most distributions but is considered deprecated in iputils in favor of `ping -6`; not changed since it is not incorrect.
- The `fd00::/8` description of RFC 4193 is the locally-assigned portion of `fc00::/7` (L-bit set); this is accurate phrasing.
