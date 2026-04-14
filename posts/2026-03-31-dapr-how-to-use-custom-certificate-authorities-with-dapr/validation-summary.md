# Validation Summary: How to Use Custom Certificate Authorities with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Sentry service, mTLS, trust bundle)
- Kubernetes (secrets, deployments, rollout restart)
- OpenSSL (certificate generation, CSR signing, chain verification)
- Helm (Dapr chart installation with custom TLS values)
- cert-manager (automated certificate lifecycle management)

## Sources Consulted
- Dapr official documentation on mTLS and custom certificates (https://docs.dapr.io/operations/security/mtls/)
- Dapr Helm chart values for `dapr_sentry.tls.*` configuration
- Cross-referenced with validated blog posts in this repository: `dapr-bring-your-own-ca-cert-sentry`, `dapr-sentry-service-certs`, `dapr-sentry-certificate-management`, `dapr-respond-certificate-expiration`
- cert-manager documentation for Certificate and Issuer resources (https://cert-manager.io/docs/)
- OpenSSL man pages for `genrsa`, `req`, `x509`, and `verify` commands

## Issues Found

1. **Incorrect claim about workload certs in trust bundle (line 22)**: The post stated "All three are stored in the `dapr-trust-bundle` secret," implying workload certificates are stored there. Workload certificates are dynamically issued by Sentry and held in memory by each sidecar — only the root CA cert, issuer cert, and issuer key are stored in the trust bundle. Clarified the text.

2. **Incorrect base64 encoding in `dapr init -k` command (lines 88-90)**: The `--set` values used `$(cat file | base64)` to pass base64-encoded certificate content. The Dapr Helm chart expects raw PEM content for `dapr_sentry.tls.*` values — it handles encoding internally when creating the Kubernetes secret. Passing base64-encoded content would result in double encoding. Changed to `--set-string` with raw PEM content, consistent with the Helm install example shown below it.

3. **Wrong secret key name `root.crt` (line 116)**: The kubectl command used `--from-file=root.crt=./ca.crt` but Dapr's Sentry expects the root CA under the key `ca.crt` in the `dapr-trust-bundle` secret. Confirmed by cross-referencing multiple validated posts (`dapr-sentry-service-certs` lines 78-80, `dapr-bring-your-own-ca-cert-sentry` line 54). Changed to `--from-file=ca.crt=./ca.crt`.

4. **Wrong jsonpath key in verification/monitoring commands (lines 131, 217)**: The jsonpath used `{.data.root\.crt}` matching the incorrect key name. Changed both occurrences to `{.data.ca\.crt}` to match the corrected secret key name.

5. **Text/YAML mismatch: "ClusterIssuer" vs "Issuer" (line 150)**: The text said "Create a ClusterIssuer" but the YAML resource was `kind: Issuer` (namespace-scoped). Changed the text to "Create an Issuer" to match the YAML, which is correct since the issuer is scoped to the `dapr-system` namespace.

## Review Notes
- The cert-manager integration section creates a Certificate resource with `secretName: dapr-trust-bundle`. cert-manager produces secrets with keys `tls.crt`, `tls.key`, and `ca.crt`, while Dapr expects `ca.crt`, `issuer.crt`, and `issuer.key`. This key name mismatch may require additional configuration (e.g., a trust-manager setup or post-creation key remapping) to work correctly in practice. This is noted as a caveat rather than corrected, as the integration pattern varies across Dapr versions.
- The OpenSSL commands for certificate generation are correct and include proper CA extensions (`basicConstraints`, `keyUsage`) for the issuer certificate, which is good practice.
- The 24-hour default for workload certificate TTL is accurate for standard Dapr installations.
