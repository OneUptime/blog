# Validation Summary: How to Understand IPv6 Address Block Properties

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 special-purpose addressing
- IANA IPv6 Special-Purpose Address Space registry
- RFC 6890 and RFC 8190
- `ip6tables`
- Python dictionary examples

## Sources Consulted
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 6890, Special-Purpose IP Address Registries: https://www.rfc-editor.org/rfc/rfc6890
- RFC 8190, Updates to the Special-Purpose IP Address Registries: https://www.rfc-editor.org/rfc/rfc8190
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052.html
- RFC 9602, Segment Routing over IPv6 (SRv6) Segment Identifiers in the IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc9602.html
- Local `ip6tables --help` output (`ip6tables v1.8.10 (nf_tables)`) for command syntax validation

## Issues Found
- The introduction said RFC 6890 defines four boolean properties for each block. I updated it to reflect RFC 8190 and clarified that these properties apply to packets that transit between devices.
- The loopback example under `Destination` was incorrect. `::1/128` is not a valid destination for transiting packets, so I changed it from `True` to `False`.
- The `Forwardable` explanation was imprecise. I changed it to match the registry definition, which is based on whether routers may forward packets whose destination is in the block.
- The `Globally Reachable` explanation used looser wording than RFC 8190 and incorrectly marked `5f00::/16` as globally reachable. I aligned the wording with the RFC and changed `5f00::/16` to `False`.
- The section heading `Complete Properties Table` was inaccurate because the post lists only a subset of the current IANA registry. I renamed it to `Selected Properties Table`.
- The properties table had incorrect values for `::1/128`, `64:ff9b::/96`, `2001::/32`, and `5f00::/16`. I corrected them to match the current IANA registry, including `Teredo` `globally_reachable` = `"N/A"`.

## Review Notes
- The `ip6tables` examples are syntactically valid on the local system.
- The IANA registry notes that listed prefixes are not guaranteed routability in every local or global context; the registry properties are policy signals, not a full routing guarantee.
