# Validation Summary: How to Handle Dapr Security in Development vs Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes
- mTLS (mutual TLS) via Dapr Sentry
- Dapr API token authentication
- Dapr secret stores (local file, Kubernetes)
- Dapr access control policies
- Helm
- kubectl

## Sources Consulted
- Dapr mTLS documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr API token authentication: https://docs.dapr.io/operations/security/api-token/
- Dapr annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration overview: https://docs.dapr.io/operations/configuration/configuration-overview/
- Dapr file secret store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/file-secret-store/
- Dapr Kubernetes secret store: https://docs.dapr.io/reference/components-reference/supported-secret-stores/kubernetes-secret-store/
- Dapr access control / invoke allowlist: https://docs.dapr.io/operations/configuration/invoke-allowlist/

## Issues Found

### 1. Incorrect jsonpath in security check script for API token annotation
- **What was wrong:** The script used `.metadata.annotations.dapr\.io/api-token-secret` on Deployment resources. Dapr annotations are placed on the pod template within a Deployment (`spec.template.metadata.annotations`), not on the Deployment's own top-level metadata. The original jsonpath would always return empty results.
- **What was changed:** Updated the jsonpath from `{range .items[*]}{.metadata.annotations.dapr\.io/api-token-secret}` to `{range .items[*]}{.spec.template.metadata.annotations.dapr\.io/api-token-secret}`.
- **Why:** Dapr sidecar injection annotations are specified in the pod spec template of a Deployment, not in the Deployment's own metadata. The original command would never find any API token annotations.

## Review Notes
- The `trustDomain: "cluster.local"` in the access control example is not the Dapr default (which is `"public"`), but it is used here as an intentional production configuration value. This is a valid choice for Kubernetes environments, though readers should be aware it must match the trust domain configured in Dapr Sentry.
- The Helm values examples (`values-dev.yaml` / `values-prod.yaml`) are conceptual illustrations for a custom Helm chart, not values from the official Dapr Helm chart. This is fine as presented but readers should understand they would need to create their own chart or wrapper to use this pattern.
- All Dapr component type names (`secretstores.local.file`, `secretstores.kubernetes`), annotation names (`dapr.io/api-token-secret`), and Configuration resource names (`daprsystem`) are verified correct against official documentation.
