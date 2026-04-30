# Validation Summary: How to Understand the IANA IPv6 Special-Purpose Address Registry

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- IANA IPv6 Special-Purpose Address Space registry
- Python `ipaddress`
- RFC-based network protocol documentation

## Sources Consulted
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/
- RFC 6890: https://www.rfc-editor.org/rfc/rfc6890
- RFC 4291: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 6052: https://www.rfc-editor.org/rfc/rfc6052
- RFC 8215: https://www.rfc-editor.org/rfc/rfc8215.html
- RFC 6666: https://www.rfc-editor.org/rfc/rfc6666.html
- RFC 3056: https://www.rfc-editor.org/rfc/rfc3056
- RFC 3849: https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 9602: https://www.rfc-editor.org/rfc/rfc9602.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The registry field descriptions for `Source`, `Destination`, `Forwardable`, and `Globally Reachable` were simplified in ways that changed their RFC 6890 meaning. I updated them to match the official semantics used by IANA.
- Several properties in the selected prefix examples did not match the current IANA registry. I corrected the `::1/128` source/destination flags, the `64:ff9b::/96` global reachability value, the `2001::/32` and `2002::/16` `Globally Reachable` values, and the `5f00::/16` global reachability value, and I added `64:ff9b:1::/48` for the local-use translation prefix referenced later in the post.
- The Python classifier covered only a subset of current registry entries and returned `"Global Unicast"` for every non-match. That could misclassify active special-purpose ranges and addresses that are not global unicast at all, such as multicast. I expanded the checks to cover the current IANA entries used in practice and changed the fallback to `"Not in the special-purpose registry"`.
- The application-validation guidance said web apps should not store or route to non-globally-reachable addresses. That is too absolute because internal systems may legitimately store such addresses. I reworded the guidance to focus on validating whether an address is appropriate for public internet-facing use.
- The introduction used only the legacy registry name. I updated it to note the current IANA page name while preserving the article’s framing.

## Review Notes
- The IANA registry was last updated on 2025-10-09 when checked during this review, so any static prefix list in example code should be periodically refreshed against the live registry.
