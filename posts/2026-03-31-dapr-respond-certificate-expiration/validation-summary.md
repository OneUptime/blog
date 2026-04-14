# Validation Summary: How to Respond to Dapr Certificate Expiration Alerts

## Status
validated

## Post Type
Tutorial / Incident Response Guide

## Technologies Covered
- Dapr (sidecar architecture, mTLS, dapr-sentry CA)
- Kubernetes (secrets, rolling restarts)
- OpenSSL (certificate generation)
- Dapr CLI (mtls renew-certificate, init)
- Prometheus (alerting rules)

## Sources Consulted
- Dapr official documentation on mTLS setup and certificate management (https://docs.dapr.io/operations/security/mtls/)
- Dapr CLI reference for `dapr mtls renew-certificate` and `dapr init -k`
- Dapr Helm chart values for sentry TLS configuration
- Dapr Sentry Prometheus metrics documentation
- Cross-referenced with validated blog posts in this repository covering Dapr certificate topics (dapr-rotate-mtls-certificates, dapr-how-to-use-custom-certificate-authorities-with-dapr, dapr-certificate-expiration-monitoring, dapr-respond-sidecar-crash-loops)

## Issues Found

1. **`--valid-until` flag takes days, not hours (line 45)**: The command `dapr mtls renew-certificate -k --valid-until 17520h` used an hours-based duration string. The `--valid-until` flag accepts an integer number of days. Changed to `--valid-until 730` for a 2-year renewal period.

2. **Wrong `dapr init -k` certificate flags (lines 87-91)**: The post used `--root-certificate`, `--issuer-certificate`, and `--issuer-private-key` flags which are not valid for `dapr init -k`. The correct approach is to pass base64-encoded certificate content via Helm `--set` values: `dapr_sentry.tls.root.certPEM`, `dapr_sentry.tls.issuer.certPEM`, and `dapr_sentry.tls.issuer.keyPEM`. Rewrote the command accordingly.

3. **Invalid Helm value `dapr_sentry.trust_domain` (line 88)**: The `--set dapr_sentry.trust_domain=my-cluster.example.com` value path does not exist in the Dapr Helm chart. Trust domain configuration is typically done via a Dapr Configuration CRD, not a Helm value. Removed this line as part of the certificate flags fix.

4. **Wrong Prometheus metric name (line 100)**: The post used `dapr_cert_expiry_timestamp` which is not a real Dapr metric. The correct Dapr Sentry metric for certificate expiry is `dapr_sentry_issuercert_expiry_timestamp`. Changed the metric name in the Prometheus alert rule.

## Review Notes
- The OpenSSL commands for generating the issuer certificate do not include CA extensions (e.g., `basicConstraints=CA:TRUE`). While this may work with Dapr's sentry in practice, production deployments should include proper X.509 extensions for the issuer certificate.
- The post correctly notes that existing sidecars need a rolling restart after root certificate renewal, which is an important operational detail often missed.
- The default validity periods mentioned (24h for workload certs, 1 year for root cert) are accurate for standard Dapr installations.
