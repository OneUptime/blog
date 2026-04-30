# Validation Summary: How to Assign IPv6 Addresses via RADIUS

## Status
validated

## Post Type
Guide

## Technologies Covered
- RADIUS
- IPv6
- DHCPv6 and DHCPv6 Prefix Delegation
- FreeRADIUS
- Kea DHCP
- AAA / NAS / BNG subscriber provisioning

## Sources Consulted
- RFC 3162, "RADIUS and IPv6" - https://datatracker.ietf.org/doc/rfc3162/
- RFC 4818, "RADIUS Delegated-IPv6-Prefix Attribute" - https://www.rfc-editor.org/rfc/rfc4818
- RFC 6911, "RADIUS Attributes for IPv6 Access Networks" - https://www.rfc-editor.org/rfc/rfc6911.html
- RFC 5176, "Dynamic Authorization Extensions to RADIUS" - https://datatracker.ietf.org/doc/html/rfc5176
- FreeRADIUS documentation, "The Users File" - https://www.freeradius.org/documentation/freeradius-server/4.0.0/reference/raddb/mods-config/files/users.html
- FreeRADIUS documentation, "The update Statement" - https://www.freeradius.org/documentation/freeradius-server/3.2.9/unlang/update.html
- FreeRADIUS `radclient` manual page - https://www.freeradius.org/radiusd/man/radclient.html
- Kea Administrator Reference Manual, "Integration With External Systems - RADIUS" - https://kea.readthedocs.io/en/latest/arm/integrations.html

## Issues Found
- Several sample IPv6 literals were not valid IPv6 at all because they used non-hex text such as `home`, `wan`, `premium`, `vpn`, `radius`, and `nas`. I replaced them with valid documentation-prefix examples under `2001:db8::/32`.
- The `Framed-IPv6-Route` examples were incomplete. RFC 3162 defines the text format as `<prefix> <gateway> <metric>`, but the post omitted the required metric and one route targeted an unrelated prefix. I corrected the route strings and aligned the routed prefix with the delegated prefix example.
- The static SQL and users-file reply examples used `=` where fixed reply values are safer and more deterministic with `:=` under FreeRADIUS reply-operator semantics. I updated the static reply examples accordingly.
- The FreeRADIUS dynamic-pool section showed an `ippool`/Redis configuration and module invocation that did not line up with the documented pool-allocation model in current FreeRADIUS documentation. I replaced it with standards-based `Framed-IPv6-Pool` and `Delegated-IPv6-Prefix-Pool` examples plus a FreeRADIUS v3-style unlang policy that adds pool names when no static IPv6 values are already present.
- The Kea DHCPv6 RADIUS hook snippet used undocumented parameters (`server`, `nas-identifier`, and a synthetic `attributes` mapping for reply data) and omitted the required `libdhcp_host_cache.so` companion hook for the access service. I replaced it with the documented `libdhcp_radius.so` structure using `dictionary`, `bindaddr`, `access.servers`, and `libdhcp_host_cache.so`, and clarified which Access-Accept attributes Kea actually consumes.
- The CoA and verification examples used invalid IPv6 endpoint literals and weak session identification. I corrected the endpoints, added `-6` to `radclient` for IPv6 transport, added session/NAS identification attributes and a live `Event-Timestamp` to the CoA example per RFC 5176 guidance, and made the verification script parse the returned reply attributes more robustly.

## Review Notes
- The post is BNG-oriented, where `Framed-IPv6-Prefix` is a reasonable RADIUS attribute for WAN-side IPv6 provisioning. For DHCPv6 stateful address assignment specifically, RFC 6911 defines `Framed-IPv6-Address` and `Stateful-IPv6-Address-Pool`; the corrected Kea section now reflects that distinction.
- FreeRADIUS documentation is more readily available in 3.2.x/4.0 form than 3.0, so I cross-checked RFC behavior with current official FreeRADIUS docs and used FreeRADIUS v3 unlang syntax where version-specific syntax mattered.
