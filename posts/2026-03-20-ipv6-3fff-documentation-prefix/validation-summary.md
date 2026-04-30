# Validation Summary: How to Understand the 3fff::/20 Documentation Prefix

## Status
validated

## Post Type
Reference

## Technologies Covered
- IPv6 documentation prefixes
- RFC 9637
- RFC 3849
- Python `ipaddress`
- Cisco IOS IPv6 prefix lists
- Linux `ip6tables`
- `nftables`

## Sources Consulted
- RFC 9637: Expanding the IPv6 Documentation Space - https://www.rfc-editor.org/rfc/rfc9637.html
- RFC 3849: IPv6 Address Prefix Reserved for Documentation - https://www.rfc-editor.org/rfc/rfc3849.html
- IANA IPv6 Special-Purpose Address Space registry - https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- Python `ipaddress` library documentation - https://docs.python.org/3/library/ipaddress.html
- Cisco IOS IPv6 Command Reference (`ipv6 prefix-list`) - https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- nftables wiki: Configuring chains - https://wiki.nftables.org/wiki-nftables/index.php/Configuring_chains
- Local command help: `ip6tables -h`

## Issues Found
- The post said RFC 9637 reserved `3fff::/20` in August 2023. RFC 9637 was published in August 2024, and IANA lists the allocation date as 2024-07. I updated the intro and comparison table to reflect the correct timing.
- The rationale section claimed that `2001:db8::/32` being in `2000::/3` was a reason for introducing `3fff::/20`. RFC 9637 instead justifies the new prefix based on the size of modern IPv6 allocations and the need to model larger real-world deployments. I replaced that rationale with RFC-backed wording.
- The examples `3fff:10::/20` and `3fff:20::/20` are not valid /20 network prefixes because they have host bits set. I replaced them with valid sub-allocation examples.
- The Cisco example used `ip prefix-list` for IPv6. Cisco documents the IPv6-specific command as `ipv6 prefix-list`, so I corrected the syntax.
- The nftables example defined a chain without the required base-chain hook/type configuration, so it would not process traffic as shown. I updated it to a valid base-chain form and added a matching output chain. I also added the missing `2001:db8::/32` `ip6tables` examples so the Linux commands match the surrounding explanation.
- The comparison table described live use too loosely. RFC 9637 says documentation prefixes MUST NOT be used for actual traffic, so I updated that table row to match the RFC requirement.

## Review Notes
The Python example is technically correct as written and uses current standard-library APIs. Local `ip6tables` syntax was checked with `ip6tables v1.8.10 -h`; nftables syntax was verified against official nftables documentation because local `nft -c` validation was not possible in this environment due netlink permission limits.
