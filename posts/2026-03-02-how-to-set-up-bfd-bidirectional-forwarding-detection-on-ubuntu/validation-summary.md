# Validation Summary: How to Set Up BFD (Bidirectional Forwarding Detection) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Bidirectional Forwarding Detection (BFD) — RFC 5880/5881/5883
- FRRouting (FRR) — `bfdd`, `bgpd`, `ospfd`, `isisd`, `zebra`, `vtysh`
- Ubuntu (FRR APT repository)
- BGP, OSPF, IS-IS routing protocols
- systemd (`systemctl`, `journalctl`)
- Linux networking (`ip link`)

## Sources Consulted
- FRRouting BFD documentation (latest): https://docs.frrouting.org/en/latest/bfd.html
- FRRouting BFD documentation (stable-7.4): https://docs.frrouting.org/en/stable-7.4/bfd.html
- FRRouting source — `bgpd/bgp_bfd.c` on master: https://github.com/FRRouting/frr/blob/master/bgpd/bgp_bfd.c
- FRRouting source — `doc/user/bfd.rst` on master: https://github.com/FRRouting/frr/blob/master/doc/user/bfd.rst
- FRRouting Debian/Ubuntu package documentation: https://deb.frrouting.org/
- RFC 5880 (Bidirectional Forwarding Detection)

## Issues Found
1. **Inline BGP BFD timer syntax (`neighbor X bfd 3 300 300`).** This form (`neighbor_bfd_param_cmd`) is marked `DEFUN_HIDDEN` when FRR is built with `HAVE_BFDD` (the standard build for any installation that uses the bfdd daemon, as this tutorial does). It does not actually drive bfdd's timers and has been replaced by BFD profiles. Replaced with a `bfd` block defining a `profile fast` and applied to the BGP neighbor via `neighbor X bfd profile fast`. Updated explanatory text accordingly. Applied to both Router A and Router B examples.

2. **`echo-interval 50` in echo-mode example.** Current FRR uses two separate commands: `echo receive-interval <ms>` and `echo transmit-interval <ms>`. The combined `echo-interval` form is not in current documentation. Replaced with both commands set to 50ms.

3. **`neighbor 10.100.0.1 bfd multihop` in multi-hop section.** No such BGP neighbor command exists in FRR (`bgpd/bgp_bfd.c` has no `multihop` DEFUN). Multi-hop is determined by the matching BFD peer configured with `peer X multihop local-address Y` under `bfd`. Replaced with `neighbor 10.100.0.1 bfd` plus a clarifying comment.

4. **`local-address` placement in standalone BFD example.** Per FRR docs the `local-address` keyword is a peer-creation option that belongs on the `peer` command line (alongside `multihop`, `interface`, `vrf`), not as a sub-command of the peer block. Moved `local-address 192.168.1.1` from the peer body up to `peer 192.168.1.2 local-address 192.168.1.1`.

## Review Notes
- The FRR APT repo URL (`https://deb.frrouting.org/frr`), GPG keyring path, `frr-stable` release suffix, `/etc/frr/daemons` format, and `vtysh` commands are all current and correct.
- The OSPF (`ip ospf bfd`), IS-IS (`isis bfd`), and core BFD peer commands (`transmit-interval`, `receive-interval`, `detect-multiplier`, `echo-mode`) are correct for current FRR versions.
- The multi-hop BFD peer syntax `peer X multihop local-address Y` is correct.
- The IS-IS NET format (`49.0000.0000.0001.00`) and `is-type level-2-only` are correct.
- The post's `show bfd peers` sample output is illustrative; the exact field formatting can vary slightly between FRR versions, but the fields shown are all real.
- BFD detect time on directly-connected sessions is negotiated between peers (max of local Tx and remote required Rx, times the multiplier), so "900ms" with 3 × 300ms is a reasonable upper bound when both sides agree on those values — the profile approach now used in the post makes that more explicit.
- The `bfd strict` mode (newer in FRR) is not covered, but the post is not claiming to be exhaustive.
