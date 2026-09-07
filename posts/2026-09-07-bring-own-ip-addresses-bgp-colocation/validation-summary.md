# Validation Summary: How to Bring Your Own IP Addresses and BGP to a Colocation Provider

## Status

validated

## Post Type

Technical operations guide. The post contains implementation details for registry preparation, BGP policy, staged deployment, and rollback, despite having no executable examples.

## Technologies Covered

- Portable IPv4 and IPv6 address space and colocation
- BGP, public ASNs, routing policy, and route filtering
- RPKI, ROAs, maxLength, and route-origin validation
- ARIN and Regional Internet Registries
- IRR route and route6 objects
- Reverse DNS, DNS TTLs, and migration dependencies
- BGP communities, authentication, and blackhole routing

## Sources Consulted

- ARIN resource request guide: https://www.arin.net/resources/guide/request/ — resource qualification and requests.
- ARIN ROA documentation: https://www.arin.net/resources/manage/rpki/roas/ — origin authorization and resource certificates.
- ARIN IRR documentation: https://www.arin.net/resources/manage/irr/ — routing registry records and provider filtering.
- ARIN reverse DNS documentation: https://www.arin.net/resources/manage/reverse/ — separate DNS delegation and PTR management.
- RFC 4271: https://www.rfc-editor.org/rfc/rfc4271 — BGP route exchange, next hops, path selection, and withdrawals.
- RFC 7454: https://www.rfc-editor.org/rfc/rfc7454 — session protection, prefix filtering, default routes, maximum-prefix limits, and community policy.
- RFC 8212: https://www.rfc-editor.org/rfc/rfc8212.html — explicit import and export policies for external BGP.
- RFC 6811, Section 2: https://www.rfc-editor.org/rfc/rfc6811 — Valid, Invalid, and NotFound origin-validation states.
- RFC 8893: https://www.rfc-editor.org/rfc/rfc8893.html — validation of the effective origin ASN after export policy.
- RFC 9319: https://www.rfc-editor.org/rfc/rfc9319 — minimal ROAs, maxLength exceptions, and advance preparation for routing changes.
- Author profile: https://github.com/nawazdhandala — checked the linked profile destination.

## Issues Found

- The post stated unconditionally that an overly restrictive maxLength makes a legitimate more-specific route RPKI-invalid. Added “unless another ROA authorizes that announcement.” RFC 6811 defines a route as Valid when at least one validated ROA payload matches its prefix, length, and origin ASN; a restrictive overlapping authorization does not override a matching one.

## Review Notes

- Registry preparation, provider authorization, IRR consistency, and separate reverse DNS management are technically sound. Provider requirements remain arrangement-specific.
- Minimal ROAs and restrained maxLength use match RFC 9319. Route-origin validation does not authenticate the complete AS path. Allow time for ROA changes to propagate before an origin change; RFC 9319 explicitly discusses this operational constraint.
- Default-deny external BGP policy, filtering, route-count limits, authentication, capacity checks, and explicit path policy are appropriate. Full-table inbound filtering must accommodate changing Internet routes; the exact policy depends on the router and provider.
- Staging, independent IPv4/IPv6 checks, external visibility checks, coordinated withdrawals, and restoration of the previous origin are reasonable deployment and rollback guidance. These are operational recommendations, not a guarantee of uninterrupted connectivity.
- DNS, stateful sessions, reputation, geolocation, and allowlists are separate migration dependencies. No universal provider timing or propagation guarantee is asserted.
- All cited documentation destinations were checked. The extensionless RFC 8212 and RFC 8893 URLs encountered retrieval errors in the browsing tool; their official .html versions loaded and were reviewed. This does not establish that the original links are broken.
- No code, terminal commands, configuration snippets, or product-version claims require execution or version-specific testing. No live BGP sessions, production announcements, or router capacity tests were performed.
- The README structure and style were preserved; only the origin-validation qualification was changed.
