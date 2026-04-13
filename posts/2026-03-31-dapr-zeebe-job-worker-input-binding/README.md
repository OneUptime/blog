# How to Use Dapr Zeebe Job Worker Input Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Zeebe, Binding, Workflow, Job Worker

Description: Learn how to configure and use the Dapr Zeebe Job Worker input binding to process BPMN service tasks from a Zeebe workflow engine in your microservices.

---

## What Is the Dapr Zeebe Job Worker Input Binding?

In Zeebe-powered BPMN workflows, service tasks are executed by job workers - processes that poll the broker for available jobs, process them, and report completion. The Dapr Zeebe Job Worker input binding turns your microservice into a job worker without requiring the Zeebe client SDK. Dapr polls Zeebe and triggers your application's endpoint when a job is available.

## Configuring the Job Worker Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: order-worker
  namespace: default
spec:
  type: bindings.zeebe.jobworker
  version: v1
  metadata:
    - name: gatewayAddr
      value: "zeebe-gateway:26500"
    - name: workerName
      value: "order-processor"
    - name: workerTimeout
      value: "5m"
    - name: requestTimeout
      value: "30s"
    - name: jobType
      value: "process-order"
    - name: maxJobsActive
      value: "32"
    - name: concurrency
      value: "4"
    - name: pollInterval
      value: "100ms"
    - name: pollThreshold
      value: "0.3"
    - name: fetchVariables
      value: "orderId,customerId,amount"
    - name: usePlainTextConnection
      value: "true"
    - name: autocomplete
      value: "true"
```

## Handling Jobs in Your Service

When Dapr receives a job from Zeebe, it sends a POST to your application's endpoint named after the binding:

```javascript
const express = require("express");
const app = express();
app.use(express.json());

app.post("/order-worker", async (req, res) => {
  const { orderId, customerId, amount } = req.body;

  console.log(`Processing order ${orderId} for customer ${customerId}`);

  try {
    // Business logic
    const result = await processOrder({ orderId, customerId, amount });

    // Return variables to set on the workflow instance
    res.json({
      variables: {
        processingStatus: "COMPLETED",
        transactionId: result.transactionId,
      },
    });
  } catch (err) {
    console.error("Failed to process order:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000);
```

## Accessing Job Metadata

Dapr passes job metadata as HTTP headers:

```javascript
app.post("/order-worker", async (req, res) => {
  const jobKey = req.headers["x-zeebe-job-key"];
  const jobType = req.headers["x-zeebe-job-type"];
  const retries = parseInt(req.headers["x-zeebe-job-retries"], 10);
  const workflowInstanceKey = req.headers["x-zeebe-process-instance-key"];

  console.log(`Job ${jobKey} (retries left: ${retries})`);
  console.log(`Workflow instance: ${workflowInstanceKey}`);

  // ... process and respond
  res.json({});
});
```

## Manual Job Completion with the Command Binding

If you set `autocomplete: "false"`, you must complete or fail the job manually using the Zeebe Command binding:

```javascript
const { DaprClient } = require("@dapr/dapr");
const client = new DaprClient();

async function completeJob(jobKey, variables) {
  await client.binding.send("zeebe-command", "complete-job", {
    jobKey,
    variables,
  });
}

async function failJob(jobKey, retries, errorMessage) {
  await client.binding.send("zeebe-command", "fail-job", {
    jobKey,
    retries,
    errorMessage,
  });
}
```

## Running Locally

```bash
dapr run \
  --app-id order-processor \
  --app-port 3000 \
  --resources-path ./components \
  node app.js
```

## BPMN Service Task Configuration

In your BPMN diagram, set the service task type to match `jobType` in your component:

```xml
<bpmn:serviceTask id="ProcessOrder" name="Process Order">
  <bpmn:extensionElements>
    <zeebe:taskDefinition type="process-order" retries="3" />
  </bpmn:extensionElements>
</bpmn:serviceTask>
```

## Summary

The Dapr Zeebe Job Worker input binding simplifies building BPMN service task handlers by eliminating the need for the Zeebe client SDK. Configure a component YAML, implement an HTTP endpoint, and Dapr handles all job polling and lifecycle management. This makes it straightforward to integrate workflow-driven processing into any Dapr-enabled microservice.
