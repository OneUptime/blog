# How to Handle Secret Store Unavailability in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Secret, Resilience, Error Handling, High Availability

Description: Learn how to handle Dapr secret store unavailability gracefully using startup caching, retry logic, circuit breakers, and environment variable fallbacks.

---

## The Problem: Secret Store Outages

When your Dapr application starts, it may attempt to read secrets before the secret store is fully available, or the secret store may become unavailable during operation. Without resilience handling, this causes application startup failures or runtime errors.

Dapr itself retries some operations, but application code must handle persistent unavailability gracefully.

## Approach 1: Retry with Exponential Backoff at Startup

```go
package main

import (
    "context"
    "fmt"
    "log"
    "math"
    "time"

    dapr "github.com/dapr/go-sdk/client"
)

func getSecretWithRetry(
    ctx context.Context,
    client dapr.Client,
    storeName, key string,
    maxRetries int,
) (map[string]string, error) {
    for attempt := 0; attempt <= maxRetries; attempt++ {
        secret, err := client.GetSecret(ctx, storeName, key, nil)
        if err == nil {
            return secret, nil
        }

        if attempt == maxRetries {
            return nil, fmt.Errorf("secret store unavailable after %d retries: %w", maxRetries, err)
        }

        // Exponential backoff: 1s, 2s, 4s, 8s...
        delay := time.Duration(math.Pow(2, float64(attempt))) * time.Second
        log.Printf("Secret store unavailable (attempt %d/%d), retrying in %v: %v",
            attempt+1, maxRetries, delay, err)
        time.Sleep(delay)
    }
    return nil, nil
}
```

## Approach 2: Environment Variable Fallback

For critical secrets needed at startup, provide an environment variable fallback:

```python
import os
from dapr.clients import DaprClient
from typing import Optional

def get_secret_with_fallback(key: str, env_var: str) -> Optional[str]:
    """
    Try secret store first, fall back to environment variable.
    Useful for local development or when secret store is unavailable.
    """
    # Try Dapr secret store
    try:
        with DaprClient() as client:
            secret = client.get_secret(store_name="secrets", key=key)
            return secret.secret.get(key)
    except Exception as e:
        print(f"Secret store unavailable for '{key}': {e}")

    # Fall back to environment variable
    value = os.environ.get(env_var)
    if value:
        print(f"Using environment variable fallback: {env_var}")
        return value

    raise RuntimeError(f"Secret '{key}' unavailable from store and env var '{env_var}' not set")

# Usage
db_password = get_secret_with_fallback("database/password", "DB_PASSWORD")
api_key = get_secret_with_fallback("api/stripe-key", "STRIPE_KEY")
```

## Approach 3: Circuit Breaker for Secret Access

Implement a circuit breaker to stop hammering an unavailable secret store:

```javascript
class SecretCircuitBreaker {
  constructor(client, storeName, options = {}) {
    this.client = client;
    this.storeName = storeName;
    this.failureThreshold = options.failureThreshold || 3;
    this.recoveryTimeout = options.recoveryTimeout || 30000;
    this.state = 'CLOSED'; // CLOSED, OPEN, HALF_OPEN
    this.failures = 0;
    this.lastFailureTime = null;
    this.cache = new Map();
  }

  async getSecret(key) {
    // If circuit is OPEN, check if we should try again
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'HALF_OPEN';
      } else {
        // Return cached value if available
        if (this.cache.has(key)) {
          console.warn(`Circuit OPEN - using cached secret for ${key}`);
          return this.cache.get(key);
        }
        throw new Error(`Secret store circuit OPEN - no cache for ${key}`);
      }
    }

    try {
      const secret = await this.client.secret.get(this.storeName, key);
      this.onSuccess();
      this.cache.set(key, secret);
      return secret;
    } catch (err) {
      this.onFailure(err);
      // Return cached value on failure
      if (this.cache.has(key)) {
        console.warn(`Secret store error - using cached value for ${key}`);
        return this.cache.get(key);
      }
      throw err;
    }
  }

  onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  onFailure(err) {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.failureThreshold) {
      console.error(`Circuit OPEN after ${this.failures} failures`);
      this.state = 'OPEN';
    }
  }
}
```

## Approach 4: Kubernetes Init Container

Use an init container to verify the secret store is available before the main container starts:

```yaml
initContainers:
- name: wait-for-vault
  image: curlimages/curl:latest
  command:
  - /bin/sh
  - -c
  - |
    until curl -sf https://vault.example.com:8200/v1/sys/health; do
      echo "Waiting for Vault..."
      sleep 5
    done
    echo "Vault is ready"
```

## Handling Secret Store Resilience with Dapr Resiliency Policies

Configure Dapr's built-in resiliency policies to automatically retry and circuit-break secret store operations at the sidecar level:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: secret-store-resiliency
spec:
  policies:
    retries:
      secretStoreRetry:
        policy: constant
        duration: 5s
        maxRetries: 3
    circuitBreakers:
      secretStoreCB:
        maxRequests: 1
        timeout: 30s
        trip: consecutiveFailures > 3
  targets:
    components:
      my-secret-store:
        outbound:
          retry: secretStoreRetry
          circuitBreaker: secretStoreCB
```

## Summary

Handling secret store unavailability requires a layered approach: retry with exponential backoff at startup, cache secrets in memory with graceful stale fallback, and use environment variable fallbacks for local development and emergencies. A circuit breaker prevents cascading failures when the secret store is down for an extended period. Combine these with Kubernetes init containers to delay service startup until the secret store is healthy.
