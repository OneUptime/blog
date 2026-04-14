# How to Use Dapr Resiliency for External API Calls

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resilience, API, Binding, Service Invocation

Description: Apply Dapr resiliency policies to external API calls via output bindings and service invocation to handle rate limits, timeouts, and transient errors.

---

## External API Challenges

External APIs introduce unpredictability: rate limiting (429), transient errors (503), and slow responses. Dapr output bindings and service invocation support resiliency policies that automatically retry and time out these calls.

## Configuring Resiliency for an Output Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: external-api-resiliency
  namespace: default
spec:
  policies:
    retries:
      apiRetry:
        policy: exponential
        duration: 2s
        maxInterval: 30s
        maxRetries: 4
    timeouts:
      apiTimeout: 10s
    circuitBreakers:
      apiCB:
        maxRequests: 2
        interval: 30s
        timeout: 120s
        trip: consecutiveFailures >= 5
  targets:
    components:
      stripe-payment:
        outbound:
          retry: apiRetry
          timeout: apiTimeout
          circuitBreaker: apiCB
```

```bash
kubectl apply -f external-api-resiliency.yaml
```

## Defining an HTTP Output Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: stripe-payment
  namespace: default
spec:
  type: bindings.http
  version: v1
  metadata:
  - name: url
    value: "https://api.stripe.com/v1/charges"
  - name: MTLSRootCA
    value: ""
```

## Invoking the Binding in Python

```python
import os
import requests
import json

DAPR_HTTP_PORT = os.getenv("DAPR_HTTP_PORT", "3500")

def charge_card(amount: int, currency: str, source: str) -> dict:
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/bindings/stripe-payment"
    payload = {
        "data": {
            "amount": amount,
            "currency": currency,
            "source": source
        },
        "operation": "create",
        "metadata": {
            "Authorization": f"Bearer {os.getenv('STRIPE_SECRET_KEY')}"
        }
    }
    try:
        resp = requests.post(url, json=payload, timeout=12)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.Timeout:
        raise Exception("Payment service timed out - payment state unknown")
    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 429:
            raise Exception("Rate limited by payment provider")
        raise
```

## Using Service Invocation for Internal Wrappers

For external APIs wrapped by an internal service, apply resiliency at the invocation level:

```python
def get_exchange_rate(base: str, target: str) -> float:
    url = f"http://localhost:{DAPR_HTTP_PORT}/v1.0/invoke/forex-service/method/rates"
    params = {"base": base, "target": target}
    resp = requests.get(url, params=params, timeout=12)
    resp.raise_for_status()
    return resp.json()["rate"]
```

## Observing Retry Behavior

Check sidecar logs to see retry attempts:

```bash
kubectl logs -l app=payment-processor -c daprd --tail=100 \
  | grep -E "retry|timeout|circuitBreaker|binding"
```

## Summary

Dapr resiliency policies applied to output bindings automatically handle transient external API failures with exponential backoff retries and circuit breakers. This protects your microservices from being blocked by slow or rate-limited third-party APIs without adding retry logic to your application code.
