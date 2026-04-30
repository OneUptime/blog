# Validation Summary: How to Normalize IPv6 Addresses in Log Data

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6 addressing and RFC 5952 normalization
- Python `ipaddress`
- Ruby `IPAddr`
- Logstash Ruby filter
- CEF and LEEF log parsing
- Elastic Common Schema (ECS)
- nginx and Apache log fields

## Sources Consulted
- RFC 5952: A Recommendation for IPv6 Address Text Representation — https://datatracker.ietf.org/doc/html/rfc5952
- RFC 4291: IP Version 6 Addressing Architecture — https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849: IPv6 Address Prefix Reserved for Documentation — https://www.rfc-editor.org/rfc/rfc3849.html
- Python `ipaddress` documentation — https://docs.python.org/3/library/ipaddress.html
- Ruby `IPAddr` documentation — https://docs.ruby-lang.org/en/master/IPAddr.html
- Logstash Ruby filter plugin documentation — https://www.elastic.co/docs/reference/logstash/plugins/plugins-filters-ruby
- Logstash Event API documentation — https://www.elastic.co/guide/en/logstash/current/event-api.html
- Elastic ECS `source.ip` field documentation — https://www.elastic.co/docs/reference/ecs/ecs-source
- nginx embedded variables documentation (`$remote_addr`) — https://nginx.org/en/docs/http/ngx_http_core_module.html#variables
- Apache `mod_log_config` documentation (`%h`) — https://httpd.apache.org/docs/current/en/mod/mod_log_config.html
- WHATWG URL Standard — https://url.spec.whatwg.org/

## Issues Found
- The Python example used `str(ipaddress.ip_address(...))` directly, which accepts plain IPv4 input and renders IPv4-mapped IPv6 addresses in hexadecimal form. I added an IPv6-only check and a mapped-address formatter so `::ffff:192.168.1.1` stays in RFC 5952 mixed notation.
- The Python classifier used `is_private` to detect ULAs. Current Python documentation defines `is_private` more broadly than just `fc00::/7`, so it misclassifies documentation, 6to4, Teredo, and some mapped addresses. I replaced that logic with explicit prefix checks and added `documentation` handling for `2001:db8::/32`.
- The Logstash Ruby snippet called `addr.multicast?`, which is not a documented `IPAddr` method. I changed multicast detection to `IPAddr.new("ff00::/8").include?(addr)`, added an IPv6-only guard, and used documented `ipv4_mapped?` and `private?` helpers.
- The CEF/LEEF example and validation script relied on raw `ipaddress.ip_address()` stringification, so IPv4-mapped addresses would normalize to hexadecimal form instead of `::ffff:d.d.d.d`. I aligned both snippets with the RFC 5952 special-address handling used in the main Python example.
- The introductory `2001:db8::1:443` example treated an unbracketed colon+port form as a normal representation. RFC 5952 calls that form ambiguous, so I corrected the wording.
- The SIEM field mapping table said nginx `$remote_addr` and Apache `%h` need bracket stripping. Their official docs define them as client address / remote host fields, not bracketed literals, so I corrected those normalization notes.
- The conclusion overstated JavaScript `new URL()` as a generic IPv6 normalizer and said to always store `/64`. I removed the URL claim and narrowed the `/64` recommendation to environments that actually use `/64` subnets.

## Review Notes
- Local spot checks confirmed the current Python runtime renders `::ffff:192.168.1.1` as `::ffff:c0a8:101` unless handled explicitly, which is why the mapped-address helper is necessary when the post claims RFC 5952-style output.
- Ruby was not available in the local shell, so Ruby behavior was verified from the official `IPAddr` documentation rather than by executing the snippet locally.
- The post is technically relevant and was fully correctable with targeted edits; no structural rewrite was needed.
