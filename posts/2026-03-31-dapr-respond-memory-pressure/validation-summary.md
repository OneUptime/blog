# Validation Summary: How to Respond to Dapr Memory Pressure Issues

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- Dapr (sidecar runtime, actors, components, configuration)
- Kubernetes (kubectl, pod resource management, rolling restarts)
- Prometheus (alerting rules, PromQL)
- Redis (as Dapr state store)

## Sources Consulted
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr metrics configuration: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr component scoping: https://docs.dapr.io/operations/components/component-scopes/
- Dapr sidecar Kubernetes annotations: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr actor state TTL: https://docs.dapr.io/developing-applications/building-blocks/actors/actors-features-concepts/
- Dapr JS SDK ActorStateManager source: https://github.com/dapr/js-sdk/blob/main/src/actors/runtime/ActorStateManager.ts
- Dapr .NET SDK StateManager: https://github.com/dapr/dotnet-sdk
- Dapr CRD configuration.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/crds/configuration.yaml

## Issues Found

### 1. Invalid metric rules YAML structure (Step 3)
- **What was wrong:** The metric configuration used a `rules` structure with `selector.prefixes` fields that do not exist in the Dapr Configuration API. There is no `selector` or `prefixes` field in the metric rules schema.
- **What was changed:** Replaced the fabricated `rules[].selector.prefixes` structure with the correct `http.increasedCardinality: false` configuration, which is the recommended way to reduce metric cardinality and memory overhead in Dapr.
- **Why:** The Dapr Configuration CRD defines `metric.rules` as having `name` (string) and `labels` (array with regex maps) fields. The `http.increasedCardinality: false` approach is the modern, recommended method for reducing metric overhead per the official Dapr docs.

### 2. Incorrect JavaScript actor state TTL code (Step 6)
- **What was wrong:** The code block was labeled as JavaScript and used `actorStateManager.setStateAsync()`, which is a .NET SDK method naming convention (C# uses the `Async` suffix). The Dapr JS SDK uses `setState()`, not `setStateAsync()`. Additionally, the JS SDK's `setState` method only accepts `(stateName, value)` -- it does not support a TTL options parameter. Actor state TTL is not natively supported in the Dapr JavaScript SDK.
- **What was changed:** Changed the code block to C# (.NET), which is the SDK that actually supports actor state TTL natively via `this.StateManager.SetStateAsync("key", value, TimeSpan.FromSeconds(3600))`.
- **Why:** The .NET SDK is the primary Dapr SDK with full actor state TTL support. The original JavaScript code would not compile or run correctly in any version of the Dapr JS SDK.

## Review Notes
- The `kubectl top pods --containers` output comment shows a NAMESPACE column, but `kubectl top` does not display a NAMESPACE column by default when `-n` is specified. This is a cosmetic issue in the illustrative comment only and does not affect the command's correctness.
- The `kubectl get events --field-selector reason=OOMKilling` command uses the correct event reason for kubelet-reported OOM kill events.
- The component scoping YAML correctly places `scopes` at the root level of the Component resource (alongside `apiVersion`, `kind`, `metadata`, `spec`), which matches the Dapr spec.
- The Prometheus alert rule uses valid PromQL and correct Prometheus alerting rule syntax.
- The ActorStateTTL feature flag configuration is correct for enabling the preview feature in Dapr.
- The Dapr sidecar memory annotations (`dapr.io/sidecar-memory-request` and `dapr.io/sidecar-memory-limit`) are correct.
