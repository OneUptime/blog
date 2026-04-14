# Validation Summary: How to Secure Dapr Sidecar Communication

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Mutual TLS (mTLS)
- Kubernetes
- Helm
- Dapr Sentry service (Certificate Authority)
- X.509 certificates

## Sources Consulted
- Dapr official documentation: Security - mTLS (https://docs.dapr.io/operations/security/mtls/)
- Dapr official documentation: Sentry service (https://docs.dapr.io/operations/security/sentry/)
- Dapr CLI reference: dapr mtls (https://docs.dapr.io/reference/cli/dapr-mtls/)
- Dapr Helm chart values (https://github.com/dapr/dapr/tree/master/charts/dapr)

## Issues Found

1. **"SPIFFE-compliant" claim (Overview section)**: The post claimed sidecars receive "SPIFFE-compliant X.509 certificates." The official Dapr documentation makes no mention of SPIFFE compliance for workload certificates. Removed "SPIFFE-compliant" to match the docs, which describe them as standard X.509 certificates.

2. **Incorrect Helm path for workloadCertTTL (Customizing Certificate TTL section)**: The post used `helm upgrade --set dapr_sentry.config.workloadCertTTL=1h`, but this Helm value path does not exist. The `workloadCertTTL` setting lives in the `daprsystem` Configuration resource and should be modified via `kubectl edit configuration daprsystem -n dapr-system`. Replaced the Helm command with the correct kubectl approach.

3. **Non-existent Helm flag for custom certificates (Using Custom Root Certificates section)**: The post used `--set-string dapr_sentry.config.existingRootCertificate=true`, which is not a valid Helm value. The correct approach is to pass certificate files directly using `--set-file dapr_sentry.tls.issuer.certPEM`, `--set-file dapr_sentry.tls.issuer.keyPEM`, and `--set-file dapr_sentry.tls.root.certPEM`. Replaced with the correct Helm install command.

4. **Invalid CLI command `dapr mtls check` (Monitoring section)**: `dapr mtls check` is not a valid subcommand. To check if mTLS is enabled, the correct command is `dapr mtls -k`. Replaced accordingly.

5. **Invalid flag `--kubernetes` on `dapr mtls expiry` (Monitoring section)**: The `dapr mtls expiry` command does not accept a `--kubernetes` flag; it is Kubernetes-only by design and runs without flags. Removed the `--kubernetes` flag.

## Review Notes
- The secret name `dapr-trust-bundle` and its keys (`ca.crt`, `issuer.crt`, `issuer.key`) are correct per official docs.
- The default values for `workloadCertTTL` (24h) and `allowedClockSkew` (15m) are correct.
- The explanation of the Sentry CA workflow (key pair generation, CSR, signed certificate, auto-rotation) is accurate.
- The Configuration CRD apiVersion (`dapr.io/v1alpha1`) and resource name (`daprsystem`) are correct.
