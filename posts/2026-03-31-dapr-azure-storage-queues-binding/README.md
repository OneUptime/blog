# How to Use Dapr Azure Storage Queues Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Azure, Storage Queue, Binding, Message Queue

Description: Learn how to configure and use the Dapr Azure Storage Queues binding to send and receive messages for reliable asynchronous processing in Azure-based microservices.

---

## What Is the Dapr Azure Storage Queues Binding?

Azure Storage Queues is a simple, cost-effective queuing service for asynchronous message passing. The Dapr Azure Storage Queues binding supports both output (sending messages) and input (consuming messages) modes, making it suitable for task queuing, background job processing, and decoupled service communication.

## Setting Up the Storage Queue

```bash
# Create a storage account
az storage account create \
  --name mystorageaccount \
  --resource-group my-rg \
  --location eastus \
  --sku Standard_LRS

# Create the queue
az storage queue create \
  --name task-queue \
  --account-name mystorageaccount

# Get the connection string
az storage account show-connection-string \
  --name mystorageaccount \
  --resource-group my-rg \
  --output tsv
```

## Configuring the Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: task-queue
  namespace: default
spec:
  type: bindings.azure.storagequeues
  version: v1
  metadata:
    - name: accountName
      value: "mystorageaccount"
    - name: accountKey
      secretKeyRef:
        name: azure-storage-secret
        key: accountKey
    - name: queueName
      value: "task-queue"
    - name: ttlInSeconds
      value: "86400"
    - name: decodeBase64
      value: "false"
    - name: visibilityTimeout
      value: "30s"
    - name: pollingInterval
      value: "5s"
```

```bash
kubectl create secret generic azure-storage-secret \
  --from-literal=accountKey=<your-storage-account-key>
```

## Sending Messages to the Queue

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function enqueueTask(task) {
  await client.binding.send("task-queue", "create", {
    taskId: task.id,
    type: task.type,
    payload: task.payload,
    priority: task.priority || "normal",
    enqueuedAt: new Date().toISOString(),
    retryCount: 0,
  });

  console.log(`Task ${task.id} enqueued`);
}

// Enqueue various task types
await enqueueTask({
  id: "TASK-001",
  type: "generate-report",
  payload: { reportType: "monthly-sales", month: "2026-03" },
  priority: "high",
});

await enqueueTask({
  id: "TASK-002",
  type: "send-email",
  payload: { to: "user@example.com", templateId: "welcome" },
});
```

## Scheduling Messages with Delay

Azure Storage Queues supports message visibility delay:

```javascript
async function scheduleTask(task, delaySeconds) {
  await client.binding.send(
    "task-queue",
    "create",
    task,
    {
      visibilityTimeout: String(delaySeconds),
    }
  );
  console.log(`Task scheduled to be visible in ${delaySeconds}s`);
}

// Schedule a reminder to be processed in 1 hour
await scheduleTask(
  { taskId: "REMIND-001", type: "send-reminder", userId: "user-42" },
  3600
);
```

## Consuming Messages from the Queue

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/task-queue", async (req, res) => {
  const task = req.body;

  console.log(`Processing task ${task.taskId} (type: ${task.type})`);

  try {
    switch (task.type) {
      case "generate-report":
        await generateReport(task.payload);
        break;
      case "send-email":
        await sendEmail(task.payload);
        break;
      case "send-reminder":
        await sendReminder(task.userId);
        break;
      default:
        console.warn(`Unknown task type: ${task.type}`);
    }

    // Return 200 to acknowledge and delete the message
    res.status(200).send("OK");
  } catch (err) {
    console.error(`Task ${task.taskId} failed:`, err.message);
    // Return 5xx to leave message invisible for retry after visibilityTimeout
    res.status(500).send(err.message);
  }
});

app.listen(3000);
```

## Setting TTL on Messages

```javascript
// Message expires in 1 hour if not processed
await client.binding.send(
  "task-queue",
  "create",
  { type: "time-sensitive-task", payload: taskData },
  {
    ttlInSeconds: "3600",
  }
);
```

## Monitoring Queue Depth

```bash
az storage queue metadata show \
  --name task-queue \
  --account-name mystorageaccount \
  --query approximateMessageCount
```

## Summary

The Dapr Azure Storage Queues binding provides simple and cost-effective message queuing for background task processing, scheduled jobs, and decoupled service communication. Use the output binding to enqueue tasks with optional delays and TTLs, and the input binding for consuming messages with automatic retry on failure. For high-throughput scenarios, consider upgrading to Azure Service Bus via its dedicated Dapr component.
