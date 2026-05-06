# Validation Summary: How to Check If an IPv6 Address Is in a Special-Purpose Range

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- IANA IPv6 special-purpose address registry
- Python `ipaddress`
- Flask
- RFC-based network classification

## Sources Consulted
- IANA IPv6 Special-Purpose Address Space: https://www.iana.org/assignments/iana-ipv6-special-registry
- IANA IPv6 Special-Purpose Address Space CSV: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry-1.csv
- IANA IPv6 Address Space: https://www.iana.org/assignments/ipv6-address-space
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Flask documentation on JSON responses: https://flask.palletsprojects.com/en/stable/patterns/javascript/
- RFC 7526, "Deprecating the Anycast Prefix for 6to4 Relay Routers": https://www.rfc-editor.org/rfc/rfc7526.html

## Issues Found
- The post claimed to cover all IANA special-purpose IPv6 ranges, but the registry snapshot was incomplete. I added the missing current entries, including `100:0:0:1::/64`, `2001:1::3/128`, `2001:3::/32`, `2001:4:112::/48`, `2001:30::/28`, `2620:4f:8000::/48`, and the umbrella `2001::/23` protocol-assignment block.
- Several registry flags did not match the IANA registry. I corrected values such as `::1/128` (loopback is not valid as transit source/destination), `64:ff9b::/96` (globally reachable is `True` in the registry), `5f00::/16` (globally reachable is `False`), and ranges where IANA marks values as `N/A`, such as Teredo and 6to4.
- The notes for Teredo and 6to4 said they were deprecated. That was inaccurate as written. I removed those claims and aligned the wording with the registry and RFC 7526, which deprecates 6to4 anycast rather than the `2002::/16` prefix itself.
- The fallback path labeled every non-match as `Global Unicast`, which is incorrect for addresses such as multicast (`ff00::/8`) or deprecated site-local (`fec0::/10`). I changed the fallback to `Not in IANA Special-Purpose Registry` and updated the guidance accordingly.
- The Flask example derived `safe_for_production` from the classifier’s boolean fields alone. After fixing the fallback behavior, I updated the example to check for non-special addresses in the `2000::/3` global-unicast space instead, which avoids false positives for multicast and site-local addresses.
- The classifier needed longest-prefix matching because `2001::/23` contains more-specific special-purpose allocations. I updated the code to sort networks by prefix length before matching.

## Review Notes
- The code blocks were syntax-checked after editing.
- The registry is current as of the validation date, but IANA can add or revise entries later, so this post should be revalidated if the registry changes.
- IANA notes that special-purpose registry entries do not guarantee routability in every local or global deployment context; the post now reflects that more carefully.
