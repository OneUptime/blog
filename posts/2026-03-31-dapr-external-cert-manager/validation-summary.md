# Validation Summary: How to Use External Certificate Manager with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Sentry component, mTLS)
- cert-manager (ClusterIssuer, Certificate CRDs)
- Kubernetes (Secrets, Helm, kubectl)
- OpenSSL (certificate verification)

## Sources Consulted
- [cert-manager Certificate resource documentation](https://cert-manager.io/docs/usage/certificate/)
- [cert-manager API Reference — KeyUsage types](https://cert-manager.io/docs/reference/api-docs/)
- [cert-manager ClusterIssuer cluster-resource-namespace behavior](https://cert-manager.io/docs/configuration/)
- [Dapr mTLS documentation — Setup & configure mTLS certificates](https://docs.dapr.io/operations/security/mtls/)
- [Dapr Helm Chart README](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md)
- [Dapr GitHub Issue #4428 — configurable issuer filenames](https://github.com/dapr/dapr/issues/4428)
- [diagridio/dapr-cert-manager controller](https://github.com/diagridio/dapr-cert-manager)

## Issues Found

### 1. Invalid Helm value `dapr_sentry.trustAnchorsFile`
**What was wrong:** The post used `--set dapr_sentry.trustAnchorsFile=""` to configure Dapr Sentry, but this Helm value does not exist in the Dapr Helm chart.

**What was changed:** Replaced with the correct Helm values `global.issuerFilenames.cert=tls.crt` and `global.issuerFilenames.key=tls.key`, which tell Dapr Sentry to read cert-manager's key names instead of the Dapr defaults.

**Why:** The Dapr Helm chart does not expose a `trustAnchorsFile` value. The correct way to integrate with cert-manager is to configure the expected filename keys via `global.issuerFilenames.*`.

### 2. Missing explanation of key name mismatch between cert-manager and Dapr
**What was wrong:** The post did not mention that cert-manager creates secrets with keys `tls.crt`/`tls.key` while Dapr Sentry expects `issuer.crt`/`issuer.key`. Without addressing this mismatch, the integration would not work.

**What was changed:** Added an explanation of the key name mismatch and the correct Helm values to resolve it.

**Why:** This is a well-known integration challenge (Dapr GitHub issue #4428) that was resolved by adding configurable issuer filenames. Without this configuration, Dapr Sentry cannot find the certificate and key in the secret.

## Review Notes
- The cert-manager installation command, CRD definitions (ClusterIssuer, Certificate), API version (`cert-manager.io/v1`), and key usage values (`cert sign`, `crl sign` with spaces) are all correct.
- The cross-namespace setup (root CA in `cert-manager` namespace, issuer cert in `dapr-system` namespace, both using ClusterIssuers) is correct. ClusterIssuers read CA secrets from the `--cluster-resource-namespace` (default: `cert-manager`) and can issue certificates into any namespace.
- The `dapr-trust-bundle` secret name is the correct default that Dapr Sentry looks for.
- The verification commands are correct for inspecting the cert-manager-created secret.
- An alternative approach worth mentioning in a future revision is the `diagridio/dapr-cert-manager` controller, which automates the cert-manager to Dapr certificate synchronization without manual Helm value configuration.
