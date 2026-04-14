# How to Implement Service Discovery Configuration with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Discovery, Configuration, Kubernetes, Microservice

Description: Manage service endpoint configuration dynamically with the Dapr Configuration API so services discover each other without hardcoded URLs or redeployment.

---

## The Challenge of Service Discovery Config

Kubernetes provides DNS-based service discovery, but you often need to configure more than just the hostname: timeouts, retry counts, circuit breaker thresholds, and load balancing hints. Storing these in Dapr's Configuration API lets you update them without restarting services.

## Storing Service Discovery Config

```bash
# Payment service connection config
redis-cli MSET \
  "payment-service:host" "payment-svc.payments.svc.cluster.local" \
  "payment-service:port" "3500" \
  "payment-service:timeout" "5000" \
  "payment-service:maxRetries" "3" \
  "payment-service:enabled" "true"

# Order service config
redis-cli MSET \
  "order-service:host" "order-svc.orders.svc.cluster.local" \
  "order-service:port" "3500" \
  "order-service:timeout" "10000" \
  "order-service:maxRetries" "5"
```

## Dapr Configuration Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: service-config
spec:
  type: configuration.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
```

## Service Registry Client

```typescript
import { DaprClient } from "@dapr/dapr";

interface ServiceEndpoint {
  host: string;
  port: number;
  timeout: number;
  maxRetries: number;
  enabled: boolean;
}

class ServiceRegistry {
  private client: DaprClient;
  private storeName: string;
  private cache = new Map<string, ServiceEndpoint>();

  constructor(storeName = "service-config") {
    this.client = new DaprClient();
    this.storeName = storeName;
  }

  async loadService(serviceName: string): Promise<void> {
    const keys = [
      `${serviceName}:host`,
      `${serviceName}:port`,
      `${serviceName}:timeout`,
      `${serviceName}:maxRetries`,
      `${serviceName}:enabled`,
    ];

    const result = await this.client.configuration.get(this.storeName, keys);
    const items = result.items as Record<string, { value: string }>;

    this.cache.set(serviceName, {
      host: items[`${serviceName}:host`]?.value ?? "localhost",
      port: parseInt(items[`${serviceName}:port`]?.value ?? "3500", 10),
      timeout: parseInt(items[`${serviceName}:timeout`]?.value ?? "5000", 10),
      maxRetries: parseInt(items[`${serviceName}:maxRetries`]?.value ?? "3", 10),
      enabled: items[`${serviceName}:enabled`]?.value === "true",
    });
  }

  getEndpoint(serviceName: string): ServiceEndpoint | undefined {
    return this.cache.get(serviceName);
  }

  async watchService(serviceName: string): Promise<void> {
    const keys = [`${serviceName}:host`, `${serviceName}:port`, `${serviceName}:timeout`];
    await this.client.configuration.subscribeWithKeys(this.storeName, keys, (resp) => {
      const existing = this.cache.get(serviceName) ?? {} as ServiceEndpoint;
      for (const [key, item] of Object.entries(resp.items)) {
        const field = key.split(":")[1] as keyof ServiceEndpoint;
        (existing as any)[field] = item.value;
      }
      this.cache.set(serviceName, existing);
      console.log(`Service config updated for ${serviceName}`);
    });
  }
}
```

## Calling a Service Using Dynamic Config

```typescript
async function callPaymentService(payload: object): Promise<object> {
  const registry = new ServiceRegistry();
  await registry.loadService("payment-service");
  const endpoint = registry.getEndpoint("payment-service");

  if (!endpoint?.enabled) {
    throw new Error("payment-service is currently disabled");
  }

  const response = await fetch(
    `http://localhost:${endpoint.port}/v1.0/invoke/payment-service/method/charge`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(endpoint.timeout),
    }
  );

  return response.json();
}
```

## Updating Service Config at Runtime

```bash
# Increase timeout for payment service during a slow period
redis-cli SET "payment-service:timeout" "15000"

# Disable a service for maintenance
redis-cli SET "payment-service:enabled" "false"
```

## Summary

The Dapr Configuration API complements Kubernetes DNS-based service discovery by storing operational knobs like timeouts, retry counts, and circuit breaker thresholds. Subscriptions ensure all pods see updates within seconds. This pattern is especially useful in hybrid or multi-cluster environments where endpoint addresses change frequently.
