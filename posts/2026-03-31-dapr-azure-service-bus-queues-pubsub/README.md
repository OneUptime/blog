# How to Configure Dapr with Azure Service Bus Queues Pub/Sub

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Service Bus, Queue, Pub/Sub, Messaging, Microservice

Description: Configure Dapr pub/sub with Azure Service Bus Queues for reliable point-to-point messaging with dead-letter support and session handling.

---

## Overview

Azure Service Bus Queues provide reliable, asynchronous point-to-point messaging. Unlike topics, queues deliver each message to a single consumer. Dapr's Azure Service Bus pub/sub component supports both queues and topics - this guide focuses on queue-based messaging patterns useful for task processing and work distribution.

## Prerequisites

- Azure Service Bus namespace (Standard or Premium tier for advanced features)
- Dapr CLI installed
- Azure CLI for provisioning

## Creating the Service Bus Namespace and Queue

```bash
# Create namespace
az servicebus namespace create \
  --name dapr-servicebus \
  --resource-group dapr-demo \
  --sku Standard

# Create a queue
az servicebus queue create \
  --name task-queue \
  --namespace-name dapr-servicebus \
  --resource-group dapr-demo \
  --max-delivery-count 5 \
  --lock-duration PT30S

# Get primary connection string
az servicebus namespace authorization-rule keys list \
  --resource-group dapr-demo \
  --namespace-name dapr-servicebus \
  --name RootManageSharedAccessKey \
  --query primaryConnectionString -o tsv
```

## Dapr Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: servicebus-pubsub
  namespace: default
spec:
  type: pubsub.azure.servicebus.queues
  version: v1
  metadata:
    - name: connectionString
      secretKeyRef:
        name: servicebus-secret
        key: connectionString
    - name: maxConcurrentHandlers
      value: "10"
    - name: lockDurationInSec
      value: "30"
    - name: maxActiveMessages
      value: "20"
    - name: maxRetriableErrorsPerSec
      value: "10"
```

## Store the Connection String

```bash
kubectl create secret generic servicebus-secret \
  --from-literal=connectionString="Endpoint=sb://dapr-servicebus.servicebus.windows.net/;..."
```

## Sending a Task to the Queue

```bash
curl -X POST http://localhost:3500/v1.0/publish/servicebus-pubsub/task-queue \
  -H "Content-Type: application/json" \
  -d '{"taskId": "T-500", "type": "email", "recipient": "user@example.com"}'
```

## Processing Tasks in Java

```java
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class TaskHandler {

    @PostMapping("/task-queue")
    public ResponseEntity<Void> handleTask(@RequestBody Map<String, Object> event) {
        Map<String, Object> task = (Map<String, Object>) event.get("data");
        String taskId = (String) task.get("taskId");
        String type = (String) task.get("type");
        System.out.printf("Processing task %s of type %s%n", taskId, type);
        return ResponseEntity.ok().build();
    }
}
```

Subscription definition:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: task-sub
spec:
  pubsubname: servicebus-pubsub
  topic: task-queue
  route: /task-queue
```

## Handling Failures and Dead-Letter

When a message exceeds `maxDeliveryCount`, Service Bus moves it to the dead-letter queue automatically. You can read dead-letter messages by subscribing to the `$deadletterqueue` suffix. Set up an alert or monitor the dead-letter queue length in Azure Monitor to catch processing failures.

```bash
az monitor metrics alert create \
  --name dlq-alert \
  --resource-group dapr-demo \
  --scopes /subscriptions/.../dapr-servicebus \
  --condition "avg DeadletteredMessages > 10" \
  --window-size 5m \
  --evaluation-frequency 1m
```

## Summary

Dapr's Azure Service Bus Queues pub/sub component provides reliable task delivery with built-in dead-lettering and lock management. Configure it with a Service Bus connection string, tune concurrency and lock duration for your workload, and Dapr handles message settlement automatically. This pattern works well for background task processing and work queue scenarios.
