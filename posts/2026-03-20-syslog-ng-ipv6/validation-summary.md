# Validation Summary: How to Configure syslog-ng for IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- syslog-ng OSE
- IPv6
- Syslog over UDP and TCP
- Linux command-line tools: logger and netcat
- HTTP forwarding to Elasticsearch

## Sources Consulted
- syslog-ng OSE network() source options: https://syslog-ng.github.io/admin-guide/060_Sources/070_Network/000_Network_source_options
- syslog-ng OSE network() destination options: https://syslog-ng.github.io/admin-guide/070_Destinations/150_Network/000_Network_destination_options.html
- syslog-ng OSE HTTP destination options: https://syslog-ng.github.io/admin-guide/070_Destinations/081_http/000_http_options
- syslog-ng OSE netmask6() filter documentation: https://syslog-ng.github.io/admin-guide/080_Log/030_Filters/005_Filter_functions/008_netmask6
- syslog-ng OSE conditional rewrite documentation: https://syslog-ng.github.io/admin-guide/110_Template_and_rewrite/001_Modifying_messages/011_Conditional_rewrite.html
- syslog-ng OSE manual page for --syntax-only: https://syslog-ng.github.io/admin-guide/190_The_syslog-ng_manual_pages/005_syslog-ng_manual
- Local `logger --help` output from util-linux logger.
- Local `nc -h` output from OpenBSD netcat.

## Issues Found
- The syslog-ng examples used underscored option names such as `ip_protocol()`, `max_connections()`, `use_dns()`, `use_fqdn()`, `keep_hostname()`, and `chain_hostnames()`. Updated them to the documented hyphenated names: `ip-protocol()`, `max-connections()`, `use-dns()`, `use-fqdn()`, `keep-hostname()`, and `chain-hostnames()`.
- The `network()` snippets used comma separators between driver options. Updated the snippets to syslog-ng's documented whitespace-separated option syntax.
- The HTTP destination used `template()` for the request payload. Updated it to `body()`, which is the documented option for `http()` destination request bodies.
- The `netmask6("::/0")` examples used a prefix length outside the documented `netmask6()` range. Replaced the "any IPv6" filter with `netmask6("::/1") or netmask6("8000::/1")`.
- The primary IPv6 routing log path only excluded loopback and did not explicitly require IPv6 source addresses, even though `ip-protocol(6)` listeners can also receive IPv4. Added `filter(f_from_ipv6);` to that log path.
- The rewrite example used an `if` block inside a `rewrite` object. Replaced it with documented conditional rewrite syntax using `condition()`.
- The `logger` example used an unsupported `--ipv6` option. Replaced it with `logger -n "::1" -P 5140 -d --rfc5424`, which uses an IPv6 literal address and options available in the local util-linux logger.
- The netcat example did not force IPv6 and sent an RFC3164-style message to a source configured with `flags(syslog-protocol)`. Updated it to use `nc -6 -u -w 1` and an RFC5424-formatted test message.
- The conclusion referenced `ip_protocol(6)`. Updated it to `ip-protocol(6)`.

## Review Notes
The local environment does not have `syslog-ng` installed, so I could not run `syslog-ng --syntax-only` against the final snippets. The command itself was verified against the official syslog-ng manual, and the configuration syntax was checked against the official driver, filter, and rewrite documentation.
