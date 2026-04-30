# Validation Summary: How to Document an IPv6 Address Plan

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and subnetting
- IP address management (IPAM)
- YAML
- Python `ipaddress`
- PyYAML
- NetBox REST API
- Reverse DNS and `ip6.arpa`
- BIND zone delegation

## Sources Consulted
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/info/rfc3849
- RFC 3596, DNS Extensions to Support IP Version 6: https://www.rfc-editor.org/rfc/rfc3596
- RFC 6164, Using 127-Bit IPv6 Prefixes on Inter-Router Links: https://www.rfc-editor.org/rfc/rfc6164
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421
- Python standard library `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- PyYAML documentation for `safe_load`: https://pyyaml.org/wiki/PyYAMLDocumentation
- NetBox REST API documentation: https://netbox.readthedocs.io/en/stable/integrations/rest-api/
- NetBox Prefix model documentation: https://netbox.readthedocs.io/en/stable/models/ipam/prefix/
- NetBox v4.5.1 source for IPAM prefix filters: https://github.com/netbox-community/netbox/blob/v4.5.1/netbox/ipam/filtersets.py

## Issues Found
- The sample IPv6 prefixes and addresses used `corp` as a hextet, which is invalid because IPv6 hextets are hexadecimal. I replaced those examples with valid documentation addresses under `2001:db8::/32` per RFC 3849 so the YAML, Python validator input, NetBox API payload, and reverse-DNS example are syntactically valid.
- The NetBox prefix creation example used the older `site` field. Current stable NetBox uses `scope_type` and `scope_id` for prefix scope, so I updated the payload to match the current API and prefix model.
- The NetBox examples used the legacy `Authorization: Token` style. I updated them to `Authorization: Bearer` to reflect current NetBox v2 token usage.
- The reverse-DNS example was incorrect because it derived an `ip6.arpa` name from an invalid IPv6 prefix. I replaced it with the correct nibble-reversed zone for the updated `/64` example and corrected the BIND delegation example accordingly.
- The point-to-point example used the `::/127` pair inside a `/64`. RFC 6164 recommends avoiding addresses with all zeros in the rightmost 64 bits when numbering `/127` links from a `/64`, so I moved the example to `::2/127` with `::2` and `::3`.

## Review Notes
- The Python validator example is syntactically correct and works with the corrected YAML. I verified it by extracting the code block and running it against the updated sample plan.
- The NetBox `within` filter shown in the list example is present in current NetBox source and is appropriate for listing child prefixes within a parent.
- The article’s statement about 65,536 `/64` subnets in a `/48` is correct.
