# Validation Summary: How to Set Up HAProxy Stats Page Restricted to Specific IPv4 Addresses

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- HAProxy configuration
- HAProxy Runtime API / stats socket
- HAProxy Prometheus exporter
- Prometheus scrape configuration
- Bash CLI usage with `curl`, `grep`, `socat`, and `column`
- Python 3 UNIX socket access

## Sources Consulted
- HAProxy Configuration Manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/
- HAProxy Prometheus metrics tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/alerts-and-monitoring/prometheus/
- HAProxy Runtime API installation: https://www.haproxy.com/documentation/haproxy-runtime-api/installation/
- HAProxy Runtime API `show stat` reference: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-stat/
- HAProxy Runtime API `show info` reference: https://www.haproxy.com/documentation/haproxy-runtime-api/reference/show-info/
- `column(1)` local CLI help via `column --help`

## Issues Found
- The stats and Prometheus frontend examples omitted `mode http` even though the referenced directives are HTTP-context directives. Added `mode http` so the snippets are self-contained and valid outside an HTTP defaults section.
- The “existing frontend” example incorrectly defined `server localhost 127.0.0.1:80` as if the stats page needed to proxy back into HAProxy. Removed that line because `stats uri` is handled directly by HAProxy when the request reaches the stats backend.
- The Runtime API `socat` examples used `/run/haproxy/admin.sock` without the documented `unix-connect:` address type. Updated the commands to `socat stdio unix-connect:/run/haproxy/admin.sock` and added the required `stats socket` prerequisite line.
- The Python socket example read only a single `recv(65536)` buffer, which can truncate large `show stat` output. Reworked it to read in a loop before printing.
- The `stats show-node` comment said it shows the hostname; corrected it to “node name” to match HAProxy terminology.
- The `stats hide-version` comment incorrectly said it hides sensitive server names. Corrected it to say it hides the HAProxy version.
- The custom auth example implied that two `stats auth` lines create separate read-only and full-admin roles. Clarified that both entries simply authenticate access unless combined with `stats admin` and auth ACL logic.

## Review Notes
- The Prometheus exporter is available starting in HAProxy 2.0, which matches the post.
- The admin socket examples assume the runtime socket path is `/run/haproxy/admin.sock`; that path must match the actual `stats socket` setting on the target system.
- The post intentionally focuses on IPv4 ACLs. Equivalent IPv6 restrictions would require separate ACL entries and are outside the article’s scope.
