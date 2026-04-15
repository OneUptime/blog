# Validation Summary: How to Use Constant Backoff Retries in Dapr

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency API (v1alpha1)
- Constant backoff retry policies
- YAML-based Resiliency resource configuration

## Sources Consulted
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Schema Reference: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr Retry Policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr source code (`pkg/apis/resiliency/v1alpha1/types.go`): https://github.com/dapr/dapr/blob/master/pkg/apis/resiliency/v1alpha1/types.go

## Issues Found
1. **Incorrect total time calculation in "Combining with Timeouts" section.** The post claimed "a maximum total time of approximately 14 seconds" for a configuration with `maxRetries: 4`, a 3s timeout, and a 500ms retry delay. The correct calculation is approximately 17 seconds: 5 total attempts (1 initial + 4 retries) x 3s timeout = 15s, plus 4 x 500ms delay = 2s. Fixed the sentence to state "approximately 17 seconds" and added the breakdown for clarity.

## Review Notes
- All YAML configuration syntax is correct per the Dapr Resiliency specification: `apiVersion: dapr.io/v1alpha1`, `kind: Resiliency`, field names (`policy`, `duration`, `maxRetries`), and target structures (`apps`, `components` with `inbound`/`outbound`).
- The `policy: constant` value, `maxRetries: -1` for unlimited retries, and duration string formats (e.g., `2s`, `250ms`) are all accurate.
- The partial YAML snippets in later examples (omitting `apiVersion`, `kind`, `metadata`, `spec`) are acceptable since the full structure is shown in the first example.
- The conceptual comparison between constant and exponential backoff strategies is accurate.
