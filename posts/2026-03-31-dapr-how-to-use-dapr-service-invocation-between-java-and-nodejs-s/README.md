# How to Use Dapr Service Invocation Between Java and Node.js

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Service Invocation, Java, Node.js, Microservice

Description: Configure Dapr service invocation between Java Spring Boot and Node.js Express services with SDK examples and error handling.

---

## Overview

Dapr makes it straightforward for Java Spring Boot services to call Node.js services and vice versa without dealing with service discovery or TLS configuration. This guide demonstrates how to set up cross-language service invocation using both the Dapr Java SDK and the Node.js SDK.

## Node.js Target Service

Create a Node.js Express service that the Java service will call:

```javascript
// inventory-service/app.js
const express = require('express');
const app = express();
app.use(express.json());

const inventory = {
  'sku-001': { sku: 'sku-001', quantity: 150, location: 'Warehouse A' },
  'sku-002': { sku: 'sku-002', quantity: 30, location: 'Warehouse B' },
};

app.get('/inventory/:sku', (req, res) => {
  const item = inventory[req.params.sku];
  if (!item) {
    return res.status(404).json({ error: 'SKU not found' });
  }
  res.json(item);
});

app.post('/inventory/reserve', (req, res) => {
  const { sku, quantity } = req.body;
  const item = inventory[sku];
  if (!item || item.quantity < quantity) {
    return res.status(400).json({ error: 'Insufficient stock' });
  }
  item.quantity -= quantity;
  res.json({ reserved: true, remaining: item.quantity });
});

app.listen(3000, () => console.log('Inventory service on port 3000'));
```

Start with Dapr:

```bash
dapr run --app-id inventory-service --app-port 3000 -- node app.js
```

## Java Spring Boot Caller Service

Add Dapr dependencies to `pom.xml`:

```xml
<dependencies>
  <dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk-springboot</artifactId>
    <version>1.11.0</version>
  </dependency>
  <dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk</artifactId>
    <version>1.11.0</version>
  </dependency>
</dependencies>
```

Configure the Dapr client bean:

```java
// src/main/java/com/example/order/DaprConfig.java
package com.example.order;

import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DaprConfig {
    @Bean
    public DaprClient daprClient() {
        return new DaprClientBuilder().build();
    }
}
```

Create the inventory client service:

```java
// src/main/java/com/example/order/InventoryClient.java
package com.example.order;

import io.dapr.client.DaprClient;
import io.dapr.client.domain.HttpExtension;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

@Service
public class InventoryClient {

    private final DaprClient daprClient;
    private static final String INVENTORY_APP_ID = "inventory-service";

    public InventoryClient(DaprClient daprClient) {
        this.daprClient = daprClient;
    }

    public Mono<InventoryItem> getInventory(String sku) {
        return daprClient.invokeMethod(
            INVENTORY_APP_ID,
            "inventory/" + sku,
            null,
            HttpExtension.GET,
            InventoryItem.class
        );
    }

    public Mono<ReservationResult> reserveInventory(ReservationRequest request) {
        return daprClient.invokeMethod(
            INVENTORY_APP_ID,
            "inventory/reserve",
            request,
            HttpExtension.POST,
            ReservationResult.class
        );
    }
}
```

Create the DTOs:

```java
// InventoryItem.java
package com.example.order;

public record InventoryItem(String sku, int quantity, String location) {}

// ReservationRequest.java
public record ReservationRequest(String sku, int quantity) {}

// ReservationResult.java
public record ReservationResult(boolean reserved, int remaining) {}
```

Create the order controller:

```java
// OrderController.java
package com.example.order;

import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/orders")
public class OrderController {

    private final InventoryClient inventoryClient;

    public OrderController(InventoryClient inventoryClient) {
        this.inventoryClient = inventoryClient;
    }

    @PostMapping
    public Mono<OrderResult> createOrder(@RequestBody OrderRequest request) {
        return inventoryClient
            .reserveInventory(new ReservationRequest(request.sku(), request.quantity()))
            .map(reservation -> new OrderResult(
                "order-" + System.currentTimeMillis(),
                reservation.reserved(),
                request.sku(),
                request.quantity()
            ));
    }

    @GetMapping("/inventory/{sku}")
    public Mono<InventoryItem> checkInventory(@PathVariable String sku) {
        return inventoryClient.getInventory(sku);
    }
}

record OrderRequest(String sku, int quantity) {}
record OrderResult(String orderId, boolean confirmed, String sku, int quantity) {}
```

## Node.js Calling Java

The Node.js service can also invoke methods on a Java service:

```javascript
// Node.js calling Java service via Dapr
const { DaprClient, HttpMethod } = require('@dapr/dapr');

const client = new DaprClient({
  daprHost: '127.0.0.1',
  daprPort: '3500',
});

async function getShippingQuote(orderId) {
  const result = await client.invoker.invoke(
    'shipping-service',  // Java Spring Boot service
    `shipping/quote/${orderId}`,
    HttpMethod.GET
  );
  return result;
}

async function requestShipment(payload) {
  const result = await client.invoker.invoke(
    'shipping-service',
    'shipping/create',
    HttpMethod.POST,
    payload
  );
  return result;
}
```

## Running Together with Docker Compose

```yaml
version: '3.8'
services:
  inventory-service:
    build: ./inventory-service
    ports:
    - "3000:3000"

  inventory-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "--app-id", "inventory-service", "--app-port", "3000"]
    network_mode: "service:inventory-service"

  order-service:
    build: ./order-service
    ports:
    - "8080:8080"
    environment:
      SPRING_APPLICATION_NAME: order-service

  order-dapr:
    image: daprio/daprd:latest
    command: ["./daprd", "--app-id", "order-service", "--app-port", "8080"]
    network_mode: "service:order-service"
```

## Testing Cross-Language Invocation

```bash
docker-compose up -d

# Create order - Java calls Node.js inventory
curl -X POST http://localhost:8080/orders \
  -H "Content-Type: application/json" \
  -d '{"sku": "sku-001", "quantity": 5}'

# Check inventory from Java side
curl http://localhost:8080/orders/inventory/sku-001
```

## Summary

Dapr service invocation between Java and Node.js requires only configuring the respective Dapr SDKs and using the target service's app-id. The Java Dapr SDK returns reactive Mono types for non-blocking invocation, while the Node.js SDK provides promise-based async calls. Both languages share the same mTLS security, retry policies, and distributed tracing automatically - no custom middleware or protocol adapters needed.
