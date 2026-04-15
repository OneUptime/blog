# Validation Summary: How to Deploy Dapr with Pulumi on Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (v1.13.0)
- Pulumi (TypeScript SDK)
- Kubernetes
- Helm (v3, via Pulumi Kubernetes provider)
- Redis (as Dapr state store component)
- TypeScript

## Sources Consulted
- Pulumi Kubernetes provider API docs: `k8s.helm.v3.Release`, `k8s.core.v1.Namespace`, `k8s.apiextensions.CustomResource` — https://www.pulumi.com/registry/packages/kubernetes/
- Pulumi CLI reference (`pulumi new`, `pulumi config`, `pulumi import`, `pulumi stack`) — https://www.pulumi.com/docs/cli/
- Pulumi `kubernetes-typescript` project template — https://www.pulumi.com/templates/kubernetes/
- Dapr Helm chart repository and values — https://dapr.github.io/helm-charts/
- Dapr Component CRD spec (`dapr.io/v1alpha1`, `Component` kind) — https://docs.dapr.io/reference/resource-specs/component-schema/
- Dapr Redis state store component reference — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/

## Issues Found
- **Misleading comment on npm install**: The comment `# Install Dapr Helm chart package` above `npm install @pulumi/kubernetes` was inaccurate. `@pulumi/kubernetes` is the general Pulumi Kubernetes provider, not a Dapr-specific Helm chart package. Additionally, the `pulumi new kubernetes-typescript` template already includes this dependency. Fixed the comment to `# Install Kubernetes provider (if not already included by the template)`.

## Review Notes
- All Pulumi TypeScript API usage is correct: `k8s.helm.v3.Release`, `k8s.core.v1.Namespace`, `k8s.apiextensions.CustomResource`, `pulumi.Config` with `.get()` and `.require()`.
- Dapr Helm chart values use underscores (`dapr_operator`, `dapr_sentry`, `dapr_placement`) which is correct per the official chart.
- The Dapr Component CRD structure including `secretKeyRef` for sensitive metadata is correct.
- The `pulumi import` command uses the correct type token (`kubernetes:helm.sh/v3:Release`) and ID format (`namespace/release-name`).
- Dapr v1.13.0 is a valid released version. Users should check for newer versions when following this tutorial.
