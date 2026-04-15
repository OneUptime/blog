# How to Use Dapr Cloudflare Queues Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Cloudflare, Queue, Output Binding

Description: Configure the Dapr Cloudflare Queues output binding to enqueue messages into Cloudflare Queues from any Dapr microservice with minimal configuration.

---

Cloudflare Queues is a globally distributed message queue built on top of the Cloudflare Workers platform. Dapr's Cloudflare Queues binding lets backend services publish messages to Cloudflare Queues without embedding REST calls to the Cloudflare API.

## Prerequisites

- Cloudflare account with a Queue created
- Cloudflare API token with **Queues Edit** permission
- Account ID from your Cloudflare dashboard
- Dapr sidecar running

## Component Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: cloudflare-queue
  namespace: default
spec:
  type: bindings.cloudflare.queues
  version: v1
  metadata:
  - name: cfAPIToken
    secretKeyRef:
      name: cloudflare-secret
      key: apiToken
  - name: cfAccountID
    value: "YOUR_CLOUDFLARE_ACCOUNT_ID"
  - name: queueName
    value: "my-task-queue"
  - name: workerName
    value: "my-queue-worker"
  - name: key
    secretKeyRef:
      name: cloudflare-secret
      key: ed25519Key
```

Create the secret:

```bash
kubectl create secret generic cloudflare-secret \
  --from-literal=apiToken=YOUR_CF_API_TOKEN \
  --from-literal=ed25519Key="$(cat path/to/ed25519-private.pem)"
```

## Publishing a Message

```bash
curl -X POST http://localhost:3500/v1.0/bindings/cloudflare-queue \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "create",
    "data": {
      "taskType": "send_email",
      "recipient": "user@example.com",
      "templateId": "welcome_email"
    }
  }'
```

## Publishing from Node.js

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient({ daprPort: "3500" });

async function enqueueTask(taskType, payload) {
  await client.binding.send("cloudflare-queue", "create", {
    taskType,
    ...payload,
  });
  console.log(`Enqueued task: ${taskType}`);
}

enqueueTask("resize_image", { imageUrl: "https://cdn.example.com/img.jpg", width: 800 });
```

## Publishing Batch Messages

For high-throughput scenarios, loop over items and enqueue individually:

```javascript
async function enqueueBatch(tasks) {
  const promises = tasks.map((task) =>
    client.binding.send("cloudflare-queue", "create", task)
  );
  await Promise.all(promises);
  console.log(`Enqueued ${tasks.length} tasks`);
}
```

## Processing Messages with Cloudflare Workers

Once messages are in the queue, a Cloudflare Worker consumes them:

```javascript
export default {
  async queue(batch, env, ctx) {
    for (const message of batch.messages) {
      const task = message.body;
      if (task.taskType === "send_email") {
        await sendEmail(task.recipient, task.templateId, env);
      }
      message.ack();
    }
  },
};
```

## Best Practices

- Use Cloudflare Queues for fan-out patterns where Workers consume tasks at the edge.
- Keep message payloads under 128KB (Cloudflare's queue message size limit).
- Use dead-letter queues by configuring a secondary queue for failed messages in Workers.
- Rotate API tokens regularly and use Dapr secret store integration for token management.

## Summary

The Dapr Cloudflare Queues output binding bridges traditional backend microservices with Cloudflare's edge compute ecosystem. It enables decoupled task distribution to Cloudflare Workers without hardcoding API calls in your application. This pattern is ideal for workflows that need edge processing, such as image transformation, email delivery, or real-time personalization.
