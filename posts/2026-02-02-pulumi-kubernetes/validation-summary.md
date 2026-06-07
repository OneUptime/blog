# Validation Summary: How to Use Pulumi with Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Pulumi CLI and SDK
- Pulumi Kubernetes provider (`@pulumi/kubernetes`, `pulumi_kubernetes`)
- Kubernetes resources: Deployment, Service, Namespace, ConfigMap, Secret, Ingress, NetworkPolicy, StatefulSet, PersistentVolumeClaim
- TypeScript and Python (Pulumi languages)
- Helm v3 Chart integration
- Pulumi stacks and configuration
- Pulumi ComponentResource (reusable components)
- Pulumi unit testing via `pulumi.runtime.setMocks`
- GitHub Actions integration via `pulumi/actions`
- NGINX Ingress Controller (Helm chart)
- cert-manager annotations

## Sources Consulted
- Pulumi Kubernetes provider docs — helm.v3.Chart: https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/chart/
- Pulumi Kubernetes provider docs — Deployment (type token confirmation): https://www.pulumi.com/registry/packages/kubernetes/api-docs/apps/v1/deployment/
- Pulumi unit testing docs (setMocks, MockResourceArgs, MockCallArgs): https://www.pulumi.com/docs/iac/concepts/testing/unit/
- Pulumi import CLI docs: https://www.pulumi.com/docs/iac/cli/commands/pulumi_import/
- Pulumi install docs (Homebrew recommendation): https://www.pulumi.com/docs/iac/download-install/
- Kubernetes API reference for Deployment, Service, Ingress, NetworkPolicy, StatefulSet
- `pulumi/actions` GitHub Action (v5 is current major version)

## Issues Found
- **macOS install command updated**: Changed `brew install pulumi` to `brew install pulumi/tap/pulumi` to align with Pulumi's official documentation recommendation (the official Pulumi Homebrew tap). The previous command technically works via homebrew-core, but the official tap is the documented recommendation.

No other technical issues found. The TypeScript and Python code samples use valid `@pulumi/kubernetes` / `pulumi_kubernetes` APIs. The Pulumi CLI commands (`pulumi new`, `pulumi preview`, `pulumi up`, `pulumi destroy`, `pulumi stack`, `pulumi config set --secret`, `pulumi refresh`, `pulumi import`, `pulumi stack --show-urns`) are all valid. The `pulumi import kubernetes:apps/v1:Deployment` type token was verified against the official registry. The `pulumi.runtime.setMocks` mocking pattern and `MockResourceArgs` / `MockCallArgs` types are correct.

## Review Notes
- **`helm.v3.Chart` is still supported but newer alternatives exist.** Pulumi Kubernetes provider v4 introduced `helm.v4.Chart` (with a slightly different API). The `helm.v3.Chart` shown in the post still works and remains documented. Users on newer provider versions may prefer `helm.v4.Chart` for future projects.
- **`kubernetes.io/ingress.class` annotation is deprecated.** Since Kubernetes 1.18, the recommended approach is `spec.ingressClassName` on the Ingress resource (referencing an `IngressClass` object). The annotation still works for backward compatibility with the NGINX Ingress Controller, so the example is functional but not best practice for new clusters.
- **PostgreSQL StatefulSet example is simplified.** The example sets 3 replicas but does not configure replication between Postgres instances (no replication user, no archive_command, no init scripts for primary/replica setup). This is acceptable as it demonstrates StatefulSet structure rather than production Postgres HA — the post does not claim otherwise.
- **`pulumi/actions@v5`, `actions/checkout@v4`, `actions/setup-node@v4`** are all current major versions as of the validation date.
- **The unit test pattern** uses Promise-wrapped `.apply()` which works but is more verbose than the documented `pulumi.all([...]).apply(...)` callback style with Jest's `done` callback. Both patterns are valid.
- **Helm v3 Chart `transformations` callback** correctly uses in-place mutation (return value is not required for this signature).
