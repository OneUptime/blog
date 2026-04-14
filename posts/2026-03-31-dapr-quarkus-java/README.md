# How to Use Dapr with Quarkus Java Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Quarkus, Java, Microservice, Cloud Native

Description: Integrate Dapr with Quarkus for native-compiled Java microservices with Dapr state management, service invocation, and pub/sub capabilities.

---

Quarkus is designed for Kubernetes-native Java with fast startup times and low memory footprint - making it an excellent match for Dapr sidecars. Dapr's sidecar runs alongside Quarkus apps, providing cloud-native building blocks while Quarkus handles the low-level Java optimizations for container environments.

## Setting Up Quarkus with Dapr

Create a new Quarkus project:

```bash
mvn io.quarkus.platform:quarkus-maven-plugin:3.15.0:create \
  -DprojectGroupId=com.example \
  -DprojectArtifactId=catalog-service \
  -DclassName="com.example.CatalogResource" \
  -Dpath="/catalog" \
  -Dextensions="rest,rest-jackson,smallrye-openapi"

cd catalog-service
```

Add the Dapr Java SDK dependency to `pom.xml`:

```xml
<dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk</artifactId>
    <version>1.14.0</version>
</dependency>
<dependency>
    <groupId>io.dapr</groupId>
    <artifactId>dapr-sdk-actors</artifactId>
    <version>1.14.0</version>
</dependency>
```

## Creating a Quarkus CDI Bean for Dapr

```java
// src/main/java/com/example/DaprConfig.java
package com.example;

import io.dapr.client.DaprClient;
import io.dapr.client.DaprClientBuilder;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.annotation.PreDestroy;

@ApplicationScoped
public class DaprConfig {

    private DaprClient daprClient;

    @Produces
    @ApplicationScoped
    public DaprClient createDaprClient() {
        daprClient = new DaprClientBuilder().build();
        return daprClient;
    }

    @PreDestroy
    public void closeDaprClient() throws Exception {
        if (daprClient != null) {
            daprClient.close();
        }
    }
}
```

## Building the Catalog Resource

```java
// src/main/java/com/example/CatalogResource.java
package com.example;

import io.dapr.client.DaprClient;
import io.smallrye.mutiny.Uni;
import jakarta.inject.Inject;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

import java.util.List;
import java.util.UUID;

@Path("/catalog")
@Produces(MediaType.APPLICATION_JSON)
@Consumes(MediaType.APPLICATION_JSON)
public class CatalogResource {

    private static final String STATE_STORE = "statestore";
    private static final String PUBSUB = "pubsub";

    @Inject
    DaprClient daprClient;

    @GET
    public Uni<List<CatalogItem>> getAllItems() {
        return Uni.createFrom().publisher(
            daprClient.getState(STATE_STORE, "catalog-items", List.class)
        ).map(state -> state.getValue() != null ? state.getValue() : List.of());
    }

    @POST
    public Uni<Response> createItem(CatalogItem item) {
        item.setId(UUID.randomUUID().toString());

        return Uni.createFrom().publisher(
            daprClient.getState(STATE_STORE, "catalog-items", List.class)
        ).chain(state -> {
            var items = state.getValue() != null
                ? new java.util.ArrayList<>(state.getValue())
                : new java.util.ArrayList<CatalogItem>();
            items.add(item);
            return Uni.createFrom().publisher(daprClient.saveState(STATE_STORE, "catalog-items", items))
                .chain(v -> Uni.createFrom().publisher(daprClient.saveState(STATE_STORE, "item-" + item.getId(), item)))
                .chain(v -> Uni.createFrom().publisher(daprClient.publishEvent(PUBSUB, "catalog-item-created", item)))
                .replaceWith(Response.status(Response.Status.CREATED).entity(item).build());
        });
    }

    @GET
    @Path("/{id}")
    public Uni<CatalogItem> getItem(@PathParam("id") String id) {
        return Uni.createFrom().publisher(
            daprClient.getState(STATE_STORE, "item-" + id, CatalogItem.class)
        ).map(state -> {
            if (state.getValue() == null) {
                throw new NotFoundException("Item not found: " + id);
            }
            return state.getValue();
        });
    }
}
```

## Handling Pub/Sub Subscriptions in Quarkus

```java
// src/main/java/com/example/CatalogSubscriber.java
package com.example;

import io.dapr.client.domain.CloudEvent;
import jakarta.ws.rs.*;
import jakarta.ws.rs.core.MediaType;

@Path("/dapr")
public class CatalogSubscriber {

    @GET
    @Path("/subscribe")
    @Produces(MediaType.APPLICATION_JSON)
    public Object[] getSubscriptions() {
        return new Object[]{
            java.util.Map.of(
                "pubsubname", "pubsub",
                "topic", "price-updated",
                "route", "/dapr/events/price-updated"
            )
        };
    }

    @POST
    @Path("/events/price-updated")
    @Consumes(MediaType.APPLICATION_JSON)
    public String handlePriceUpdate(CloudEvent<PriceUpdate> event) {
        PriceUpdate update = event.getData();
        // Update catalog item price
        return "SUCCESS";
    }
}
```

## Native Compilation with GraalVM

Quarkus supports native compilation, but Dapr SDK requires reflection configuration:

`src/main/resources/META-INF/native-image/reflect-config.json`:

```json
[
  {
    "name": "io.dapr.client.domain.State",
    "allDeclaredConstructors": true,
    "allDeclaredFields": true,
    "allDeclaredMethods": true
  }
]
```

Build the native executable:

```bash
./mvnw package -Pnative -Dquarkus.native.container-build=true
```

## Running with Dapr CLI

```bash
dapr run \
  --app-id catalog-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  -- ./mvnw quarkus:dev
```

## Summary

Quarkus and Dapr combine Java's enterprise capabilities with cloud-native efficiency - Quarkus reduces startup time and memory while Dapr provides portable building blocks. CDI injection manages the Dapr client lifecycle, and Dapr's reactive Mono streams convert naturally to Mutiny Uni types for Quarkus's reactive programming model.
