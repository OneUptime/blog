# How to Use Dapr Service Invocation with Java

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Java, Service Invocation, Microservice, Spring Boot, SDK

Description: Call other Dapr-enabled microservices from Java using direct client invocation and the Dapr Spring Boot starter with automatic service discovery and mTLS.

---

## Overview

Dapr service invocation in Java lets microservices call each other by logical app-id. The Dapr sidecar handles name resolution, retries, and mTLS. The Java SDK provides both a direct client API and a Spring Boot-friendly `DaprClient` bean that integrates with existing controllers.

## Direct Client Invocation

```java
import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import io.dapr.client.domain.HttpExtension;

public class InvokeExample {
    public static void main(String[] args) throws Exception {
        try (DaprClient client = new DaprClientBuilder().build()) {
            // GET - returns raw bytes
            byte[] resp = client.invokeMethod(
                "catalog-service",   // target app-id
                "products/prod-1",   // method path
                null,                // request body
                HttpExtension.GET,
                byte[].class).block();

            System.out.println(new String(resp));
        }
    }
}
```

## Invoking with a Typed Response

```java
import io.dapr.utils.TypeRef;

Product product = client.invokeMethod(
    "catalog-service",
    "products/prod-1",
    null,
    HttpExtension.GET,
    new TypeRef<Product>() {}).block();

System.out.println(product.getName());
```

## Invoking with a Request Body

```java
OrderRequest request = new OrderRequest("prod-1", 5, 49.95);

OrderResponse response = client.invokeMethod(
    "order-service",
    "orders",
    request,
    HttpExtension.POST,
    new TypeRef<OrderResponse>() {}).block();

System.out.println("Order created: " + response.getOrderId());
```

## Receiving Invocations in a Spring Boot Controller

Use `dapr-sdk-springboot` to handle incoming service invocations as standard HTTP requests:

```java
import org.springframework.web.bind.annotation.*;

@RestController
public class ProductController {

    @GetMapping("/products/{id}")
    public ResponseEntity<Product> getProduct(@PathVariable String id) {
        // Called by Dapr sidecar when another service invokes "catalog-service/products/{id}"
        Product p = productRepository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return ResponseEntity.ok(p);
    }

    @PostMapping("/products")
    public ResponseEntity<Product> createProduct(@RequestBody Product product) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(productRepository.save(product));
    }
}
```

## Adding Custom Headers to Invocations

```java
import io.dapr.client.domain.InvokeMethodRequest;

Map<String, String> headers = Map.of(
    "x-correlation-id", "corr-abc-123",
    "x-tenant-id",      "tenant-42");

InvokeMethodRequest req = new InvokeMethodRequest("order-service", "orders")
    .setHttpExtension(HttpExtension.POST)
    .setBody(new OrderRequest("prod-1", 2, 19.99))
    .setMetadata(headers);

OrderResponse resp = client.invokeMethod(req, new TypeRef<OrderResponse>() {}).block();
```

## Error Handling

```java
try {
    Product p = client.invokeMethod(
        "catalog-service", "products/missing",
        null, HttpExtension.GET, new TypeRef<Product>() {}).block();
} catch (io.dapr.exceptions.DaprException ex) {
    System.err.println("Status: " + ex.getHttpStatusCode());
    System.err.println("Message: " + ex.getMessage());
}
```

## Summary

Dapr service invocation in Java is a single `invokeMethod` call that accepts the target app-id, path, optional request body, and expected response type. On the receiving side, standard Spring MVC `@RestController` methods handle invocations transparently. The Dapr sidecar manages service discovery, retries, and mutual TLS with no additional Java configuration required.
