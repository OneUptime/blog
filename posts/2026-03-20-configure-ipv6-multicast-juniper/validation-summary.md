# Validation Summary: How to Configure IPv6 Multicast on Juniper Routers

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Juniper Junos OS
- PIM Sparse Mode for IPv6 (PIMv6)
- MLD (Multicast Listener Discovery) v2
- Embedded RP (RFC 3956)
- Junos firewall filters and policers
- Multicast scope policies / administrative scoping
- Junos `protocols pim`, `protocols mld`, `routing-options multicast`, `policy-options`, `firewall` hierarchies

## Sources Consulted
- [Configuring Static RP — Junos OS Multicast Protocols](https://www.juniper.net/documentation/us/en/software/junos/multicast/topics/topic-map/mcast-static-rp.html)
- [Configuring Embedded RP — Junos OS](https://www.juniper.net/documentation/us/en/software/junos/multicast/topics/topic-map/mcast-pim-embedded-rp.html)
- [embedded-rp statement reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/embedded-rp-edit-protocols-pim.html)
- [rp statement reference (protocols pim)](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/rp-edit-protocols-pim.html)
- [family (Local RP) statement reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/statement/family-edit-protocols-pim-local.html)
- [\[edit protocols pim\] hierarchy reference](https://www.juniper.net/documentation/en_US/junos12.3/topics/reference/statement-hierarchy/protocols-pim.html)
- [Examples: Configuring Administrative Scoping](https://www.juniper.net/documentation/us/en/software/junos/multicast/topics/topic-map/mcast-admin-scoping.html)
- [Example: Using a Scope Policy for Multicast Scoping](https://www.juniper.net/documentation/en_US/junos13.2/topics/example/mcast-policy-scope.html)
- [Configuring MLD — Junos OS](https://www.juniper.net/documentation/us/en/software/junos/multicast/topics/topic-map/mcast-mld.html)
- [show mld group command reference](https://www.juniper.net/documentation/us/en/software/junos/multicast/subscriber-mgmt-services/topics/ref/command/show-mld-group.html)
- [show pim rps command reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-pim-rps.html)
- [show pim interfaces command reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-pim-interfaces.html)
- [show pim statistics command reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-pim-statistics.html)
- [show pim join command reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-pim-join.html)
- [show multicast route command reference](https://www.juniper.net/documentation/us/en/software/junos/cli-reference/topics/ref/command/show-multicast-route.html)
- [Supported IP Multicast Protocol Standards (Junos OS)](https://www.juniper.net/documentation/us/en/software/junos/multicast/topics/concept/multicast-ip.html)
- [RFC 3810 — Multicast Listener Discovery v2](https://datatracker.ietf.org/doc/html/rfc3810)
- [RFC 3956 — Embedding the Rendezvous Point Address in an IPv6 Multicast Address](https://datatracker.ietf.org/doc/html/rfc3956)

## Issues Found

1. **Misplaced `family inet6` keyword on `rp static` and `rp local` commands.**
   - The post wrote commands such as `set protocols pim family inet6 rp static address 2001:db8::rp`. In Junos, the `[edit protocols pim rp static]` hierarchy takes the address directly; the address itself determines the family, and there is no `family inet6` container at the top of `protocols pim` for `rp` configuration. (The valid `family` placement under PIM is at `protocols pim interface <name> family ...` for per-interface enable/disable, or under `protocols pim rp local family ...`.)
   - **Fix:** rewrote the static RP commands as `set protocols pim rp static address 2001:db8::rp` (and the group-ranges variant accordingly), in both the "Enabling IPv6 Multicast Routing" and "Configuring Static RP" sections, and in the comparison table.

2. **The "Configuring BSR for Dynamic RP Discovery" section was fundamentally wrong for IPv6 PIM in Junos.**
   - Junos OS does not support PIM Bootstrap Router (BSR) or Auto-RP for IPv6 — only static RP and embedded RP (RFC 3956) are available. (See "Supported IP Multicast Protocol Standards" and "Configuring Static RP" — both state that "automatic RP announcement and bootstrap routers are not available with IPv6.")
   - **Fix:** Replaced the section with "Configuring Embedded RP for Dynamic RP Discovery", added a sentence calling out the BSR/Auto-RP limitation, and showed the correct `set protocols pim rp embedded-rp` / `group-ranges` / `maximum` syntax with the correct default group range (FF70::/12 to FFF0::/12).

3. **`scope-policy` was placed under the wrong hierarchy.**
   - The post used `set protocols pim family inet6 scope-policy SCOPE_POLICY`. In Junos, multicast administrative scope policies are applied at `[edit routing-options multicast]`, not under `protocols pim`.
   - **Fix:** changed the command to `set routing-options multicast scope-policy SCOPE_POLICY`.

4. **`show mld group inet6` is not a valid Junos command.**
   - MLD is inherently IPv6, so the Junos `show mld group` command does not accept an `inet6` argument (per the Junos CLI reference, the valid arguments are `brief | detail`, `group-name`, and `logical-system`).
   - **Fix:** changed `run show mld group inet6` to `run show mld group` in the verification section, the comparison table, and the summary.

5. **`show multicast pim inet6 statistics` is not a valid Junos command.**
   - The valid forms are `show pim statistics inet6` (already present in the verification section) or `show multicast statistics`.
   - **Fix:** changed the debugging section command to `run show multicast statistics` and updated the comment.

6. **`protocol 17` in an `inet6` firewall filter should be `next-header 17`.**
   - For Junos `family inet6` firewall filters, the IPv4 `protocol` match keyword does not apply; the IPv6 equivalent is `next-header` (matching the IPv6 Next Header field defined in RFC 8200, with values like 17 for UDP).
   - **Fix:** changed `protocol 17` to `next-header 17` in the multicast rate-limit filter.

7. **Summary line referenced BSR as an IPv6 RP option.**
   - The summary said "configure the RP (static or BSR)", which is incorrect for Junos IPv6.
   - **Fix:** updated the summary to read "static or embedded RP, since BSR is not supported for IPv6 in Junos".

## Review Notes

- The MLD interface statements `query-interval`, `query-last-member-interval`, `robust-count`, `group-limit`, and `group-policy` are valid Junos statements at `[edit protocols mld interface <name>]`. Defaults match what the post shows (query-interval 125 s, robust-count 2, last-member-query-interval 1 s).
- The `show pim neighbors inet6`, `show pim interfaces inet6`, `show pim rps inet6`, `show pim join inet6`, `show pim statistics inet6`, `show multicast route inet6`, and `show multicast rpf inet6` commands are all valid per the Junos CLI reference.
- The `class-of-service traffic-control-profiles ... scheduler-map ...` snippet is a fragment that would not, by itself, rate-limit multicast on an interface — it needs to be applied via `interfaces <name> unit <n> family inet6 ... output-traffic-control-profile`. The firewall-filter / policer block underneath does work on its own as a per-interface multicast rate-limiter once attached to an interface filter, so the snippet is illustrative rather than a complete recipe; left as-is since fixing the CoS fragment would require expanding the section.
- The `traceoptions` configuration is correct Junos syntax. `run show log pim-trace.log | last 50` is a valid pipe (Junos uses `| last <n>` to show the last N lines).
- The `route-filter ff05::/16 orlonger` syntax inside a `policy-options policy-statement` is correct Junos.
- The post is written generically against "JunOS" without targeting a specific Junos OS major release. The corrected commands are stable across modern Junos OS releases (≥ 10.0 for the `inet6` show-command arguments, and embedded RP has been supported on M/MX/T-series for many years).
