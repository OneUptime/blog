# Validation Summary: How to Configure IPv6 Router Preference on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 networking
- Linux kernel IPv6 stack (RA processing, route selection)
- RFC 4191 (Default Router Preferences and More-Specific Routes)
- `iproute2` (`ip -6 route`, `ip -6 rule`)
- `sysctl` parameters under `/proc/sys/net/ipv6/conf/<iface>/` (`accept_ra_rtr_pref`, `ra_defrtr_metric`)
- Ubuntu Netplan configuration

## Sources Consulted
- [RFC 4191 - Default Router Preferences and More-Specific Routes](https://datatracker.ietf.org/doc/html/rfc4191)
- [Linux kernel IP sysctl documentation (`accept_ra_rtr_pref`, `ra_defrtr_metric`)](https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html)
- Linux kernel sources: [`include/uapi/linux/ipv6_route.h`](https://github.com/torvalds/linux/blob/master/include/uapi/linux/ipv6_route.h), [`net/ipv6/route.c`](https://github.com/torvalds/linux/blob/master/net/ipv6/route.c), [`net/ipv6/ndisc.c`](https://github.com/torvalds/linux/blob/master/net/ipv6/ndisc.c)
- iproute2 `ip-route(8)` man page
- Netplan reference documentation (routes / metric)

## Issues Found

1. **Incorrect metric mapping for RA preference** (multiple sections). The post claimed RA preference values mapped directly to metrics: `high → 512`, `medium → 1024`, `low → 2048`. This is wrong. RFC 4191 §2.1 explicitly states that "preference values SHOULD NOT be routing metrics or automatically derived from metrics." In Linux, all RA-installed default routes share the same metric (`IP6_RT_PRIO_USER` = 1024 by default, overridable per-interface via the `ra_defrtr_metric` sysctl). The `pref` field is stored separately in `fib6_flags` (via `RTF_PREF_MASK`) and is used as a tiebreaker by `rt6_score_route()` when comparing routes with equal metrics.

   **Fix:** Rewrote the introduction's metric example to show all three RAs producing routes with `pref` high/medium/low at the same metric. Updated the explanatory paragraph to describe the metric-then-pref selection logic.

2. **Incorrect example output of `ip -6 route show default`**. The example showed three routes with metrics 512, 1024, 2048 — this output cannot be produced by RA processing.

   **Fix:** Replaced with realistic output showing `metric 1024 ... pref {high,medium,low}` for all three routes (and added the typical `expires`/`hoplimit` fields that the kernel emits for `proto ra` routes).

3. **"Router Preference and Metrics" section** repeated the bogus mapping in code comments and implied that picking a manual metric was somehow analogous to "translating" an RA preference.

   **Fix:** Replaced the comment block with an accurate description (RA routes share metric 1024, pref is a tiebreaker) and added the correct sysctl (`net.ipv6.conf.<iface>.ra_defrtr_metric`) for users who actually want to alter the metric assigned to RA-installed routes.

4. **Summary** repeated the incorrect "maps to route metrics 512/1024/2048" claim.

   **Fix:** Rewrote the relevant sentence in the summary to describe pref as a separate attribute used as a tiebreaker, and added `ra_defrtr_metric` to the list of knobs.

## Review Notes
- The `accept_ra_rtr_pref` description is accurate: 0 disables processing of the preference field (treated as medium per RFC 4191), 1 enables it. The kernel docs note its functional default tracks `accept_ra`.
- The `ip -6 rule add` and `ip -6 route ... table` syntax in the Policy Routing section is correct.
- The Netplan YAML syntax (`routes: - to: ::/0, via: <gw>, metric: <n>`) is correct for Netplan v2.
- The post does not mention RFC 4191's "More-Specific Routes" (Route Information Option) — that is out of scope for a router-preference post and was not added.
- The author's structure, tone, and section ordering were preserved; only technically incorrect statements were corrected.
