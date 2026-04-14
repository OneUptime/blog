# Validation Summary: How to Configure Dapr Sidecar Component Loading

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Kubernetes (CRDs, namespaces, pod annotations)
- Dapr CLI
- Dapr sidecar (daprd)
- Redis (as example state store component)

## Sources Consulted
- Dapr official documentation: Component scoping (https://docs.dapr.io/operations/components/component-scopes/)
- Dapr official documentation: Component schema (https://docs.dapr.io/operations/components/component-schema/)
- Dapr official documentation: Preview features / Hot Reload (https://docs.dapr.io/operations/configuration/preview-features/)
- Dapr official documentation: Metadata API (https://docs.dapr.io/reference/api/metadata_api/)
- Dapr official documentation: Dapr CLI reference for `dapr run` (https://docs.dapr.io/reference/cli/dapr-run/)
- Dapr official documentation: Dapr CLI reference for `dapr components` (https://docs.dapr.io/reference/cli/dapr-components/)
- Dapr source code: Component CRD type definitions (`pkg/apis/components/v1alpha1/types.go`, `pkg/apis/common/scoped.go`)

## Issues Found

1. **`scopes` field incorrectly nested under `spec` in YAML example**: The `scopes` field was indented under `spec:`, but in the Dapr Component CRD schema, `scopes` is a top-level field (sibling of `spec`, not nested under it). Fixed by moving `scopes` to the same indentation level as `spec`.

2. **Incorrect claim about default namespace global components**: The post stated that daprd loads "Components in the `default` namespace if global components are configured." This is inaccurate. Dapr only loads components deployed in the same namespace as the pod. There is no mechanism for loading components from the default namespace as global components. Corrected to state that only same-namespace components are loaded.

3. **Unsubstantiated "exponential backoff" claim**: The post stated Dapr retries component initialization "with exponential backoff." While Dapr does retry component initialization, the specific claim of exponential backoff is not documented in official Dapr docs. Removed the "with exponential backoff" qualifier to avoid making an unverified claim.

4. **Deprecated `--components-path` CLI flag**: The `--components-path` flag for `dapr run` is deprecated in favor of `--resources-path`. Updated the example to use the current flag.

## Review Notes
- The `HotReload` feature is still a preview feature in Dapr (introduced in v1.13). The post does not mention this preview status, which could be worth noting in a future update so readers understand stability expectations.
- The `dapr components` CLI command correctly uses `--namespace` (long form). Readers should be aware that the short flag `-n` maps to `--name` (component name filter), not `--namespace`, which could cause confusion.
