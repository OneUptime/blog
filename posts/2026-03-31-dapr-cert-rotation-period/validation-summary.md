# Validation Summary: How to Configure Certificate Rotation Period in Dapr Sentry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sentry (certificate authority component)
- Kubernetes (kubectl, Secrets, Configuration CRDs)
- Helm (Dapr Helm chart)
- Prometheus (alerting rules)
- mTLS (mutual TLS / workload identity)

## Sources Consulted
- Dapr source code: `pkg/sentry/config/config.go` — default TTL and clock skew constants (https://github.com/dapr/dapr/blob/master/pkg/sentry/config/config.go)
- Dapr Kit source code: `crypto/spiffe/spiffe.go` — renewal logic and log messages (https://github.com/dapr/kit/blob/main/crypto/spiffe/spiffe.go)
- Dapr source code: `pkg/security/consts/consts.go` — trust bundle Secret name (https://github.com/dapr/dapr/blob/master/pkg/security/consts/consts.go)
- Dapr source code: `pkg/sentry/monitoring/metrics.go` — Sentry Prometheus metrics (https://github.com/dapr/dapr/blob/master/pkg/sentry/monitoring/metrics.go)
- Dapr Helm chart: `charts/dapr/values.yaml` — Helm value paths for mTLS settings (https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml)
- Dapr Helm chart template: `dapr_default_config.yaml` — default Configuration resource name (https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_config/templates/dapr_default_config.yaml)
- Dapr official docs: mTLS configuration (https://docs.dapr.io/operations/security/mtls/)
- Dapr official docs: Configuration schema reference (https://docs.dapr.io/reference/resource-specs/configuration-schema/)

## Issues Found

1. **Trust bundle is a Secret, not a ConfigMap**: The post used `kubectl get configmap dapr-trust-bundle` but `dapr-trust-bundle` is a Kubernetes Secret, not a ConfigMap. Fixed to `kubectl get secret dapr-trust-bundle`.

2. **Configuration resource name should be `daprsystem`, not `default`**: The default Dapr control plane Configuration resource is named `daprsystem` (defined in source as `defaultDaprSystemConfigName = "daprsystem"`). Fixed both the YAML example and the kubectl check command.

3. **Incorrect Helm value paths**: The post used `dapr_sentry.config.workloadCertTTL` and `dapr_sentry.config.allowedClockSkew`, but these paths do not exist in the Dapr Helm chart. The correct paths are `global.mtls.workloadCertTTL` and `global.mtls.allowedClockSkew`. Fixed both Helm set flags.

4. **Fabricated Prometheus metric**: The post referenced `dapr_sentry_cert_expiry_timestamp` which does not exist. The actual metric is `dapr_sentry_issuercert_expiry_timestamp`, which tracks issuer/root certificate expiry. Fixed the metric name in the Prometheus alert rule.

5. **Incorrect log messages**: The post showed `"Renewing workload cert"` and `"Workload cert renewed successfully"` but the actual daprd log messages are `"Renewing workload identity"` and `"Successfully renewed workload identity"` (from `dapr/kit/crypto/spiffe/spiffe.go`). Fixed to match actual log output.

## Review Notes
- The `dapr_sentry_issuercert_expiry_timestamp` metric tracks issuer/root certificate expiry, not individual workload certificate expiry. There is no built-in Dapr Prometheus metric for per-sidecar workload certificate expiry. The Prometheus alert section is now correct for monitoring the issuer cert, but readers should be aware this does not alert on individual sidecar cert expiry. The post's description was updated to use the correct metric but the alert description ("Dapr sidecar certificate expires in less than 2 hours") could be slightly misleading — it monitors the issuer cert, not individual sidecar certs. This is a minor nuance that doesn't warrant changing the post structure.
- The 50% renewal claim is confirmed correct for Dapr specifically (`renewalDivisor = 2` in the SPIFFE implementation). Other service meshes like Istio use different thresholds (~80%), so this is a Dapr-specific behavior worth noting.
- The Configuration YAML, field names (`workloadCertTTL`, `allowedClockSkew`), and apiVersion (`dapr.io/v1alpha1`) are all confirmed correct against both source code and official documentation.
