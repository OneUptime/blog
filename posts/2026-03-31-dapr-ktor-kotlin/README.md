# How to Use Dapr with Ktor Kotlin Framework

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Ktor, Kotlin, Microservice, Coroutine

Description: Build asynchronous Kotlin microservices using Ktor and Dapr for state management, service invocation, and pub/sub with Kotlin coroutines.

---

Ktor is JetBrains' asynchronous Kotlin web framework built on coroutines. Paired with Dapr, you get a lightweight, highly concurrent microservice with cloud-native building blocks. Kotlin's coroutines integrate naturally with Dapr's reactive Java SDK, making for clean, non-blocking code.

## Setting Up Ktor with Dapr

Create a new Ktor project using the Gradle DSL:

```kotlin
// build.gradle.kts
plugins {
    kotlin("jvm") version "1.9.21"
    kotlin("plugin.serialization") version "1.9.21"
    id("io.ktor.plugin") version "2.3.6"
}

dependencies {
    implementation("io.ktor:ktor-server-core-jvm")
    implementation("io.ktor:ktor-server-netty-jvm")
    implementation("io.ktor:ktor-server-content-negotiation-jvm")
    implementation("io.ktor:ktor-serialization-kotlinx-json-jvm")
    implementation("io.ktor:ktor-server-status-pages-jvm")
    implementation("io.dapr:dapr-sdk:1.10.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-reactor:1.7.3")
}
```

## Creating a Dapr-Enabled Ktor Application

```kotlin
// src/main/kotlin/Application.kt
import io.dapr.client.DaprClientBuilder
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.serialization.kotlinx.json.*

fun main() {
    embeddedServer(Netty, port = 8080, module = Application::module).start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) { json() }

    val daprClient = DaprClientBuilder().build()

    configureProductRoutes(daprClient)
    configureDaprRoutes(daprClient)
}
```

## Defining Product Routes with Dapr

```kotlin
// src/main/kotlin/routes/ProductRoutes.kt
import io.dapr.client.DaprClient
import io.ktor.http.*
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.reactor.awaitSingle
import kotlinx.coroutines.reactor.awaitSingleOrNull
import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class Product(val id: String = "", val name: String, val price: Double, val stock: Int)

fun Application.configureProductRoutes(daprClient: DaprClient) {
    routing {
        route("/products") {
            get {
                val state = daprClient
                    .getState("statestore", "all-products", List::class.java)
                    .awaitSingle()
                call.respond(state.value ?: emptyList<Product>())
            }

            post {
                val product = call.receive<Product>().copy(id = UUID.randomUUID().toString())

                val state = daprClient
                    .getState("statestore", "all-products", MutableList::class.java)
                    .awaitSingle()

                val products = state.value?.toMutableList() ?: mutableListOf<Any>()
                products.add(product)

                daprClient.saveState("statestore", "all-products", products).awaitSingleOrNull()
                daprClient.saveState("statestore", "product-${product.id}", product).awaitSingleOrNull()
                daprClient.publishEvent("pubsub", "product-created", product).awaitSingleOrNull()

                call.respond(HttpStatusCode.Created, product)
            }

            get("/{id}") {
                val id = call.parameters["id"] ?: return@get call.respond(HttpStatusCode.BadRequest)
                val state = daprClient
                    .getState("statestore", "product-$id", Product::class.java)
                    .awaitSingle()

                if (state.value == null) {
                    call.respond(HttpStatusCode.NotFound)
                } else {
                    call.respond(state.value)
                }
            }
        }
    }
}
```

## Setting Up Dapr Pub/Sub Subscriptions

```kotlin
// src/main/kotlin/routes/DaprRoutes.kt
import io.dapr.client.DaprClient
import io.ktor.server.application.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.coroutines.reactor.awaitSingle
import kotlinx.coroutines.reactor.awaitSingleOrNull
import kotlinx.serialization.json.*

fun Application.configureDaprRoutes(daprClient: DaprClient) {
    routing {
        get("/dapr/subscribe") {
            call.respond(listOf(
                mapOf(
                    "pubsubname" to "pubsub",
                    "topic" to "inventory-alert",
                    "route" to "/dapr/events/inventory-alert"
                )
            ))
        }

        post("/dapr/events/inventory-alert") {
            val body = call.receiveText()
            val json = Json.parseToJsonElement(body).jsonObject
            val data = json["data"]?.jsonObject

            val productId = data?.get("product_id")?.jsonPrimitive?.content
            val newStock = data?.get("stock")?.jsonPrimitive?.int ?: 0

            if (productId != null) {
                val state = daprClient
                    .getState("statestore", "product-$productId", Product::class.java)
                    .awaitSingle()

                state.value?.let { product ->
                    val updated = product.copy(stock = newStock)
                    daprClient.saveState("statestore", "product-$productId", updated).awaitSingleOrNull()
                }
            }

            call.respond(mapOf("status" to "SUCCESS"))
        }
    }
}
```

## Running with Dapr CLI

```bash
dapr run \
  --app-id product-service \
  --app-port 8080 \
  --dapr-http-port 3500 \
  -- ./gradlew run
```

## Summary

Ktor and Dapr combine Kotlin coroutines with cloud-native building blocks for highly concurrent, lightweight microservices. Using `awaitSingle()` and `awaitSingleOrNull()` from `kotlinx-coroutines-reactor` converts Dapr's reactive Mono types to coroutine-friendly suspend functions, keeping Ktor route handlers clean and non-blocking. Use `awaitSingle()` for methods that return a value (like `getState()`) and `awaitSingleOrNull()` for void operations (like `saveState()` and `publishEvent()`).
