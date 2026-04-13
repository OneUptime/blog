# How to Use Dapr Zeebe Command Output Binding

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Zeebe, Workflow, Binding, BPMN

Description: Learn how to configure the Dapr Zeebe Command output binding to send commands to Zeebe workflow engine instances for BPMN-based workflow orchestration.

---

## What Is the Dapr Zeebe Command Output Binding?

Zeebe is the workflow engine powering Camunda Platform 8. The Dapr Zeebe Command output binding lets your microservices send commands directly to a Zeebe broker - such as creating workflow instances, publishing messages, or completing jobs - without using the Zeebe Java or Go client directly.

## Configuring the Zeebe Command Binding Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: zeebe-command
  namespace: default
spec:
  type: bindings.zeebe.command
  version: v1
  metadata:
    - name: gatewayAddr
      value: "zeebe-gateway:26500"
    - name: gatewayKeepAlive
      value: "45s"
    - name: usePlainTextConnection
      value: "true"
    - name: caCertificatePath
      value: ""
```

For production with TLS:

```yaml
    - name: usePlainTextConnection
      value: "false"
    - name: caCertificatePath
      value: "/certs/zeebe-ca.pem"
```

## Deploying a BPMN Process

Before creating instances, deploy your BPMN process definition using the `deploy-resource` operation:

```bash
curl -X POST http://localhost:3500/v1.0/bindings/zeebe-command \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "deploy-resource",
    "metadata": {
      "fileName": "order-process.bpmn"
    },
    "data": "<bpmn:definitions ...>...</bpmn:definitions>"
  }'
```

## Creating a Workflow Instance

```javascript
const { DaprClient } = require("@dapr/dapr");

const client = new DaprClient();

async function startOrderProcess(orderId, customerId) {
  const result = await client.binding.send(
    "zeebe-command",
    "create-instance",
    {
      bpmnProcessId: "order-fulfillment",
      version: -1,
      variables: {
        orderId,
        customerId,
        status: "CREATED",
      },
    }
  );
  console.log("Process instance key:", result.processInstanceKey);
}

startOrderProcess("ORD-001", "CUST-42");
```

## Publishing a Message to Correlate with a Workflow

```javascript
async function notifyPaymentReceived(orderId, amount) {
  await client.binding.send("zeebe-command", "publish-message", {
    messageName: "payment-received",
    correlationKey: orderId,
    timeToLive: "1h",
    variables: { amount, paymentMethod: "card" },
  });
}
```

## Cancelling a Process Instance

```javascript
async function cancelInstance(processInstanceKey) {
  await client.binding.send("zeebe-command", "cancel-instance", {
    processInstanceKey,
  });
  console.log("Instance cancelled");
}
```

## Supported Operations

The Zeebe Command binding supports these operations:
- `deploy-resource` - deploys a BPMN definition or other resource
- `deploy-process` - deprecated alias for `deploy-resource`
- `create-instance` - starts a new process instance
- `cancel-instance` - cancels an active instance
- `set-variables` - sets variables on a scope
- `resolve-incident` - resolves a workflow incident
- `publish-message` - publishes a correlation message
- `activate-jobs` - activates available jobs
- `complete-job` - completes a job
- `fail-job` - marks a job as failed
- `update-job-retries` - updates retry count on a job
- `throw-error` - throws an error on a job
- `topology` - returns the broker cluster topology

## Running Locally with Docker

```bash
docker run --name zeebe \
  -p 26500:26500 -p 9600:9600 \
  camunda/zeebe:latest
```

Start your app:

```bash
dapr run --app-id order-service --components-path ./components node app.js
```

## Summary

The Dapr Zeebe Command output binding provides a clean interface for interacting with Zeebe from any microservice. By defining a simple component YAML and using the Dapr SDK or HTTP API, you can deploy BPMN processes, create instances, publish messages, and manage jobs without directly depending on the Zeebe client libraries.
