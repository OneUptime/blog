# Validation Summary: How to Conduct Post-Migration IPv6 Validation

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS / AAAA records
- Bash
- `dig`
- `ping`
- `curl`
- `ss`
- Python
- `dnspython`
- Prometheus HTTP API
- Grafana HTTP API

## Sources Consulted
- RFC 3596, "DNS Extensions to Support IP Version 6": https://www.rfc-editor.org/rfc/rfc3596
- curl man page: https://curl.se/docs/manpage.html
- Python `urllib.request` docs: https://docs.python.org/3/library/urllib.request.html
- Python `http.client` docs: https://docs.python.org/3/library/http.client.html
- Python `socket` docs: https://docs.python.org/3/library/socket.html
- Python `ssl` docs: https://docs.python.org/3/library/ssl.html
- dnspython resolver docs: https://dnspython.readthedocs.io/en/stable/resolver-class.html
- dnspython exceptions docs: https://dnspython.readthedocs.io/en/stable/exceptions.html
- Prometheus HTTP API docs: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Grafana Other HTTP API docs (`/api/health`): https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/other/
- Local `ping(8)` man page (iputils), `dig -h`, and `ss --help`

## Issues Found
- The checklist used `ping6`, which current iputils documents as merged into `ping`; I changed it to `ping -6` to match current documented usage.
- The local service-binding check was not reliably IPv6-specific and treated DNS port 53 as TCP-only. I changed it to query IPv6 sockets directly with `ss -6` and added a dedicated TCP/UDP check for port 53.
- The Python `urlopen()` examples used hostnames for "IPv6" and "IPv4" validation, but Python's networking stack can try both address families for hostname-based connections. I replaced those calls with a helper that connects directly to the resolved IPv4/IPv6 address while preserving TLS SNI and the `Host` header.
- The IPv6 socket example used a 2-tuple connect target; I changed it to the documented IPv6 sockaddr form `(address, port, flowinfo, scope_id)`.
- The resolver helper caught every exception broadly. I narrowed it to dnspython resolver exceptions so the example fails less opaquely while keeping the same behavior for missing records.

## Review Notes
- The Grafana `/api/health` endpoint is still documented and valid, but Grafana's latest docs classify `/api` routes as legacy in favor of newer `/apis` endpoints.
- The `/api/v1/client-ip` application check is inherently application-specific; the pattern is valid, but readers still need to point it at an endpoint their own service exposes.
