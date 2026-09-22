# Validation Summary: How to Require Client Certificates on a Python OpenMetrics Endpoint

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python and its `ssl` and `threading` modules
- `prometheus-client` 0.26.0
- Prometheus HTTPS scrape configuration
- OpenMetrics 1.0 text exposition and HTTP content negotiation
- Mutual TLS, X.509 certificates, certificate authorities, and certificate rotation
- curl

## Sources Consulted
- Python client HTTP/HTTPS documentation: https://prometheus.github.io/client_python/exporting/http/
- Version-pinned Python client implementation, including TLS context creation, server startup, and encoder selection: https://github.com/prometheus/client_python/blob/v0.26.0/prometheus_client/exposition.py
- Python SSL documentation, including `CERT_REQUIRED`, certificate loading, and minimum TLS versions: https://docs.python.org/3/library/ssl.html
- Prometheus 3.13 configuration reference, including scrape configuration and `tls_config`: https://prometheus.io/docs/prometheus/3.13/configuration/configuration/#tls_config
- Official curl manual: https://curl.se/docs/manpage.html
- OpenMetrics 1.0 specification: https://prometheus.io/docs/specs/om/open_metrics_spec/
- RFC 5280, X.509 certificate profile and extended key usage: https://www.rfc-editor.org/rfc/rfc5280.html#section-4.2.1.12
- Author profile link: https://github.com/nawazdhandala

## Issues Found
No technical issues found.

## Review Notes
- Left README.md unchanged. The linked technical resources resolve and cover the relevant APIs and configuration.
- Verified the Python example parses and the YAML parses with the expected `tls_config` structure. The configuration fields and `TLS12` value match the Prometheus reference. A live Prometheus process and `promtool` were not run.
- Installed `prometheus-client` 0.26.0 into an isolated temporary directory and tested with Python 3.9.6. Executed the example's registry and gauge setup, then started its TLS server configuration using temporary certificate paths, a loopback address, and an automatically assigned port.
- Generated temporary server, client, and unrelated certificate authorities and certificates. Using curl with local DNS resolution and proxy bypass, the trusted client succeeded with exit code 0. Both a missing certificate and a certificate signed by the unrelated CA failed with exit code 35.
- Confirmed the successful response contains `inventory_ready 1.0`, the OpenMetrics 1.0 content type, and the terminating `# EOF` line. The curl header option writes response headers to `response.headers`.
- Confirmed in the pinned implementation that client CA loading alone does not require authentication; `client_auth_required=True` sets mandatory certificate verification. Server certificate and trust material are loaded into the TLS context at startup, with no automatic PEM-file reload.
- The post correctly distinguishes certificate-chain trust from application authorization. The HTTP/HTTPS documentation's wording about client hostname validation is imprecise; the pinned implementation and Python SSL documentation support the post's more precise explanation.
- The curl example assumes a TLS backend that supports PEM certificate and key files, as used in the test. Windows Schannel uses different client-certificate storage conventions. Production DNS, certificate issuance, file permissions, and deployment rotation remain environment-specific.
