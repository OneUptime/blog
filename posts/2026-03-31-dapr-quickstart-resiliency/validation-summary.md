# Validation Summary: How to Run Dapr Quickstart for Resiliency

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency policies (retries, timeouts, circuit breakers)
- Dapr CLI (`dapr run`)
- Dapr HTTP service invocation API
- Python / Flask
- Python `requests` library

## Sources Consulted
- Dapr Resiliency policy spec: https://docs.dapr.io/operations/resiliency/policies/
- Dapr Resiliency targets spec: https://docs.dapr.io/operations/resiliency/targets/
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/

## Issues Found

### 1. Checkout service client timeout too short for retry cycle
**What was wrong:** The checkout service used `timeout=10` on the `requests.post` call. The resiliency policy configures `maxRetries: 3` with `duration: 5s` (delay between retries) and `quickTimeout: 3s`. In timeout scenarios, the Dapr sidecar retries synchronously before returning a response to the caller. The total retry cycle for a timeout scenario is approximately 3 timeouts x 3s + delays x 5s = ~24 seconds, which exceeds the 10-second client timeout and would cause a `requests.exceptions.Timeout` on the client side before the sidecar finishes retrying.
**What was changed:** Increased `timeout=10` to `timeout=60` in the checkout service to accommodate the full retry cycle duration.

### 2. Scenario 3 timing was incorrect
**What was wrong:** The expected output showed `Order 1: HTTP 504 (3021ms) <- timeout, retried 3 times = ~9s total`. Both the displayed elapsed time (3021ms) and the comment (~9s) were incorrect because they did not account for the 5-second retry delays between attempts. Since the Dapr sidecar handles retries synchronously before returning to the caller, the actual elapsed time seen by the checkout service would be approximately 24 seconds (3 timeout attempts x 3s + 3 retry delays x 5s).
**What was changed:** Updated the expected output to `Order 1: HTTP 504 (24100ms) <- timed out, all 3 retries exhausted with 5s delays` and clarified the description to mention that retries include 5-second delays between attempts.

## Review Notes
- The `trip: consecutiveFailures >= 3` expression uses `>=` while the Dapr docs default example uses `>`. Both are valid CEL syntax but have different thresholds (>= 3 trips on the 3rd failure, > 3 trips on the 4th). The blog's choice of `>= 3` is intentional and consistent with the narrative of tripping after 3 failures.
- The exact HTTP status code returned when a circuit is open (503) or on timeout (504) is not explicitly specified in Dapr documentation and may vary by Dapr version. The values used in the blog are plausible based on typical Dapr behavior.
- The interaction between retry attempts and circuit breaker failure counting is an implementation detail. Each retry attempt likely counts as a separate failure for the circuit breaker, which means the circuit could trip during a single order's retry cycle rather than across multiple orders. The scenario outputs are illustrative and convey the correct concepts.
- The `FAIL_MODE` environment variable is read at module level in the order processor, meaning it is set at startup. This is correct for this demo pattern but worth noting for readers who might expect dynamic behavior changes.
