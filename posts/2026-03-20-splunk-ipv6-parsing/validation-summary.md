# Validation Summary: How to Parse IPv6 Addresses in Splunk

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Splunk Enterprise and Splunk Cloud Platform
- Splunk SPL
- Splunk `props.conf`, `transforms.conf`, and `commands.conf`
- Splunk CSV lookups and CIDR matching
- Python `ipaddress`
- IPv6 address formats and special-purpose prefixes

## Sources Consulted
- Splunk `cidrmatch()` evaluation function documentation: https://help.splunk.com/en/splunk-enterprise/search/spl-search-reference/9.4/evaluation-functions/comparison-and-conditional-functions
- Splunk `lookup` command documentation, including IPv6 CIDR lookup examples: https://help.splunk.com/en/splunk-cloud-platform/spl-search-reference/10.3.2512/search-commands/lookup
- Splunk `transforms.conf` configuration reference for lookup `match_type = CIDR(...)`: https://help.splunk.com/en/splunk-enterprise/administer/admin-manual/10.2/configuration-file-reference/10.2.0-configuration-file-reference/transforms.conf
- Splunk `props.conf` configuration reference for inline `EXTRACT-` field extractions: https://help.splunk.com/en/data-management/splunk-enterprise-admin-manual/9.0/welcome-to-splunk-enterprise-administration/configuration-file-reference/9.0.5-configuration-file-reference/props.conf
- Splunk `script` command and custom search command requirements: https://help.splunk.com/en/splunk-cloud-platform/search/search-reference/10.1.2507/search-commands/script
- Splunk `commands.conf` configuration reference: https://help.splunk.com/en/data-management/splunk-enterprise-admin-manual/10.0/configuration-file-reference/10.0.0-configuration-file-reference/commands.conf
- Splunk SPL comments documentation: https://help.splunk.com/en/splunk-enterprise/search/search-manual/9.3/using-the-search-app/add-comments-to-searches
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 5952, A Recommendation for IPv6 Address Text Representation: https://datatracker.ietf.org/doc/html/rfc5952
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- Cisco ASA syslog message documentation showing `IP_Address/port` formatting: https://www.cisco.com/c/en/us/td/docs/security/asa/syslog/asa-syslog/syslog-messages-400000-to-450001.html

## Issues Found
- The ingest-time `INGEST_EVAL` example was a no-op and referenced a search-time field as though it were available at ingest time. I removed that transform and made the section a correct CIDR lookup definition.
- The IPv6 prefix lookup was missing `match_type = CIDR(prefix)`, so it would have performed exact string matching instead of subnet matching. I added the CIDR match type.
- Several SPL examples used SQL-style `--` comments and a leading pseudo-command line, which are not valid SPL. I split those examples into runnable SPL snippets and removed the invalid comment syntax.
- The basic IPv6 regex examples did not handle IPv4-mapped addresses, brackets, or slash-delimited port formats. I widened the candidate extraction patterns while keeping validation/normalization in SPL and Python.
- The `/64` prefix extraction attempted to derive a subnet directly from compressed text, which fails for compressed IPv6 addresses. I changed it to normalize to exploded form first, then derive the prefix.
- The subnet matching examples used invalid IPv6 literals such as `2001:db8:corp::/48` and `2001:db8:dmz::/48`. I replaced them with valid documentation prefixes.
- The address type classification used string prefixes like `^fc`, which missed `fd00::/8` ULA addresses and was less accurate than CIDR matching. I changed classifications to use `cidrmatch()`.
- The custom Python command was invoked with `script normalize_ipv6.py src_ip`, but the SDK `Option(require=True)` example requires a registered custom command and `field=...` syntax. I added a `commands.conf` stanza and updated the SPL invocation to `normalizeipv6 field=src_ip`.
- The Python normalization example used `str(ipaddress.ip_address(addr))`, which returns compressed text and does not expand addresses. I updated the command to support both `format=compressed` and `format=exploded`.
- The bracket/port cleanup SPL could turn `[2001:db8::1]:443` into `2001:db8::1:443`, changing the address. I fixed the extraction to capture the bracketed address before removing port information.

## Review Notes
The regex field extractions remain candidate extractors rather than full RFC-validating IPv6 parsers. That is appropriate for Splunk search-time extraction as long as downstream SPL uses `cidrmatch()` or the Python custom command for validation and normalization.
