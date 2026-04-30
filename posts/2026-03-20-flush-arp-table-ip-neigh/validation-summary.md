# Validation Summary: How to Flush the ARP Table with ip neigh flush

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `ip` / `iproute2`
- ARP
- Neighbor table management
- SSH

## Sources Consulted
- `ip-neighbour(8)` from upstream `iproute2`: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/refs/tags/v7.0.0/man/man8/ip-neighbour.8
- `ip(8)` from upstream `iproute2` for `-4` / family selection: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/refs/tags/v7.0.0/man/man8/ip.8
- `ip/ipneigh.c` from upstream `iproute2` to confirm `flush` defaults and `nud all` behavior: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/refs/tags/v7.0.0/ip/ipneigh.c
- `lib/utils.c` from upstream `iproute2` to confirm `all` is accepted as a prefix value: https://kernel.googlesource.com/pub/scm/network/iproute2/iproute2/+/refs/tags/v7.0.0/lib/utils.c
- Local runtime check with `ip neigh help` to confirm current CLI syntax on the review environment

## Issues Found
- The introduction implied immediate re-resolution for all neighbors. Updated it to reflect that entries are re-resolved as traffic resumes.
- The introduction said `ip neigh flush` preserves permanent entries, but did not mention `noarp`. Updated it to state that the default flush preserves both `permanent` and `noarp` entries.
- The draft did not mention privileges for `flush` operations. Added that the flush commands should be run as root or with `sudo`.
- `ip neigh flush all` and `ip neigh show 192.168.1.1` used shorthand forms that work, but the documented syntax is `to PREFIX`. Updated them to `ip neigh flush to all` and `ip neigh show to 192.168.1.1` for clarity and correctness against the man page.
- The stale-entry example described `stale` as “expired,” which is inaccurate. In `ip-neighbour(8)`, `stale` means the entry is still valid but suspicious. Updated the wording accordingly.
- The “flush everything including permanent” example overstated what `flush` removes. `ip neigh flush nud all` includes `permanent` entries, but `flush` still excludes `noarp`. Updated the command and explanation to reflect the actual behavior.
- Several headings/comments referred to the ARP table even when the commands affected the broader neighbor table unless `-4` was used. Updated those headings/comments to use “neighbor” where needed.

## Review Notes
- `ip neigh` manages the Linux neighbor table, which covers IPv4 ARP entries and IPv6 neighbor entries. The dedicated `ip -4 neigh ...` example is the ARP-only form.
- The remote SSH loop is syntactically valid, but whether it works as written depends on the remote user already having sufficient privileges or an appropriate `sudo` setup.
