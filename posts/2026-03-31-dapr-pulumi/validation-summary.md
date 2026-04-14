# Validation Summary: How to Use Dapr with Pulumi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Pulumi (Infrastructure as Code)
- Dapr (Distributed Application Runtime)
- Kubernetes
- TypeScript
- Helm
- Azure Redis Cache (`@pulumi/azure-native`)

## Sources Consulted
- Pulumi Kubernetes Provider documentation (https://www.pulumi.com/registry/packages/kubernetes/)
- Pulumi Azure Native Provider documentation (https://www.pulumi.com/registry/packages/azure-native/)
- Pulumi `helm.v3.Release` API reference (https://www.pulumi.com/registry/packages/kubernetes/api-docs/helm/v3/release/)
- Dapr Helm chart repository (https://dapr.github.io/helm-charts/)
- Dapr Components reference — State stores (https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-redis/)
- Dapr sidecar annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Azure Redis Cache documentation for ports and TLS (https://learn.microsoft.com/en-us/azure/azure-cache-for-redis/)
- npm registry for `@pulumi/helm` package existence check

## Issues Found

1. **Invalid npm package `@pulumi/helm`**: The install command `npm install @pulumi/kubernetes @pulumi/helm` referenced a non-existent package. Helm support is bundled inside `@pulumi/kubernetes`. Fixed to `npm install @pulumi/kubernetes`.

2. **Non-standard Helm import pattern**: `import * as helm from "@pulumi/kubernetes/helm"` is not the correct import path. Changed to use the standard pattern: `import * as k8s from "@pulumi/kubernetes"` with `k8s.helm.v3.Release`.

3. **Missing `pulumi` import**: The `createDaprComponent` function referenced `pulumi.CustomResourceOptions` without importing the `@pulumi/pulumi` package. Added `import * as pulumi from "@pulumi/pulumi"`.

4. **Incorrect Azure Redis access keys retrieval**: `redisCache.accessKeys.apply(k => k.primaryKey)` is invalid — the `azure.cache.Redis` resource does not expose an `accessKeys` output property. Fixed to use `azure.cache.listRedisKeysOutput()` which is the correct way to retrieve Redis access keys in the Azure Native provider.

## Review Notes
- Dapr version 1.13.0 is valid but not the latest. As of early 2025, Dapr 1.14.x is available. The version in the post is fine for a tutorial but readers should check for newer versions.
- The code snippets are presented as separate blocks rather than a single cohesive program. Variables like `resourceGroup` and `daprRelease` are referenced across blocks without being defined in the same block. This is typical for tutorial-style posts but readers should understand these are meant to be composed into a single Pulumi program.
- The `redisPassword` field in the first Dapr component example uses `secretKeyRef` alongside `value` fields in the metadata array, which is correct Dapr component configuration syntax.
