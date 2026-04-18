# Validation Summary: How to Troubleshoot Missing Routes in the Routing Table

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux `iproute2` (`ip route`, `ip monitor`)
- FRR (Free Range Routing) via `vtysh`
- OSPF (Open Shortest Path First)
- BGP (Border Gateway Protocol)
- Netplan (persistent route config)
- `journalctl` / systemd logs

## Sources Consulted
- FRR documentation — OSPF: https://docs.frrouting.org/en/latest/ospfd.html
- FRR documentation — BGP: https://docs.frrouting.org/en/latest/bgp.html
- FRR source `ospfd/ospf_ism.h` (Interface State Machine states)
- iproute2 source `ip/iproute.c` (default `rtm_protocol = RTPROT_BOOT` on route add)
- Linux `rtnetlink(7)` / `<linux/rtnetlink.h>` for RTPROT_* constants
- `ip-route(8)` man page

## Issues Found
1. **Step 3 — OSPF database comment was inaccurate.** The comment read "Check if OSPF is redistributing to the kernel RIB (sometimes OSPF has the route but doesn't install it)" above `vtysh -c "show ip ospf database"`. That command displays the OSPF LSA database, not kernel-RIB installation status. Rewrote the comment to accurately describe what the command shows ("Check the OSPF LSA database to confirm the prefix is being advertised").

2. **Step 3 — OSPF interface state list was incomplete.** The comment claimed the state should show "DR/BDR/DROther, not Down". Per FRR's ISM, valid non-Down states on different link types also include `Point-to-Point` (p2p/unnumbered links) and `Loopback` (loopback interfaces). Updated the comment to include those so the check doesn't produce false positives on p2p links.

3. **Step 4 — missing prerequisite for `received-routes`.** `show ip bgp neighbor X received-routes` in FRR requires `neighbor X soft-reconfiguration inbound` to be configured; otherwise the pre-policy RIB is not retained. Added an inline note so readers don't conclude "no routes received" when the real cause is missing soft-reconfiguration config.

4. **Step 2 — `grep "proto static"` would miss manually-added routes.** Bare `ip route add` defaults to `RTPROT_BOOT` (shown as `proto boot`), not `proto static`. Only configuration tools (Netplan, NetworkManager, systemd-networkd) install with `proto static`. Broadened the grep to `proto (static|boot)` and added a clarifying comment.

## Review Notes
- The blog treats FRR and iproute2 correctly throughout otherwise. Commands like `ip route show table all`, `ip monitor route`, `vtysh -c "show ip bgp summary"`, and the `>` best-path marker note are all accurate.
- The "RTNETLINK answers" error strings (`Network is unreachable`, `File exists`) match current kernel output.
- `vtysh -c "show ip ospf route"` is a valid FRR command (FRR-specific; not present in Quagga's vtysh the same way), so this post is implicitly FRR-targeted — that assumption is consistent with the rest of the commands.
- On very large BGP tables, `show ip bgp neighbor X received-routes` can be slow and memory-heavy due to soft-reconfiguration; for production diagnosis `show ip bgp neighbor X routes` (post-policy) is often preferable. Out of scope for this post's fix.
