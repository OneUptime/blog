# Validation Summary: How to Handle Dapr Sentry Service Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Sentry certificate authority service)
- Kubernetes (kubectl, Helm, PodDisruptionBudget)
- mTLS (mutual TLS with workload certificates)
- Prometheus (alerting rules)
- OpenSSL (certificate inspection)

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Sentry service overview: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr Kubernetes production guidelines: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-production/
- Dapr Helm chart README: https://github.com/dapr/dapr/blob/master/charts/dapr/README.md
- Dapr Kubernetes deployment docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/
- Kubernetes PodDisruptionBudget API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/pod-disruption-budget-v1/

## Issues Found
1. **Prometheus alert annotation used `{{ $value }}` incorrectly**: The alert description stated `"Services have {{ $value }} hours before cert expiry."` but `$value` in a Prometheus alert resolves to the result of the `expr` field, which here is the count of up Sentry instances (0), not the number of hours until certificate expiry. Replaced with a static description: `"Workload certificates expire within 24 hours without renewal."`

## Review Notes
- The default workload certificate TTL of 24 hours is confirmed correct per Dapr docs. This is configurable via Sentry configuration.
- The certificate path `/var/run/secrets/dapr.io/tls/tls.crt` is correct for Kubernetes deployments.
- Helm chart values `dapr_sentry.replicaCount` and `global.ha.enabled` are the correct parameter names.
- The `app: dapr-sentry` label selector is valid — the Dapr Helm chart sets this label on Sentry pods.
- The `policy/v1` API version for PodDisruptionBudget is correct (v1beta1 was removed in Kubernetes 1.25).
- The post correctly notes that sidecars auto-renew certificates when Sentry recovers, while also recommending pod restarts for immediate renewal.
