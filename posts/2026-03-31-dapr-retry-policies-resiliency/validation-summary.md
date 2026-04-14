# Validation Summary: How to Configure Dapr Retry Policies with Resiliency CRD

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency CRD (Custom Resource Definition)
- Kubernetes
- YAML configuration

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Retry Policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr CLI Reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

### 1. Non-existent "linear" retry policy (Critical)
**What was wrong:** The post described a "Linear Backoff" retry policy type (`policy: linear`) as a supported Dapr feature. Dapr only supports two retry policy types: `constant` and `exponential`. There is no `linear` policy.
**What was changed:** Removed the entire "Linear Backoff" subsection and all references to `linear` in the policy structure template, description, and summary. Updated `policy: <constant|linear|exponential>` to `policy: <constant|exponential>`.

### 2. Incorrect field name `matchHttpResponseCodes` (Critical)
**What was wrong:** The "Retry with Jitter" section used `matchHttpResponseCodes: [429, 500, 502, 503, 504]` as a flat field. The correct Dapr syntax uses a nested `matching` object with `httpStatusCodes` as a comma-separated string.
**What was changed:** Replaced with the correct nested structure:
```yaml
matching:
  httpStatusCodes: "429,500-504"
```

### 3. Non-existent `initialInterval` field (Moderate)
**What was wrong:** Exponential retry examples used `initialInterval` as the field name for the initial backoff duration. The correct field name in Dapr is `duration`.
**What was changed:** Replaced all occurrences of `initialInterval` with `duration` in exponential policy examples (3 occurrences).

### 4. Non-existent `multiplier` field (Moderate)
**What was wrong:** Exponential retry examples included a `multiplier` field (e.g., `multiplier: 2.0`, `multiplier: 1.5`). Dapr's exponential backoff uses a hardcoded formula (`PreviousBackOffDuration * (Random value from 0.5 to 1.5) * 1.5`) and does not expose a configurable multiplier.
**What was changed:** Removed all `multiplier` fields from exponential policy examples.

### 5. Deprecated `--components-path` CLI flag (Minor)
**What was wrong:** The self-hosted mode examples used `--components-path`, which is deprecated in favor of `--resources-path`.
**What was changed:** Replaced `--components-path` with `--resources-path` in all CLI examples.

### 6. Inaccurate exponential backoff description (Minor)
**What was wrong:** The exponential backoff section stated "Wait time doubles each attempt." Dapr's exponential backoff uses a 1.5x multiplier with jitter (random factor between 0.5-1.5), not a strict doubling.
**What was changed:** Updated to "Wait time increases exponentially with each attempt."

## Review Notes
- The "Retry with Jitter" section title is slightly misleading — Dapr's exponential backoff includes jitter by default via a randomization factor in the formula. There is no separate jitter configuration. The section is technically correct in that using exponential backoff provides jitter, but readers may expect an explicit jitter toggle.
- The `apiVersion: dapr.io/v1alpha1` is current as of the documentation consulted.
- The Mermaid sequence diagram accurately represents how Dapr sidecar retry works.
- The Kubernetes commands (`kubectl get resiliency`, `kubectl describe resiliency`) are correct.
