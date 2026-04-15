# Validation Summary: How to Implement Data Encryption in Transit with Dapr mTLS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sentry (Certificate Authority service)
- mTLS (Mutual Transport Layer Security)
- Kubernetes
- Prometheus (monitoring)
- Dapr CLI

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Configuration spec: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr CLI reference (mtls commands): https://docs.dapr.io/reference/cli/dapr-mtls/
- Dapr access control documentation: https://docs.dapr.io/operations/configuration/invoke-allowlisting/
- Dapr Sentry source code for default port verification

## Issues Found

1. **Invalid `spec.mtls.rootCA` field in Configuration resource (line 83)**: The post showed an inline `rootCA` field in the Dapr Configuration YAML for external CA integration. This field does not exist in the Dapr Configuration spec. Root CA certificates are provided via the `dapr-trust-bundle` Kubernetes secret, not inline in the Configuration resource. **Fixed** by replacing the YAML snippet with the correct approach using `kubectl create secret` to update the trust bundle.

2. **Incorrect Sentry port and invalid curl command (line 99-101)**: The post referenced `dapr-sentry.dapr-system.svc.cluster.local:443` for a health check. Sentry's default port is 50001, not 443. Additionally, Sentry exposes a gRPC endpoint, not an HTTPS REST endpoint, so the `curl` command would not work as shown. The certificate path `/var/run/secrets/dapr.io/tls/ca.crt` is also not a documented Dapr mount path — internal mTLS certificates are handled in-process by the sidecar. **Fixed** by removing the incorrect curl command to Sentry entirely.

3. **Misleading Prometheus alert expression (line 153)**: The comment said "Alert if certificate expires within 48 hours" but the expression `dapr_sentry_cert_sign_request_received_total > 0` simply checks if any CSRs have been received, which would always be true in a running cluster. Dapr does not expose a Prometheus metric for certificate time-to-expiry. **Fixed** by changing the alert to monitor for absence of CSR activity (which could indicate Sentry health issues) and adding a note to use `dapr mtls expiry -k` for checking root certificate expiry.

## Review Notes
- The access control policy example is correct but only shows `defaultAction` at the app level. For more granular control, the `operations` field can be used within each policy to restrict specific HTTP verbs and paths. This is a valid simplification for an introductory guide.
- The PrometheusRule monitoring section is inherently limited because Dapr does not expose workload certificate expiry as a Prometheus metric. The recommended approach for monitoring certificate expiry is to use the `dapr mtls expiry` CLI command or to build custom monitoring around the Sentry logs.
- The post correctly notes that mTLS is enabled by default in Kubernetes but must be explicitly enabled in self-hosted mode.
