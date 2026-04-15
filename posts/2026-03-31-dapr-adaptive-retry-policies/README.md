# How to Implement Adaptive Retry Policies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Retry, Adaptive, Fault Tolerance

Description: Learn how to implement adaptive retry policies in Dapr that adjust retry behavior based on observed error rates, service health, and operational context.

---

## What Are Adaptive Retry Policies?

Static retry policies apply the same retry configuration regardless of the current state of the system. Adaptive retry policies adjust their behavior dynamically based on observed conditions - backing off faster when errors are frequent, skipping retries when the circuit is open, or using shorter delays during business hours when latency matters more.

Dapr's built-in resiliency is static configuration, but adaptive behavior is layered on top in application code.

## Approach 1: Dynamic Resiliency Configuration

Dapr Resiliency policies are applied at the component level, but you can create multiple policies and switch between them based on deployment configuration:

```yaml
# Conservative policy for production - fewer retries, slower backoff
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: production-resiliency
  namespace: production
spec:
  policies:
    retries:
      adaptiveRetry:
        policy: exponential
        maxRetries: 5
        maxInterval: 30s

    circuitBreakers:
      protectiveCB:
        interval: 60s
        timeout: 120s
        trip: consecutiveFailures > 3

  targets:
    apps:
      downstream-service:
        retry: adaptiveRetry
        circuitBreaker: protectiveCB
---
# Aggressive policy for staging - more retries, faster backoff
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: staging-resiliency
  namespace: staging
spec:
  policies:
    retries:
      adaptiveRetry:
        policy: exponential
        maxRetries: 10
        maxInterval: 5s
```

## Approach 2: Error Rate Tracking in Application Code

Track error rates in your application and adjust behavior:

```python
import json
import time
import random
import threading
from collections import deque
from dapr.clients import DaprClient

class AdaptiveRetryClient:
    """Adjusts retry behavior based on observed error rates."""

    def __init__(self, app_id: str, window_seconds: int = 60):
        self.app_id = app_id
        self.window_seconds = window_seconds
        self._errors = deque()
        self._successes = deque()
        self._lock = threading.Lock()

    def _record_outcome(self, success: bool):
        now = time.time()
        cutoff = now - self.window_seconds
        with self._lock:
            if success:
                self._successes.append(now)
            else:
                self._errors.append(now)
            # Prune old entries
            while self._errors and self._errors[0] < cutoff:
                self._errors.popleft()
            while self._successes and self._successes[0] < cutoff:
                self._successes.popleft()

    def _error_rate(self) -> float:
        with self._lock:
            total = len(self._errors) + len(self._successes)
            if total == 0:
                return 0.0
            return len(self._errors) / total

    def _get_retry_config(self) -> dict:
        """Adapt retry config based on current error rate."""
        rate = self._error_rate()

        if rate > 0.7:
            # High error rate - minimal retries, long backoff
            return {"max_retries": 1, "base_delay": 5.0, "max_delay": 30.0}
        elif rate > 0.3:
            # Moderate error rate - reduced retries
            return {"max_retries": 3, "base_delay": 1.0, "max_delay": 10.0}
        else:
            # Low error rate - standard retries
            return {"max_retries": 5, "base_delay": 0.5, "max_delay": 20.0}

    def invoke(self, method: str, data: dict) -> dict:
        config = self._get_retry_config()
        max_retries = config["max_retries"]
        base_delay = config["base_delay"]

        print(f"Error rate: {self._error_rate():.1%}, using config: {config}")

        for attempt in range(max_retries + 1):
            try:
                with DaprClient() as client:
                    response = client.invoke_method(
                        app_id=self.app_id,
                        method_name=method,
                        data=json.dumps(data),
                        content_type="application/json",
                    )
                    self._record_outcome(success=True)
                    return response.json()
            except Exception as e:
                self._record_outcome(success=False)
                if attempt == max_retries:
                    raise

                delay = min(base_delay * (2 ** attempt), config["max_delay"])
                delay *= random.uniform(0.75, 1.25)  # jitter
                time.sleep(delay)
```

## Approach 3: Context-Aware Retry Policies

Adjust retry behavior based on request context or business rules:

```javascript
import { HttpMethod } from "@dapr/dapr";

class ContextAwareRetryClient {
  constructor(daprClient) {
    this.client = daprClient;
  }

  async invoke(appId, method, data, context = {}) {
    const config = this.getRetryConfig(context);

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const result = await this.client.invoker.invoke(appId, method, HttpMethod.POST, data);
        return result;
      } catch (err) {
        if (attempt === config.maxRetries) throw err;

        // Don't retry certain error types regardless of config
        if (err.status === 400 || err.status === 401 || err.status === 403) {
          throw err; // Non-retryable
        }

        const delay = Math.min(
          config.baseDelay * Math.pow(config.multiplier, attempt),
          config.maxDelay
        );
        console.log(`Attempt ${attempt + 1} failed, waiting ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  getRetryConfig(context) {
    // High-priority requests get more retries
    if (context.priority === 'critical') {
      return { maxRetries: 8, baseDelay: 200, maxDelay: 10000, multiplier: 1.5 };
    }

    // Background jobs can wait longer
    if (context.type === 'background') {
      return { maxRetries: 10, baseDelay: 5000, maxDelay: 60000, multiplier: 2 };
    }

    // User-facing requests need fast failure
    if (context.type === 'user-facing') {
      return { maxRetries: 2, baseDelay: 100, maxDelay: 500, multiplier: 2 };
    }

    // Default
    return { maxRetries: 3, baseDelay: 500, maxDelay: 5000, multiplier: 2 };
  }
}
```

## Integrating with Dapr Resiliency

Combine adaptive application-level retry logic with Dapr's built-in resiliency:

```yaml
spec:
  policies:
    circuitBreakers:
      adaptiveCB:
        interval: 30s
        timeout: 60s
        trip: consecutiveFailures > 5   # Dapr opens circuit after 5 consecutive failures
  targets:
    apps:
      target-service:
        circuitBreaker: adaptiveCB
        # No retry policy here - handled adaptively in application code
```

## Summary

Adaptive retry policies in Dapr combine Dapr's static resiliency configuration with application-level logic that tracks error rates and adjusts retry parameters dynamically. Use multiple resiliency configurations per environment for coarse-grained adaptation, and implement error rate tracking in application code for fine-grained adaptive behavior. Context-aware retry logic adjusts aggressiveness based on request priority, type, and observed system health.
