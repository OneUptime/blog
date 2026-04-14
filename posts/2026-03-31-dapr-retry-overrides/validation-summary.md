# Validation Summary: How to Use Retry Overrides in Dapr Resiliency Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency resources (retry, timeout, circuit breaker policies)
- Kubernetes (kubectl commands)
- Helm (environment-specific value files)
- YAML configuration

## Sources Consulted
- Dapr Resiliency Policies documentation: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Retry Policies overview: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Override Default Retries: https://docs.dapr.io/operations/resiliency/policies/retries/override-default-retries/
- Dapr Resiliency Targets documentation: https://docs.dapr.io/operations/resiliency/targets/
- Dapr Resiliency Schema reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/

## Issues Found

### 1. Undocumented exponential retry fields
**What was wrong:** The `standardRetry` and `batchRetry` exponential policy definitions included `initialInterval`, `multiplier`, and `randomizationFactor` fields. These are not valid Dapr resiliency retry configuration fields. The official spec only supports `policy`, `maxInterval`, `maxRetries`, and `matching.*` for exponential policies. Dapr's exponential backoff uses a hardcoded formula: `BackOffDuration = PreviousBackOffDuration * (Random value from 0.5 to 1.5) * 1.5`.

**What was changed:** Removed `initialInterval`, `multiplier`, and `randomizationFactor` from both `standardRetry` and `batchRetry` policy definitions.

### 2. Invalid `default` pseudo-target under `targets.apps`
**What was wrong:** The post used `default:` as a target entry under `targets.apps` to serve as a catch-all for unlisted services. Dapr does not support a `default` pseudo-target. A literal `default` entry would be interpreted as an app with app-id "default", not as a catch-all. The built-in default retry behavior is controlled via reserved policy names like `DaprBuiltInServiceRetries`.

**What was changed:** Removed the `default:` entry from the apps targets section. Updated the explanation to describe how Dapr's built-in default behavior works and how to override it using `DaprBuiltInServiceRetries`.

### 3. Invalid `default` pseudo-target under `targets.components`
**What was wrong:** Same issue as above but under `targets.components`. The `default:` entry with `outbound.retry` is not a valid catch-all mechanism.

**What was changed:** Removed the `default:` entry from the components targets section.

## Review Notes
- The Helm values pattern in the "Environment-Specific Overrides" section is a generic templating approach and is correct conceptually, though the actual Helm template that consumes these values is not shown. This is acceptable for illustrative purposes.
- The `kubectl get resiliency` command assumes the Dapr CRDs are installed, which is standard for any Dapr-enabled cluster.
- The post correctly shows that `timeout`, `retry`, and `circuitBreaker` can be independently assigned per target, which is confirmed by official documentation.
