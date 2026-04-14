# How to Implement Fallback Strategies with Dapr Resiliency

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Resiliency, Fallback, Fault Tolerance, Microservice

Description: Learn how to implement fallback strategies in Dapr applications using circuit breaker callbacks, cached responses, and degraded-mode service paths.

---

## What Are Fallback Strategies?

A fallback strategy defines what your application does when a primary operation fails permanently - after retries are exhausted or the circuit breaker is open. Rather than returning an error to the user, fallbacks provide degraded but functional behavior: cached data, default values, or an alternative service.

Dapr does not provide built-in fallback callbacks, but the pattern is easily implemented in application code around Dapr API calls.

## Pattern 1: Cached Data Fallback

Return the last known good response when the live service is unavailable:

```python
import json
import time
from dapr.clients import DaprClient

class ServiceWithFallback:
    def __init__(self, state_store: str):
        self.state_store = state_store

    def get_product_catalog(self) -> list:
        """Fetch product catalog with cache fallback."""
        with DaprClient() as client:
            try:
                # Try live service
                response = client.invoke_method(
                    app_id="catalog-service",
                    method_name="products",
                    data=b"",
                )
                products = json.loads(response.data)

                # Update cache on success
                client.save_state(
                    store_name=self.state_store,
                    key="catalog:cache",
                    value=json.dumps({
                        "products": products,
                        "cachedAt": time.time(),
                    }),
                )
                return products

            except Exception as e:
                print(f"Catalog service unavailable: {e}, trying cache")

                # Fall back to cached version
                cached = client.get_state(
                    store_name=self.state_store,
                    key="catalog:cache",
                )
                if cached.data:
                    data = json.loads(cached.data)
                    age = time.time() - data.get("cachedAt", 0)
                    print(f"Serving cached catalog (age: {age:.0f}s)")
                    return data["products"]

                # No cache available - return empty with degraded flag
                print("No cache available, returning empty catalog")
                return []
```

## Pattern 2: Default Value Fallback

Return safe defaults when a configuration or recommendation service is unavailable:

```javascript
const { DaprClient, HttpMethod } = require('@dapr/dapr');

const client = new DaprClient();

const DEFAULT_CONFIG = {
  maxItemsPerPage: 20,
  featuredCategories: ['electronics', 'books'],
  promotionsEnabled: false,   // Safe default: disable promotions
  searchTimeout: 5000,
};

async function getAppConfig() {
  try {
    const config = await client.invoker.invoke(
      'config-service',
      'app-config',
      HttpMethod.GET,
    );
    return config;
  } catch (err) {
    console.warn('Config service unavailable, using defaults:', err.message);
    return DEFAULT_CONFIG;
  }
}

async function getRecommendations(userId) {
  try {
    return await client.invoker.invoke(
      'recommendation-service',
      `recommendations/${userId}`,
      HttpMethod.GET,
    );
  } catch (err) {
    console.warn(`Recommendations unavailable for ${userId}, returning trending items`);
    // Fall back to generic trending items
    return await getTrendingItems();
  }
}
```

## Pattern 3: Alternative Service Fallback

Route to a secondary service when the primary is unavailable:

```go
package main

import (
    "context"
    "fmt"
    "log"

    dapr "github.com/dapr/go-sdk/client"
)

func processPayment(ctx context.Context, client dapr.Client, payment Payment) (*PaymentResult, error) {
    // Try primary payment processor
    result, err := invokeService(ctx, client, "stripe-service", "charge", payment)
    if err == nil {
        return result, nil
    }

    log.Printf("Primary payment processor failed: %v, trying fallback", err)

    // Fall back to secondary payment processor
    result, err = invokeService(ctx, client, "paypal-service", "charge", payment)
    if err == nil {
        result.Provider = "paypal-fallback"
        return result, nil
    }

    log.Printf("Both payment processors failed: %v", err)
    return nil, fmt.Errorf("all payment processors unavailable")
}
```

## Pattern 4: Graceful Degradation with Feature Flags

Disable non-critical features when dependencies are unavailable:

```python
class OrderService:
    def __init__(self):
        self.features = {
            "recommendations": True,
            "inventory_check": True,
            "fraud_detection": True,
        }

    async def create_order(self, order_request: dict) -> dict:
        result = {"orderId": generate_id(), "status": "pending", "warnings": []}

        # Inventory check - critical path
        inventory_ok = await self._check_inventory(order_request["items"])
        if not inventory_ok:
            return {"error": "Items out of stock"}

        # Fraud detection - non-critical, degrade gracefully
        if self.features["fraud_detection"]:
            try:
                fraud_score = await self._check_fraud(order_request)
                result["fraudScore"] = fraud_score
            except Exception:
                result["warnings"].append("fraud-check-skipped")
                self.features["fraud_detection"] = False

        # Recommendations - non-critical, degrade gracefully
        if self.features["recommendations"]:
            try:
                result["recommendations"] = await self._get_recommendations(order_request)
            except Exception:
                result["warnings"].append("recommendations-unavailable")

        result["status"] = "confirmed"
        return result
```

## Dapr Resiliency with Fallback Endpoint

Configure separate endpoints for primary and fallback services:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Resiliency
metadata:
  name: payment-resiliency
spec:
  policies:
    circuitBreakers:
      primaryCB:
        timeout: 30s
        trip: consecutiveFailures > 3
  targets:
    apps:
      stripe-service:
        circuitBreaker: primaryCB
```

## Summary

Dapr fallback strategies are implemented in application code around Dapr API calls since Dapr does not have a built-in fallback callback mechanism. The key patterns are: cached data fallback (return last known good state), default value fallback (return safe defaults), alternative service fallback (route to a secondary provider), and graceful degradation (disable non-critical features). Combine with Dapr resiliency policies to know when to activate fallback logic.
