# Validation Summary: How to Set Up HAProxy Logging with IPv4 Client Information

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- rsyslog / syslog
- Linux shell utilities (`tail`, `grep`, `cut`, `sort`, `uniq`, `head`)

## Sources Consulted
- HAProxy Configuration Manual 3.2: https://docs.haproxy.org/3.2/configuration.html
- rsyslog `programname` property reference: https://docs.rsyslog.com/doc/reference/properties/message-programname.html
- rsyslog basic structure and modern RainerScript examples: https://docs.rsyslog.com/doc/configuration/basic_structure.html
- rsyslog common configuration mistakes: https://docs.rsyslog.com/doc/faq/common-config-mistakes.html

## Issues Found
- The rsyslog example mixed legacy shorthand with a conditional rule. I replaced it with a current RainerScript block using `action(type="omfile" ...)` and `stop`, which matches current rsyslog documentation.
- The `option dontlognull` comment implied the option is specifically for health checks. I corrected it to describe the documented behavior: it suppresses logs for connections where no data was transferred, such as probes.
- The custom `log-format` comment and specifier descriptions were too imprecise. I corrected `%ci` to client source IP address, `%B` to bytes sent from server to client, and `%Tr` to the time to receive the complete response headers from the server.
- The `X-Forwarded-For` section described the header as the real client IP without qualification. I changed it to describe logging the forwarded header value from a trusted upstream proxy or load balancer.
- The request-counting command extracted field `$6`, which is the timer field in standard HAProxy HTTP logs rather than the client IP. I replaced it with a regex-based pipeline that extracts the leading `client_ip:port` token from HAProxy HTTP log lines.

## Review Notes
- `%ci` logs the client source address for both IPv4 and IPv6. The post remains valid for IPv4 examples, but the HAProxy format specifier itself is not IPv4-only.
