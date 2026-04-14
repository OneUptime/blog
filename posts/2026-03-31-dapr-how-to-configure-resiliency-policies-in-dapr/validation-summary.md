# Validation Summary: How to Configure Resiliency Policies in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime) v1.7+
- Dapr Resiliency API (v1alpha1)
- Kubernetes (for deployment)
- Dapr CLI

## Sources Consulted
- Dapr Resiliency documentation: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency policy specs: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency targets documentation: https://docs.dapr.io/operations/resiliency/targets/
- Dapr CLI reference: https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

1. **`backoffMultiplier` field name incorrect (2 occurrences)**: The Dapr resiliency spec uses `multiplier` for the exponential backoff multiplier, not `backoffMultiplier`. Changed both occurrences (in the initial resiliency resource definition and in the standalone exponential retry example) to `multiplier`.

2. **Timeout format incorrect (3 occurrences)**: Dapr resiliency timeouts are flat key-value pairs (e.g., `fast-timeout: 3s`), not nested objects with a `duration` sub-field. The post incorrectly used `fast-timeout: \n  duration: 3s` format. Fixed all three timeout definition blocks to use the correct flat format.

3. **Deprecated CLI flag `--components-path`**: Since Dapr 1.9, `--components-path` has been deprecated in favor of `--resources-path`. Updated the `dapr run` command to use `--resources-path`.

4. **Incorrect verification command**: The post suggested `dapr components --namespace default` to verify resiliency configuration, but `dapr components` lists Dapr component resources, not resiliency resources. Replaced with `kubectl get resiliency` for Kubernetes mode and a note about checking Dapr sidecar logs for self-hosted mode.

## Review Notes
- The actor target example references `standard-timeout` which is defined in the first code block but not in the second snippet's policies section. This is acceptable since the snippets are illustrative, but readers may find it slightly confusing.
- The post states "Dapr CLI installed (v1.7+)" as a prerequisite. Resiliency was a preview feature in v1.7 and became stable in v1.9. Readers using v1.7 or v1.8 would need to explicitly enable the preview feature. This could be mentioned but is not strictly an error.
- The `apiVersion: dapr.io/v1alpha1` is still correct as of current Dapr versions for the Resiliency resource kind.
