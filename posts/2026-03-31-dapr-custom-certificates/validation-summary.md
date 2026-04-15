# Validation Summary: How to Install Custom Certificates in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, Sentry service, mTLS)
- Kubernetes (secrets, deployments, rollout)
- Helm (Dapr chart installation and upgrade)
- OpenSSL (certificate generation)
- Dapr Redis state store component (TLS configuration)

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Dapr Helm chart README and values: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Sentry deployment template: https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sentry/templates/dapr_sentry_deployment.yaml
- Dapr Redis state store component metadata: https://github.com/dapr/components-contrib/blob/main/state/redis/metadata.yaml
- Dapr Redis state store reference: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found
1. **Invalid `caCert` metadata field in Redis component YAML**: The original post included a `caCert` field with `secretKeyRef` in the Redis state store component example. The Dapr Redis state store component does not define a `caCert` metadata field. Only `enableTLS`, `clientCert`, `clientKey`, and `insecureSkipTLSVerify` are supported for TLS configuration. Removed the `caCert` entry from the YAML example and added a note clarifying that TLS metadata fields vary by component and that trusting a private CA for Redis requires mounting the CA certificate into the sidecar container's trust store.

## Review Notes
- The Helm values `dapr_sentry.tls.issuer.certPEM`, `dapr_sentry.tls.issuer.keyPEM`, and `dapr_sentry.tls.root.certPEM` are confirmed correct per the official Dapr Helm chart.
- The secret name `dapr-trust-bundle` and its keys (`ca.crt`, `issuer.crt`, `issuer.key`) are confirmed correct.
- The Sentry deployment name `dapr-sentry` is confirmed correct per the Helm chart templates.
- The OpenSSL commands for generating a CA and issuer certificate chain are syntactically correct and follow standard practices.
- The `kubectl` commands for creating/updating secrets and checking certificate expiration are correct.
- Other Dapr components (e.g., Etcd, HTTP binding) do support CA certificate fields, but each component defines its own metadata schema — users should consult per-component documentation.
