# How to Handle Timeout Errors in Dapr Service Invocation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Timeout, Service Invocation, Resiliency, Error Handling

Description: Learn how to configure and handle timeout errors in Dapr service invocation using resiliency policies, fallbacks, and circuit breakers.

---

## Why Timeouts Matter in Dapr

Without timeouts, a slow downstream service can exhaust your thread pool and cascade failures across your entire application. Dapr service invocation provides configurable timeouts at the resiliency policy level, so you can enforce SLAs without adding per-call timeout logic to every service call.

## Configuring Timeouts in Resiliency Policy

Define timeout behavior declaratively:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: payment-resiliency
  namespace: orders
spec:
  policies:
    timeouts:
      quickTimeout: 2s
      standardTimeout: 10s
      longRunningTimeout: 60s

    retries:
      onTimeout:
        policy: constant
        duration: 1s
        maxRetries: 2
        matching:
          httpStatusCodes: "408,504"

    circuitBreakers:
      paymentCB:
        maxRequests: 1
        timeout: 30s
        trip: consecutiveFailures >= 3

  targets:
    apps:
      payment-service:
        timeout: standardTimeout
        retry: onTimeout
        circuitBreaker: paymentCB
      report-service:
        timeout: longRunningTimeout
```

## Handling Timeout Exceptions in Code

Catch timeout errors and implement fallback behavior:

```python
from dapr.clients import DaprClient
from dapr.clients.exceptions import DaprInternalError
import json
import logging

logger = logging.getLogger(__name__)

def get_payment_status(order_id: str) -> dict:
    with DaprClient() as client:
        try:
            response = client.invoke_method(
                app_id="payment-service",
                method_name=f"orders/{order_id}/payment-status",
                http_verb="GET"
            )
            return json.loads(response.data)
        except DaprInternalError as e:
            if "408" in str(e) or "DEADLINE_EXCEEDED" in str(e):
                logger.warning(
                    f"Payment service timeout for order {order_id}, "
                    "returning cached status"
                )
                return get_cached_payment_status(order_id)
            raise
```

## Per-Request Timeout Override

Set a timeout on an individual call using the built-in `timeout` parameter:

```python
import json
from dapr.clients import DaprClient

def call_with_deadline(app_id: str, method: str, data: dict, timeout_sec: int):
    with DaprClient() as client:
        response = client.invoke_method(
            app_id=app_id,
            method_name=method,
            data=json.dumps(data),
            content_type="application/json",
            timeout=timeout_sec
        )
        return json.loads(response.data)
```

## Observing Timeouts with Dapr Metrics

Dapr exposes Prometheus metrics for timeout tracking:

```bash
# Check timeout rate for payment-service invocations
curl http://localhost:9090/api/v1/query?query=dapr_runtime_service_invocation_res_recv_total{app_id="order-service",status="504"}
```

Add a Grafana alert for sustained timeout spikes:

```yaml
alert: ServiceInvocationTimeoutHigh
expr: |
  rate(dapr_runtime_service_invocation_res_recv_total{status="504"}[5m]) > 0.05
for: 2m
labels:
  severity: warning
annotations:
  summary: "High timeout rate for {{ $labels.app_id }}"
```

## Graceful Degradation Pattern

Return a degraded response when the circuit breaker is open:

```python
def get_product_recommendations(user_id: str) -> list:
    try:
        return call_recommendation_service(user_id)
    except Exception:
        # Return popular items as fallback
        logger.info(f"Recommendation service unavailable, returning defaults for {user_id}")
        return get_popular_products(limit=5)
```

## Summary

Dapr resiliency policies provide declarative timeout configuration for all service invocations without modifying application code. Combining timeouts with retries and circuit breakers creates a resilient call chain that fails fast and recovers gracefully. Always implement fallback behavior for timeout-sensitive calls to maintain user experience during downstream slowness.
