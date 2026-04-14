# Validation Summary: How to Configure Dapr mTLS for Service-to-Service Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Sentry CA, sidecars, mTLS)
- Kubernetes (secrets, Helm, kubectl)
- OpenSSL (certificate generation and inspection)
- SPIFFE (workload identity framework)
- Mutual TLS (mTLS)

## Sources Consulted
- Dapr mTLS setup documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr security concepts: https://docs.dapr.io/concepts/security-concept/
- Dapr CLI mtls command reference: https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr CLI source code (cmd/mtls.go): https://github.com/dapr/cli/blob/master/cmd/mtls.go
- Dapr CLI source code (pkg/kubernetes/mtls.go): https://github.com/dapr/cli/blob/master/pkg/kubernetes/mtls.go
- Dapr Helm chart values: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Configuration CRD spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr access control / SPIFFE identity docs: https://docs.dapr.io/operations/configuration/invoke-allowlist/
- Dapr TLS 1.2 minimum enforcement (issue #6031): https://github.com/dapr/dapr/issues/6031

## Issues Found

### 1. Incorrect TLS version claim (line 16)
- **What was wrong**: The post claimed "All inter-sidecar traffic is encrypted with TLS 1.3". Dapr enforces TLS 1.2 as the minimum version. TLS 1.3 may be negotiated depending on the environment, but this is not guaranteed or documented by Dapr.
- **What was changed**: Updated to "All inter-sidecar traffic is encrypted with TLS (1.2 minimum)".
- **Why**: The official Dapr documentation and source code specify TLS 1.2 as the minimum required version, not TLS 1.3 exclusively.

### 2. Non-existent CLI commands (lines 100-109)
- **What was wrong**: The post used `dapr mtls disable -k` and `dapr mtls enable -k` to globally disable/enable mTLS. These subcommands do not exist in the Dapr CLI. The only `dapr mtls` subcommands are `export`, `expiry`, and `renew-certificate`.
- **What was changed**: Replaced with the correct Helm-based approach: `helm upgrade dapr dapr/dapr --namespace dapr-system --set global.mtls.enabled=false` (and `true` to re-enable).
- **Why**: The Dapr CLI does not have `disable`/`enable` subcommands under `dapr mtls`. The correct way to toggle mTLS globally is via Helm chart values or by editing the Configuration CRD.

## Review Notes
- The Dapr Configuration CRD (`apiVersion: dapr.io/v1alpha1`, `kind: Configuration`) with `spec.mtls.enabled` is correctly documented for per-app or per-namespace mTLS control.
- All Helm chart values (`dapr_sentry.tls.root.certPEM`, `dapr_sentry.tls.issuer.certPEM`, `dapr_sentry.tls.issuer.keyPEM`, `global.mtls.workloadCertTTL`, `global.mtls.allowedClockSkew`) were verified as correct.
- The SPIFFE identity format `spiffe://<trustDomain>/ns/<namespace>/<appId>` is correct per official docs.
- The trust bundle secret name `dapr-trust-bundle` in `dapr-system` namespace is correct.
- The `dapr mtls export` command correctly outputs `ca.crt`, `issuer.crt`, and `issuer.key` files.
- The OpenSSL commands for generating a custom CA chain are syntactically correct and follow standard practices.
- The 3-level certificate hierarchy (Root CA -> Issuer -> Workload) is accurately described.
- Default workload cert TTL of 24 hours is confirmed correct.
