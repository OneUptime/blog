# How to Understand Dapr Building Blocks and When to Use Each One

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Microservice, Building Block, Kubernetes, Architecture

Description: Learn what Dapr building blocks are, what problem each one solves, and when to choose each one for your microservices architecture.

---

## What Are Dapr Building Blocks

Dapr (Distributed Application Runtime) provides a set of "building blocks" - standardized APIs for common distributed systems concerns. Each building block solves a specific problem that microservices developers encounter repeatedly. Instead of implementing distributed systems primitives yourself or picking vendor-specific SDKs, Dapr provides a consistent API that works across many underlying providers.

The Dapr sidecar pattern injects a `daprd` proxy container alongside your application. Your application calls `localhost:3500` for Dapr APIs, and the sidecar handles the complexities of the underlying infrastructure.

## Building Block 1 - Service Invocation

**Problem it solves:** Service-to-service calls with retries, mTLS, and distributed tracing.

**Use when:** You need reliable, observable HTTP or gRPC calls between services.

```python
import requests

# Call "order-service" without knowing its address
response = requests.post(
    "http://localhost:3500/v1.0/invoke/order-service/method/submit",
    json={"item": "book", "quantity": 1}
)
```

**Provides:** Automatic retries, mTLS encryption, distributed tracing headers, service discovery.

## Building Block 2 - State Management

**Problem it solves:** Storing and retrieving application state with consistency guarantees.

**Use when:** Your service needs to persist state (user sessions, order data) without choosing a specific database.

```python
import requests

# Save state
requests.post("http://localhost:3500/v1.0/state/statestore",
    json=[{"key": "user-123", "value": {"name": "Alice", "cart": ["book"]}}])

# Read state
response = requests.get("http://localhost:3500/v1.0/state/statestore/user-123")
```

**Providers:** Redis, CosmosDB, DynamoDB, PostgreSQL, and more.

## Building Block 3 - Pub/Sub Messaging

**Problem it solves:** Asynchronous event-driven communication between services.

**Use when:** Services need to communicate without tight coupling, or when one event triggers multiple downstream actions.

```python
import requests

# Publish an event
requests.post("http://localhost:3500/v1.0/publish/pubsub/orders",
    json={"orderId": "abc-123", "status": "placed"})
```

**Providers:** Redis Streams, Kafka, RabbitMQ, Azure Service Bus, AWS SQS/SNS.

## Building Block 4 - Bindings (Input/Output)

**Problem it solves:** Connecting to external systems (queues, databases, IoT devices) with a standard API.

**Use when:** You need to trigger code from external events (cron, queue message) or call external systems (send email, write to database).

```python
# Output binding - invoke an external system
requests.post("http://localhost:3500/v1.0/bindings/smtp",
    json={"operation": "create", "data": "Your order has been confirmed.",
          "metadata": {"emailTo": "customer@example.com", "subject": "Order Confirmed"}})
```

**Providers:** Kafka, Cron, SMTP, Twilio, storage buckets, databases.

## Building Block 5 - Actors

**Problem it solves:** Stateful, single-threaded virtual objects for concurrent workloads.

**Use when:** You need to represent entities (users, devices, games) with state and behavior, with guaranteed single-threaded execution.

```python
# Invoke an actor
requests.post(
    "http://localhost:3500/v1.0/actors/OrderActor/order-123/method/process",
    json={"action": "approve"}
)
```

**Use cases:** IoT device state, game sessions, e-commerce carts, workflow coordination.

## Building Block 6 - Secrets

**Problem it solves:** Accessing secrets from vault providers without hardcoding credentials.

**Use when:** Your application needs database passwords, API keys, or TLS certificates.

```python
# Get a secret
response = requests.get("http://localhost:3500/v1.0/secrets/vault/my-db-password")
password = response.json()["my-db-password"]
```

**Providers:** Kubernetes Secrets, HashiCorp Vault, AWS Secrets Manager, Azure Key Vault.

## Building Block 7 - Configuration

**Problem it solves:** Dynamic application configuration with change notifications.

**Use when:** You need runtime configuration that can change without redeployment.

```python
# Get configuration
response = requests.get("http://localhost:3500/v1.0/configuration/configstore?key=feature-flag-x")
```

**Providers:** Redis, Azure App Configuration, GCP Configuration.

## Building Block 8 - Distributed Lock

**Problem it solves:** Distributed mutual exclusion across multiple service instances.

**Use when:** Multiple instances of a service must not execute a critical section simultaneously.

```python
# Acquire lock
requests.post("http://localhost:3500/v1.0-alpha1/lock/lockstore",
    json={"resourceId": "order-processor", "lockOwner": "instance-1", "expiryInSeconds": 30})
```

## Choosing the Right Building Block

| Scenario | Building Block |
|----------|---------------|
| Sync HTTP call to another service | Service Invocation |
| Store user session | State Management |
| Notify other services of an event | Pub/Sub |
| React to scheduled timer | Input Binding (Cron) |
| Concurrent entity management | Actors |
| Database credentials | Secrets |
| Feature flags | Configuration |
| Prevent duplicate processing | Distributed Lock |

## Summary

Dapr's building blocks each address a specific distributed systems challenge. Service invocation handles reliable service-to-service calls, state management abstracts persistence, pub/sub enables event-driven communication, and actors manage concurrent stateful entities. Start with the building blocks that address your most immediate pain points - typically service invocation and pub/sub for microservices, and state management for stateful services.
