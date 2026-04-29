# Validation Summary: How to Implement IRR (Internet Routing Registry) Filtering for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Internet Routing Registry (IRR)
- BGP
- IPv6
- RPSL (`route6`, `aut-num`, `as-set`)
- BGPq4
- FRRouting (FRR / `vtysh`)
- Cron
- RPKI / Route Origin Validation (ROV)

## Sources Consulted
- RFC 4012, Routing Policy Specification Language next generation (RPSLng): https://datatracker.ietf.org/doc/html/rfc4012
- RIPE Database documentation, including `route6` object attributes and authorization rules: https://docs.db.ripe.net/all-docs-combined
- BGPq4 official repository and documentation: https://github.com/bgp/bgpq4
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting `vtysh` documentation: https://docs.frrouting.org/en/latest/vtysh.html
- FRRouting developer documentation for `vtysh -f`: https://docs.frrouting.org/projects/dev-guide/en/latest/vtysh.html
- ARIN IRR overview and FAQ: https://www.arin.net/resources/manage/irr/ and https://www.arin.net/resources/manage/irr/irr_faq/
- RFC 6483, Validation of Route Origination Using the Resource Certificate Public Key Infrastructure (PKI) and Route Origin Authorizations (ROAs): https://datatracker.ietf.org/doc/rfc6483/
- RFC 7115, Origin Validation Operation Based on the Resource Public Key Infrastructure (RPKI): https://www.rfc-editor.org/rfc/rfc7115

## Issues Found
- The RIPE `route6` example incorrectly included `created:` and `last-modified:` as user-supplied fields. RIPE documents those attributes as generated, so they were removed from the template.
- The source-build instructions used the wrong upstream GitHub repository URL and skipped the required `./bootstrap` step for repository builds. The commands were corrected to match the official BGPq4 build workflow.
- The `bgpq4` command examples used an invalid `-Z` flag and unsupported user-defined format tokens such as `%p`. They were replaced with documented built-in `bgpq4` options (`-l`, `-s`, and `-b`) that generate valid named IPv6 filters.
- The automation script would have accumulated or mismatched prefix-list entries because it generated raw prefix-list lines instead of full named list replacements. It was changed to use `bgpq4` named output so FRR receives a complete refreshable list.
- The script used `:` as a field delimiter while also needing to carry IPv6 peer addresses, which would break parsing. The peer tuple format was corrected to use `|`.
- The FRR refresh step used a blanket `clear bgp ipv6 unicast * soft in` example that was not a good documented fit for the surrounding configuration. It was replaced with a per-peer inbound route refresh after each updated filter is applied.
- The FRR configuration snippet used an invalid example IPv6 address (`2001:db8:peer1::1`). It was corrected to valid documentation-prefix IPv6 addresses.
- The conclusion overstated IRR plus RPKI as "comprehensive" protection. It was narrowed to route-origin protection language that matches what IRR filtering and RPKI ROV actually provide.

## Review Notes
- BGPq4 upstream recommends constraining IRR query sources with `-S` to authoritative databases where possible. The post is now technically correct, but source selection would be a worthwhile future hardening improvement.
- Debian/Ubuntu package installation is valid, but distribution package versions may lag the upstream BGPq4 release cadence.
