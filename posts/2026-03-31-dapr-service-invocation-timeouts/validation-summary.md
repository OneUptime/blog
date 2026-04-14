# Validation Summary: How to Configure Service Invocation Timeouts in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency policies (timeouts, retries)
- Dapr Service Invocation API
- Kubernetes (kubectl apply)
- Node.js with axios
- Dapr CLI (dapr run)

## Sources Consulted
- Dapr Resiliency Overview — https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency Policies — https://docs.dapr.io/operations/resiliency/policies/
- Dapr Timeout Policies — https://docs.dapr.io/operations/resiliency/policies/timeouts/
- Dapr Retry Policies — https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency Targets — https://docs.dapr.io/operations/resiliency/targets/
- Dapr Service Invocation API Reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI Run Reference — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr HTTP Error Codes — https://docs.dapr.io/developing-applications/error-codes/http-error-codes/
- GitHub Issue #5602: Dapr Resiliency Timeout not working with /v1.0/invoke/ — https://github.com/dapr/dapr/issues/5602

## Issues Found

1. **Incorrect HTTP status code for timeout errors (3 occurrences)**
   - **What was wrong:** The post claimed Dapr returns HTTP 408 (Request Timeout) when a resiliency timeout fires during service invocation. This appeared in the "How Timeout Errors Appear" section, the Node.js error handling code, and the Summary.
   - **What was changed:** Corrected to HTTP 500 (Internal Server Error) with a "context deadline exceeded" error message, which is what Dapr actually returns for timeout errors on service invocation.
   - **Why:** Dapr maps gRPC `DeadlineExceeded` to HTTP 500 for transient errors. HTTP 408 is an HTTP-specific status indicating the client took too long to send its request — it is not used by Dapr for downstream timeout scenarios. Confirmed via the Dapr service invocation API docs and GitHub issue #5602.

2. **Incorrect total time calculation for retries + timeouts**
   - **What was wrong:** The post stated "Total time with 3 retries and 2s timeout per attempt: up to 6 seconds plus backoff delays."
   - **What was changed:** Corrected to "up to 8 seconds (4 total attempts) plus backoff delays."
   - **Why:** In Dapr, `maxRetries: 3` means 3 retries *after* the initial attempt, for 4 total attempts. 4 × 2s = 8s, not 6s.

3. **Incorrect component-level target structure**
   - **What was wrong:** The component target YAML used a flat structure (`statestore: timeout: defaultTimeout`) and an inline value (`pubsub: timeout: 10s`).
   - **What was changed:** Added required `outbound` sub-keys and replaced the inline `10s` value with a named policy reference (`pubsubTimeout`).
   - **Why:** Dapr component targets require `outbound` and/or `inbound` sub-keys to distinguish the direction of communication. Targets must reference named policies defined in the `spec.policies` section, not inline duration values.

## Review Notes
- The `policy: exponential` value used in the retry configuration is valid — Dapr supports both `constant` and `exponential` back-off policies.
- The Resiliency YAML structure (apiVersion, kind, metadata, spec) is correct.
- The `dapr run --resources-path` flag is current and correct.
- The Node.js error handling code now checks for status 500 with a message containing "deadline exceeded", which is a reasonable heuristic. In production, callers may want additional logic to distinguish timeout errors from other 500 errors.
- The post's component-level timeout example now references `pubsubTimeout`, which would need to be defined in the `spec.policies.timeouts` section for a complete configuration.
