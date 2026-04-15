# Validation Summary: How to Set Default Resiliency Policies in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency resources (timeouts, retries, circuit breakers)
- Kubernetes (kubectl, CRDs, namespaces)
- YAML configuration

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency Targets: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Retry Policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Override Default Retries: https://docs.dapr.io/operations/resiliency/policies/retries/override-default-retries/
- Dapr Circuit Breaker Policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr source code: `pkg/resiliency/resiliency.go` and `pkg/apis/resiliency/v1alpha1/types.go`

## Issues Found

### 1. Incorrect use of `default` as a catch-all target key
**What was wrong:** The post used `targets.apps.default` and `targets.components.default` as a special catch-all mechanism that would apply policies to any service/component without an explicit target. This key name is not a documented Dapr feature. The Dapr source code treats target maps as literal app ID / component name lookups — a key named `default` would only match an app whose Dapr App ID is literally "default", not act as a catch-all.

**What was changed:** Replaced the `default` target key examples with the documented approach: using `DaprBuiltIn*` reserved keywords (`DaprBuiltInServiceRetries`, `DaprBuiltInActorRetries`, `DaprBuiltInInitializationRetries`) to override built-in default retry behavior, and explicit app ID / component name targets for custom policies.

**Why:** The Dapr documentation shows only explicit app IDs and component names as target keys. Default retry behavior is overridden through reserved named keywords, not a special `default` target key.

### 2. Undocumented retry policy fields
**What was wrong:** The retry policy configuration included `initialInterval: 500ms`, `multiplier: 2.0`, and `randomizationFactor: 0.5`. These fields are not documented as user-configurable retry policy parameters in the official Dapr documentation.

**What was changed:** Removed `initialInterval`, `multiplier`, and `randomizationFactor` from the retry policy definition. Kept only the documented fields: `policy`, `maxInterval`, and `maxRetries`.

**Why:** The official Dapr retry policy documentation lists only `policy`, `duration`, `maxInterval`, `maxRetries`, and `matching` as configurable fields.

### 3. Missing `scopes` field
**What was wrong:** The Resiliency resource YAML examples were missing the `scopes` field, which controls which Dapr App IDs can use the resiliency spec.

**What was changed:** Added the `scopes` field to the main YAML example, positioned at the top level alongside `metadata` and `spec` (matching the official docs structure).

**Why:** The official Dapr Resiliency documentation includes `scopes` in all examples and explicitly states it "lists the Dapr App IDs that this resiliency spec can be used by."

### 4. Inaccurate namespace-wide scoping claim
**What was wrong:** The post claimed "A single Resiliency resource with defaults in a namespace provides a baseline for all services in that namespace" and "Services with no specific resiliency configuration automatically inherit the namespace defaults." This implied namespace-based scoping, which is not how Dapr resiliency works.

**What was changed:** Updated the "Namespace-Wide Defaults" section to explain that scoping is controlled by the `scopes` field (app-ID-based), not namespace-based. Clarified that without `scopes`, the resiliency spec is available to all apps that load it.

**Why:** Dapr Resiliency scoping is based on explicit App ID listing in the `scopes` field, not Kubernetes namespace membership.

### 5. Incorrect priority order
**What was wrong:** The priority order referenced a "Default target" concept that doesn't exist in Dapr's documented behavior.

**What was changed:** Updated to reflect the actual order: explicit target match > built-in default retry policies (or their `DaprBuiltIn*` overrides) > no policy.

**Why:** The documented fallback mechanism uses built-in default retries and reserved override keywords, not a "default target" concept.

## Review Notes
- The `trip: consecutiveFailures >= 5` syntax in the circuit breaker configuration is correct — the official Dapr resiliency overview example uses this exact syntax. The circuit breaker sub-page shows `> 5` as a default, but `>=` is a valid CEL operator.
- The `DaprBuiltIn*` override mechanism only applies to retries. There are no documented built-in default timeout or circuit breaker policies that can be overridden globally — these must be set per-target.
- The `kubectl get resiliency` and `kubectl logs` verification commands are correct.
- Component targets correctly support `inbound` and `outbound` sub-keys as documented.
