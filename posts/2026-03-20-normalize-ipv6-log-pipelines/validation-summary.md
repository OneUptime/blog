# Validation Summary: How to Normalize IPv6 Addresses in Log Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 addressing (RFC 4291, RFC 5952)
- Python `ipaddress` standard library module
- Vector / VRL (Vector Remap Language)
- Logstash with embedded Ruby filter (`IPAddr` standard library)
- Fluent Bit Lua filter
- URI bracket notation for IPv6 (RFC 3986)
- IPv6 zone IDs (RFC 4007 / RFC 6874)
- IPv4-mapped IPv6 addresses

## Sources Consulted
- RFC 5952 — A Recommendation for IPv6 Address Text Representation: https://datatracker.ietf.org/doc/html/rfc5952
- RFC 4291 — IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4007 — IPv6 Scoped Address Architecture: https://datatracker.ietf.org/doc/html/rfc4007
- RFC 3986 §3.2.2 — Host (URI bracket form): https://datatracker.ietf.org/doc/html/rfc3986#section-3.2.2
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- CPython `ipaddress.py` source (`_string_from_ip_int` canonicalization): https://github.com/python/cpython/blob/3.12/Lib/ipaddress.py
- Vector VRL `replace`, `split`, `starts_with`, `downcase` reference: https://vector.dev/docs/reference/vrl/functions/
- Logstash Ruby filter plugin: https://www.elastic.co/guide/en/logstash/current/plugins-filters-ruby.html
- Ruby `IPAddr` standard library: https://docs.ruby-lang.org/en/3.3/IPAddr.html
- Fluent Bit Lua filter documentation: https://docs.fluentbit.io/manual/pipeline/filters/lua

## Issues Found
- **Python `normalize_ipv6` accepted IPv4 addresses contrary to its docstring.** The function used `ipaddress.ip_address(raw)`, which accepts both IPv4 and IPv6 input. As a result the test case `"192.168.1.1"` (commented as `IPv4 (not IPv6 - returns None)`) actually produced the string `'192.168.1.1'` rather than `None`, and the docstring claim "Returns None if the input is not a valid IPv6 address" was false. Changed `ipaddress.ip_address(raw)` to `ipaddress.IPv6Address(raw)` so the function matches its name, docstring, and the documented test-case expectation. `ipaddress.AddressValueError` is a subclass of `ValueError`, so the existing `except ValueError` clause continues to catch invalid input.

## Review Notes
- For `::FFFF:192.168.1.1`, Python's `ipaddress.IPv6Address.__str__` produces the all-hex compressed form `'::ffff:c0a8:101'`, not `'::ffff:192.168.1.1'`. This is RFC-conformant (RFC 5952 §5 makes the dotted-quad suffix a SHOULD for representation, but Python's stdlib renders the all-hex form). Readers running the test cases will see this output; the post does not show expected outputs explicitly so this is not incorrect, just worth being aware of.
- The Vector VRL and Fluent Bit Lua snippets only strip wrappers (zone ID, URI brackets, port) and lowercase — they do not produce full RFC 5952 compression. For most pipelines this is acceptable as a pre-storage normalization step, but addresses like `2001:0db8:0000:0000:0000:0000:0000:0001` will remain in expanded form unless a library like Python's `ipaddress` or Ruby's `IPAddr` is used.
- Ruby's `IPAddr#to_s` is not strictly RFC 5952 compliant in all edge cases (e.g., tie-breaking among equal-length zero runs), but it is sufficient for typical log-normalization use.
- The `':' in normalized` check used to derive `ip_version` is correct: IPv4-mapped IPv6 addresses contain colons and will be reported as version 6, which matches their actual protocol semantics.
- VRL's `replace` supports `$1` capture-group substitution via Rust's regex crate; the regex `\[([0-9a-fA-F:]+)\](?::\d+)?` is supported syntax.
