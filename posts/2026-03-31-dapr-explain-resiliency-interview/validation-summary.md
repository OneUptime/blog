# Validation Summary: How to Explain Dapr Resiliency in an Interview

## Status
validated

## Post Type
Interview Preparation Guide / Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime) v1.7+
- Dapr Resiliency policies (retries, circuit breakers, timeouts)
- Kubernetes (for deploying resiliency CRDs)
- Go (Dapr Go SDK for code comparison example)
- gRPC and HTTP status codes (for retry matching)

## Sources Consulted
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr Resiliency policies spec: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency targets spec: https://docs.dapr.io/operations/resiliency/targets/
- Dapr CLI reference: https://docs.dapr.io/reference/cli/
- Dapr Go SDK (github.com/dapr/go-sdk) for InvokeMethod API verification
- gRPC status codes specification (grpc.io)
- Circuit breaker pattern (standard Closed/Open/Half-Open states)

## Issues Found
1. **Incorrect CLI command for verifying resiliency policies (line 96)**: The post used `dapr components -k` with the comment "Verify the policy is loaded." The `dapr components -k` command lists Dapr components (state stores, pub/sub brokers, etc.), not resiliency policies. Since Resiliency is a separate Kubernetes CRD, the correct command to verify a resiliency policy is `kubectl get resiliency -n production`. Fixed by replacing `dapr components -k` with `kubectl get resiliency -n production`.

## Review Notes
- The retry policy named `retryForever` has `maxRetries: 10`, which is a slightly misleading name since it does not actually retry forever. This is a naming style choice, not a technical error.
- The `trip: consecutiveFailures >= 5` expression is a valid CEL expression that trips the circuit breaker on the 5th consecutive failure. The Dapr docs use `> 5` as the default example (which trips on the 6th failure). The blog's choice of `>= 5` is valid and arguably more intuitive.
- The Go code examples are illustrative and correctly demonstrate the conceptual difference between manual retry logic and Dapr-managed resiliency. Minor simplifications (e.g., not closing HTTP response bodies) are acceptable for illustrative code.
- The `initialInterval` field used in the exponential retry example is a valid Dapr retry policy field supported by the underlying backoff library.
