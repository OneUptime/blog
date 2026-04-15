# How to Use Dapr with Angular Frontend and Java Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Angular, Java, Spring Boot, Microservice

Description: Build a full-stack application with Angular calling a Spring Boot backend through Dapr service invocation for cloud-native communication.

---

Angular and Spring Boot are a popular enterprise full-stack combination. Adding Dapr to this stack provides service discovery, distributed tracing, and resilience without changing core business logic. This guide builds an inventory management app using Angular, Spring Boot, and Dapr.

## Backend: Spring Boot with Dapr SDK

Create a Spring Boot project with Dapr dependencies in `pom.xml`:

```xml
<dependencies>
    <dependency>
        <groupId>io.dapr</groupId>
        <artifactId>dapr-sdk-springboot</artifactId>
        <version>1.10.0</version>
    </dependency>
    <dependency>
        <groupId>io.dapr</groupId>
        <artifactId>dapr-sdk</artifactId>
        <version>1.10.0</version>
    </dependency>
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
</dependencies>
```

Register the Dapr client as a Spring bean:

```java
@Configuration
public class DaprConfig {

    @Bean
    public DaprClient daprClient() {
        return new DaprClientBuilder().build();
    }
}
```

Create the inventory controller:

```java
@RestController
@RequestMapping("/inventory")
public class InventoryController {

    @Autowired
    private DaprClient daprClient;

    @GetMapping
    public Mono<List<InventoryItem>> getInventory() {
        return daprClient
            .getState("statestore", "inventory", List.class)
            .map(state -> state.getValue() != null
                ? state.getValue()
                : Collections.emptyList());
    }

    @PostMapping
    public Mono<InventoryItem> addItem(@RequestBody InventoryItem item) {
        item.setId(UUID.randomUUID().toString());
        return daprClient
            .getState("statestore", "inventory", List.class)
            .flatMap(state -> {
                List<InventoryItem> items = state.getValue() != null
                    ? state.getValue() : new ArrayList<>();
                items.add(item);
                return daprClient
                    .saveState("statestore", "inventory", items)
                    .thenReturn(item);
            });
    }

    @PostMapping("/{id}/reserve")
    public Mono<Void> reserveItem(@PathVariable String id) {
        // Publish a reservation event via Dapr pub/sub
        return daprClient.publishEvent("pubsub", "inventory-reserved",
            Map.of("itemId", id, "timestamp", Instant.now().toString()));
    }
}
```

Configure Dapr in `application.properties`:

```properties
dapr.http.client.readTimeoutSeconds=5
server.port=8080
```

## Frontend: Angular with HttpClient

Generate an Angular service for Dapr communication:

```bash
ng new inventory-app
cd inventory-app
ng generate service services/inventory
```

Implement the service with Dapr HTTP API calls:

```typescript
// src/app/services/inventory.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly daprPort = 3500;
  private readonly appId = 'inventory-service';
  private readonly baseUrl =
    `http://localhost:${this.daprPort}/v1.0/invoke/${this.appId}/method`;

  constructor(private http: HttpClient) {}

  getInventory(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/inventory`);
  }

  addItem(item: { name: string; quantity: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/inventory`, item);
  }

  reserveItem(id: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/inventory/${id}/reserve`, {});
  }
}
```

Use the service in a component:

```typescript
// src/app/components/inventory-list/inventory-list.component.ts
import { Component, OnInit } from '@angular/core';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-inventory-list',
  template: `
    <div *ngFor="let item of items">
      {{ item.name }} - Qty: {{ item.quantity }}
      <button (click)="reserve(item.id)">Reserve</button>
    </div>
  `
})
export class InventoryListComponent implements OnInit {
  items: any[] = [];

  constructor(private inventoryService: InventoryService) {}

  ngOnInit(): void {
    this.inventoryService.getInventory().subscribe(
      items => this.items = items
    );
  }

  reserve(id: string): void {
    this.inventoryService.reserveItem(id).subscribe();
  }
}
```

## Running Locally with Dapr CLI

```bash
# Start the Spring Boot backend with Dapr
dapr run \
  --app-id inventory-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  -- java -jar target/inventory-0.0.1-SNAPSHOT.jar

# Start Angular dev server in a separate terminal
ng serve --port 4200
```

## Summary

Dapr bridges Angular and Spring Boot by handling service discovery and communication through the sidecar pattern. Angular calls Dapr's HTTP API on localhost, which routes to the Spring Boot backend by app-id, eliminating hardcoded URLs while adding built-in retries, tracing, and observability.
