# Validation Summary: How to Understand IPv6 Routing Table Structure

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- IPv6
- Linux `iproute2`
- Linux routing tables
- Routing policy database (RPDB)
- Router Advertisements / Neighbor Discovery

## Sources Consulted
- Local `iproute2` 6.1.0 documentation: `ip-route(8)`, `ip-rule(8)`, and `ip(8)`
- Local `iproute2` command output: `ip -Version`, `ip -6 route help`, `ip -6 route show table all`, and `ip -d -6 route show table all`
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4191, Default Router Preferences and More-Specific Routes: https://www.rfc-editor.org/rfc/rfc4191

## Issues Found
- The post described route `Flags` as `U`, `G`, and `H`, which are legacy `route`/`netstat`-style indicators rather than the normal `ip -6 route` output. I replaced that field with Linux route scope and IPv6 route preference attributes.
- The command `ip -6 route show detail` is invalid in current `iproute2`. I changed it to `ip -d -6 route show table all`, which is the supported detailed form.
- The example route output mixed older or non-current output forms with current Linux `iproute2` behavior, including `::/0` instead of `default` and a loopback example without the `local` table context. I updated the examples to current, valid forms.
- The post said Linux supports multiple routing tables `0–255`, which is incorrect. I corrected this to named or numeric table IDs, noted the built-in `local` (255), `main` (254), and `default` (253) tables, and clarified that `all` is a selector rather than a real table.
- The route lookup section implied Linux selects routes using longest-prefix match alone. I corrected this to explain that Linux applies routing policy rules first, then performs longest-prefix match within the selected table.
- The `scope global` explanation incorrectly said it means a destination requires a gateway. I replaced it with a scope-accurate explanation.

## Review Notes
- The examples are Linux-specific and now reflect `iproute2` output rather than legacy `route` tooling.
- Exact displayed fields can vary somewhat by `iproute2` version and whether `-d` is used, but the corrected commands and explanations are valid for the local `iproute2` 6.1.0 installation used during review.
