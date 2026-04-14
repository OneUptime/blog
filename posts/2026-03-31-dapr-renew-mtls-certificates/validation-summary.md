# Validation Summary: How to Renew mTLS Certificates in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (mTLS, Sentry service)
- Kubernetes (Secrets, ConfigMaps, kubectl)
- OpenSSL (certificate generation)
- Prometheus (alerting)

## Sources Consulted
- Dapr official documentation on mTLS certificate management (docs.dapr.io)
- Dapr source code: `pkg/security/consts/consts.go` (trust bundle secret name constant)
- Dapr source code: `pkg/sentry/server/ca/kube.go` (certificate storage logic)
- Dapr source code: `pkg/sentry/monitoring/metrics.go` (Sentry Prometheus metrics)
- Dapr CLI documentation for `dapr mtls renew-certificate` command and flags

## Issues Found
1. **`--valid-until` flag format**: The `dapr mtls renew-certificate` command's `--valid-until` flag accepts an integer number of days, not a duration string. The post used `--valid-until 365d` which would fail or be misinterpreted. Fixed to `--valid-until 365`.

## Review Notes
- The Prometheus alert is named `DaprRootCACertExpiringSoon` but monitors the metric `dapr_sentry_issuercert_expiry_timestamp`, which tracks the issuer/root cert expiry. The metric description says "The unix timestamp, in seconds, when issuer/root cert will expire" so this is functionally correct, though the alert name could be more precise (e.g., `DaprIssuerCertExpiringSoon`).
- The `dapr mtls renew-certificate` CLI also supports a `--restart` flag that automatically restarts the Dapr control plane pods after renewal. The post does not mention this but covers the manual restart steps instead, which is a valid approach.
- Both the root CA and issuer certificates use the same subject (`/CN=cluster.local/O=dapr.io`) in the manual generation section. While this works, using distinct CNs (e.g., `CN=cluster.local CA` for root and `CN=cluster.local` for issuer) would make it easier to distinguish certificates during debugging.
- Dapr stores the trust bundle in both a Secret named `dapr-trust-bundle` (containing `ca.crt`, `issuer.crt`, `issuer.key`) and a ConfigMap of the same name (containing only `ca.crt` in plain text). The blog correctly targets the Secret for both reading and updating certificates.
