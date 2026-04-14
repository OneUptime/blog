# Validation Summary: How to Implement Tenant Onboarding with Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (component CRDs, Configuration CRD, sidecar health endpoint)
- Kubernetes (namespaces, labels, secrets, Jobs, CRDs)
- Helm (chart templating, `helm install`)
- Redis (Bitnami Helm chart for per-tenant provisioning)
- Bash scripting (onboarding automation)

## Sources Consulted
- Dapr Component spec reference: https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Configuration spec reference: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr Redis state store component: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr health API: https://docs.dapr.io/reference/api/health_api/
- Kubernetes Job spec: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Bitnami Redis Helm chart: https://github.com/bitnami/charts/tree/main/bitnami/redis
- alpine/helm Docker image: https://hub.docker.com/r/alpine/helm

## Issues Found
1. **Wrong container image in provisioning Job**: The Kubernetes Job for provisioning Redis (line 105) used `bitnami/redis:latest`, which is a Redis server image and does not include the Helm CLI. The Job's command runs `helm install`, which would fail with "command not found." Changed the image to `alpine/helm:latest`, which includes the Helm CLI needed to execute the `helm install` command.

## Review Notes
- The `scopes` field in the Dapr Component YAML is correctly placed at the root level (same level as `spec`), which matches the Dapr Component CRD schema.
- The Dapr Configuration CRD field `metric` (singular) is correct — this matches the Dapr spec, even though the Helm values use `metrics` (plural). This is a values naming choice, not an error.
- The provisioning Job pattern (running Helm inside a Job) is a valid approach but has operational considerations: the Job's service account would need RBAC permissions for Helm/Tiller operations, and the `alpine/helm` image would also need `kubectl` access configured via a mounted kubeconfig or in-cluster service account token.
- The Redis provisioning uses `--set auth.enabled=false`, which disables authentication. This is acceptable for a tutorial but should be noted as insecure for production use.
- The health check URL `http://tenant-api.${TENANT_ID}:3500/v1.0/healthz` assumes in-cluster access or port forwarding; this is reasonable for a validation script context.
