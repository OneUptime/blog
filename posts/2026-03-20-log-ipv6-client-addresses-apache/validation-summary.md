# Validation Summary: How to Log IPv6 Client Addresses in Apache

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- IPv6
- Apache access logging (`mod_log_config`)
- Apache conditional environment matching (`mod_setenvif`)
- Apache proxy IP restoration (`mod_remoteip`)
- Shell log analysis with `awk`, `grep`, `sort`, `uniq`, `head`
- Python `ipaddress`

## Sources Consulted
- Apache HTTP Server `mod_log_config`: https://httpd.apache.org/docs/current/en/mod/mod_log_config.html
- Apache HTTP Server `mod_setenvif`: https://httpd.apache.org/docs/current/en/mod/mod_setenvif.html
- Apache HTTP Server `mod_remoteip`: https://httpd.apache.org/docs/2.4/en/mod/mod_remoteip.html
- Apache HTTP Server log files guide: https://httpd.apache.org/docs/2.4/en/logs.html
- Apache HTTP Server binding and IPv6 behavior: https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server `mod_logio`: https://httpd.apache.org/docs/current/mod/mod_logio.html
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- Python `ipaddress` library: https://docs.python.org/3/library/ipaddress.html
- Local CLI help checked during review: `grep --help`, `awk --help`

## Issues Found
- The post labeled `%O` as part of the default combined Apache log format. I changed those examples to `%b` because the standard combined format uses `%b`, while `%O` comes from `mod_logio`.
- The post described `%h` as always being the client IP address. I corrected that to match Apache documentation: `%h` is the remote host, and it logs the numeric client IP when `HostnameLookups Off` is in effect, which is the default.
- The sample entry for an IPv4-mapped address (`::ffff:192.168.1.10`) was inaccurate for Apache logging. Apache documents that IPv4-over-IPv6 mapped addresses are recorded in IPv4 representation, so I changed the example and summary text accordingly.
- The custom log format used `%{IPV}n`, which logs an Apache note, not an environment variable. I changed it to `%{IPV}e` because the value is set with `SetEnvIf`.
- The IPv4 detection regex `^[0-9]` was incorrect because many IPv6 addresses also start with a digit, which could misclassify or double-log requests. I replaced it with an IPv4 dotted-quad regex in both Apache config examples and the log-counting shell example.
- The proxy example used `2001:db8:lb::/64`, which is not valid IPv6 syntax because `lb` is not hexadecimal. I replaced it with the valid documentation prefix `2001:db8:100::/64`.
- The `mod_remoteip` section said `%h` logs the real client IP after proxy processing, but the snippet actually used `%a`, and `%a` is the Apache token documented for the client IP address. I corrected the explanation to match the directive and Apache docs.
- The Python analysis snippet used `strip('::ffff:')`, which is not a safe way to remove a prefix because `strip()` removes any listed characters from both ends. I replaced that logic with `ipaddress.ip_address()` plus an `IPv6Address` type check.
- The shell example used `head -20`. I changed it to `head -n 20` for clearer and more standard flag usage.

## Review Notes
- The examples use `${APACHE_LOG_DIR}`, which is common on Debian/Ubuntu-style Apache packaging but is not a universal Apache default variable.
- The sections that rely on `%h` assume `HostnameLookups Off` if the goal is to log literal client IP addresses rather than reverse-resolved hostnames.
