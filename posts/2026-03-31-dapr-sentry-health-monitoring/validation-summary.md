# Validation Summary: How to Monitor Dapr Sentry Service Health

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Sentry control plane service)
- Kubernetes (deployments, probes, port-forwarding, logs)
- Prometheus (metrics, ServiceMonitor, alerting rules)
- Helm (Dapr chart configuration)
- mTLS (certificate lifecycle)

## Sources Consulted
- Dapr Sentry overview documentation: https://docs.dapr.io/concepts/dapr-services/sentry/
- Dapr metrics documentation: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md
- Dapr Sentry source code (config.go, sentry.go): https://github.com/dapr/dapr/tree/master/pkg/sentry
- Dapr Helm chart repository: https://github.com/dapr/dapr/tree/master/charts/dapr
- Dapr health check documentation: https://docs.dapr.io/operations/resiliency/health-checks/sidecar-health/
- GitHub issue #1512 (health endpoints for control plane): https://github.com/dapr/dapr/issues/1512
- GitHub issue #8275 (ServiceMonitor labels): https://github.com/dapr/dapr/issues/8275

## Issues Found

1. **Incorrect metric name `dapr_sentry_cert_sign_failed_total`**: The actual Dapr Sentry metric for failed certificate signings is `dapr_sentry_cert_sign_failure_total` (note: "failure" not "failed"). Fixed in the Prometheus metrics section and in the alerting rule expression.

2. **Non-existent metric `dapr_sentry_cert_sign_duration_ms`**: This metric is not exposed by Dapr Sentry. There is no certificate signing latency histogram/summary metric in the standard Sentry metrics set. Removed from the metrics listing.

3. **Incorrect ServiceMonitor label selector**: The post used `app: dapr-sentry` as the matchLabel, but Dapr control plane services use Kubernetes recommended labels (`app.kubernetes.io/*`). Updated to use `app.kubernetes.io/part-of: dapr` and `app.kubernetes.io/component: sentry` to correctly target the Sentry service.

## Review Notes
- The Helm probe configuration shown under `dapr_sentry` uses the correct underscore-based key format, but probe-specific parameters (`livenessProbe`, `readinessProbe`) may not be explicitly supported in all versions of the Dapr Helm chart. Users should verify against their specific Helm chart version.
- The health endpoint section (port 8080, `/healthz`) reflects functionality that has evolved across Dapr versions. In older versions, Sentry control plane services did not expose HTTP health endpoints. Users on older Dapr versions should verify health endpoint availability.
- The `kubectl logs` command uses `-l app=dapr-sentry` which may not match the actual pod labels in some Dapr installations that use `app.kubernetes.io/*` labels. Users should verify their pod labels with `kubectl get pods -n dapr-system --show-labels`.
