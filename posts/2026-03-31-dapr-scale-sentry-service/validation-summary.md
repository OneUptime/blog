# Validation Summary: How to Scale Dapr Sentry Service

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Sentry service (mTLS certificate authority)
- Kubernetes (Deployments, Services, PodDisruptionBudget, pod anti-affinity)
- Helm (Dapr Helm chart)
- Prometheus metrics

## Sources Consulted
- [Dapr Sentry control plane service overview](https://docs.dapr.io/concepts/dapr-services/sentry/)
- [Dapr Helm chart README](https://github.com/dapr/dapr/blob/master/charts/dapr/README.md)
- [Dapr metrics reference](https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md)
- [Dapr Sentry deployment template](https://github.com/dapr/dapr/blob/master/charts/dapr/charts/dapr_sentry/templates/dapr_sentry_deployment.yaml)
- [Dapr mTLS setup & configure docs](https://docs.dapr.io/operations/security/mtls/)

## Issues Found
No technical issues found.

Verified items:
- Helm parameter `dapr_sentry.replicaCount` is correct.
- `dapr_sentry.resources` (requests/limits) nesting is correct per the chart.
- The pod label `app: dapr-sentry` matches the deployment's labels and selectors.
- Deployment name `dapr-sentry` and namespace `dapr-system` are correct defaults.
- Service name `dapr-sentry` is correct for `kubectl port-forward`.
- Metrics port `9090` matches `global.prometheus.port` default used by control plane services.
- Metrics `dapr_sentry_cert_sign_request_received_total` and `dapr_sentry_cert_sign_success_total` exist in the Dapr metrics reference.
- Trust bundle secret name `dapr-trust-bundle` in `dapr-system` namespace is correct.
- PDB `apiVersion: policy/v1` is correct for current Kubernetes versions.
- `kubectl rollout status` and `kubectl get pods -l app=dapr-sentry` commands are syntactically valid.

## Review Notes
- Sentry is described as stateless with respect to certificate issuance; this is accurate — Sentry reads the CA material from the `dapr-trust-bundle` secret and signs incoming CSRs without inter-replica coordination.
- The author uses `--reuse-values` with `--set` overrides; this is correct Helm usage but readers should be aware that combining `-f values.yaml` with `--reuse-values` can occasionally be surprising when merging deeply nested maps. Not incorrect, just an operational caveat.
- Resource requests/limits suggested (100m/500m CPU, 64Mi/256Mi memory) are reasonable starting points and align with typical control plane sizing; actual tuning depends on cluster scale and CSR burst rates.
