# Validation Summary: How to Monitor RPKI Validation Status for IPv6 Prefixes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RPKI (Resource Public Key Infrastructure)
- IPv6
- Routinator (NLnet Labs RPKI validator)
- Routinator HTTP API (`/api/v1/validity`)
- RTR (RPKI-to-Router) protocol
- Python (`requests`, `prometheus_client`)
- Prometheus / PromQL
- Grafana
- RIPE Stats Data API (`rpki-validation`)
- BGP routing security / ROA (Route Origin Authorization)

## Sources Consulted
- Routinator API endpoints reference: https://routinator.docs.nlnetlabs.nl/en/stable/api-endpoints.html
- Routinator validity checker docs: https://routinator.docs.nlnetlabs.nl/en/stable/validity-checker.html
- Routinator manual page (server subcommand, `--http` / `--rtr` flags): https://routinator.docs.nlnetlabs.nl/en/stable/manual-page.html
- RIPE Stats RPKI Validation API docs: https://stat.ripe.net/docs/02.data-api/rpki-validation.html
- prometheus_client `start_http_server` source: https://github.com/prometheus/client_python/blob/master/prometheus_client/exposition.py

## Issues Found
No technical issues found. All technical claims and code samples were verified against official documentation:

- The Routinator validity endpoint URL pattern (`/api/v1/validity/{ASN}/{prefix}`) and JSON response shape (`validated_route.validity.state`, with description text) match the upstream docs.
- The `routinator server --http [::]:8323 --rtr [::]:3323` command line is valid; 8323 and 3323 are Routinator's documented default unprivileged ports for HTTP and RTR.
- The lowercase state values `valid`, `invalid`, `not-found` (hyphenated) match the JSON output Routinator emits.
- The RIPE Stats endpoint `https://stat.ripe.net/data/rpki-validation/data.json?resource=...&prefix=...` exists and returns `data.validating_roas`.
- `prometheus_client.start_http_server(port, addr=...)` accepts an `addr` kwarg and `addr="::"` correctly binds to IPv6 (the implementation auto-selects `AF_INET6`).
- Python and PromQL snippets are syntactically correct.

## Review Notes
- The Routinator validity endpoint accepts the ASN both as `AS64496` and as a bare number (`64496`). The post uses the `AS`-prefixed form, which works against current Routinator versions, though the canonical docs example uses the bare number form. Either is acceptable.
- `datetime.utcnow()` (used in the monitoring script) emits a `DeprecationWarning` on Python 3.12+ in favor of `datetime.now(timezone.utc)`. It still functions correctly and the post does not pin a Python version, so this was left as-is.
- The default RTR port assigned by IANA is 323; Routinator defaults to 3323 for unprivileged operation. The post's value is correct for the typical deployment.
- The Grafana code fence is tagged `text` rather than `promql`; purely cosmetic.
