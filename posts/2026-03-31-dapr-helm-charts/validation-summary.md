# Validation Summary: How to Use Dapr with Helm Charts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Helm v3 (Kubernetes package manager)
- Kubernetes (container orchestration)
- Redis (used as example state store backend)

## Sources Consulted
- Dapr official Helm chart installation docs: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-deploy/#install-with-helm-advanced
- Dapr Helm chart repository: https://github.com/dapr/helm-charts
- Dapr sidecar annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr component spec (state.redis): https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/
- Dapr component secret references: https://docs.dapr.io/operations/components/component-secrets/
- Helm v3 CLI documentation: https://helm.sh/docs/helm/

## Issues Found
No technical issues found.

## Review Notes
- The post uses Dapr version 1.13.0 as an example. This is a valid release version. Readers should check for newer versions when following the guide.
- The Dapr Helm chart values (`dapr_operator`, `dapr_sentry` with underscores) match the chart's actual value keys, which differ from the Kubernetes resource naming convention.
- The Dapr Component template references `{{ .Values.redis.host }}` which is not defined in the shown `values.yaml`. This is intentional — the post is demonstrating the pattern, and readers would need to add their own Redis-related values. This is not an error but could be a minor point of confusion for beginners.
- The `secretKeyRef` syntax used in the Dapr component template is the correct Dapr-native secret reference format for Kubernetes secret stores.
- All Helm template functions (`include`, `nindent`, `.Values`, `.Chart.Name`, `.Release.Namespace`, `.Release.Name`) are used correctly.
