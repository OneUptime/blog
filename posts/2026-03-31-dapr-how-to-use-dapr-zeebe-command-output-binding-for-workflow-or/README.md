# How to Use Dapr Zeebe Command Output Binding for Workflow Orchestration

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Zeebe, Camunda, Workflow Orchestration, Binding

Description: Learn how to use the Dapr Zeebe Command output binding to interact with Camunda Zeebe workflow engine from your microservices for process orchestration.

---

## What Is the Dapr Zeebe Command Binding

The Dapr Zeebe Command output binding allows your application to interact with the Camunda Zeebe workflow engine - deploying BPMN processes, creating workflow instances, publishing messages, completing and failing jobs - through the Dapr sidecar. Zeebe is the engine powering Camunda Platform 8 for business process orchestration.

## Prerequisites

- Dapr CLI installed and initialized
- A running Zeebe broker (local via docker-compose or Camunda Cloud)
- Basic familiarity with BPMN and Zeebe concepts

## Start Zeebe Locally with Docker

```bash
docker-compose up -d
```

With this `docker-compose.yml`:

```yaml
version: '3'
services:
  zeebe:
    image: camunda/zeebe:latest
    ports:
      - "26500:26500"
      - "9600:9600"
    environment:
      - ZEEBE_BROKER_EXPORTERS_ELASTICSEARCH_CLASSNAME=io.camunda.zeebe.exporter.ElasticsearchExporter
```

## Define the Zeebe Command Binding Component

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
    value: "localhost:26500"
  - name: gatewayKeepAlive
    value: "45s"
  - name: usePlainTextConnection
    value: "true"
  - name: caCertificatePath
    value: ""
```

For Camunda Cloud, use TLS and set the address to your cluster endpoint.

## Deploy a BPMN Process

```bash
curl -X POST http://localhost:3500/v1.0/bindings/zeebe-command \
  -H "Content-Type: application/json" \
  -d '{
    "data": {},
    "metadata": {
      "fileName": "/processes/order-fulfillment.bpmn"
    },
    "operation": "deploy-resource"
  }'
```

## Create a Process Instance

```bash
curl -X POST http://localhost:3500/v1.0/bindings/zeebe-command \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "orderId": "order-123",
      "customerId": "cust-456",
      "totalAmount": 299.99
    },
    "metadata": {
      "bpmnProcessId": "order-fulfillment",
      "version": "-1"
    },
    "operation": "create-instance"
  }'
```

Response:

```json
{
  "processDefinitionKey": "2251799813685249",
  "bpmnProcessId": "order-fulfillment",
  "version": 1,
  "processInstanceKey": "2251799813685251"
}
```

## Publish a Message to a Running Instance

```bash
curl -X POST http://localhost:3500/v1.0/bindings/zeebe-command \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "paymentStatus": "approved",
      "transactionId": "txn-789"
    },
    "metadata": {
      "messageName": "payment-received",
      "correlationKey": "order-123",
      "timeToLive": "10m"
    },
    "operation": "publish-message"
  }'
```

## Use in a Node.js Application

```javascript
const { DaprClient } = require('@dapr/dapr');

const client = new DaprClient();
const BINDING = 'zeebe-command';

async function startOrderWorkflow(order) {
  const result = await client.binding.send(BINDING, 'create-instance', {
    orderId: order.id,
    customerId: order.customerId,
    items: order.items,
    totalAmount: order.totalAmount,
  }, {
    bpmnProcessId: 'order-fulfillment',
    version: '-1',
  });

  console.log('Workflow instance created:', result.processInstanceKey);
  return result.processInstanceKey;
}

async function notifyPaymentComplete(orderId, paymentData) {
  await client.binding.send(BINDING, 'publish-message', {
    status: 'approved',
    transactionId: paymentData.transactionId,
    amount: paymentData.amount,
  }, {
    messageName: 'payment-received',
    correlationKey: orderId,
    timeToLive: '10m',
  });
  console.log('Payment message published for order:', orderId);
}

async function cancelWorkflowInstance(instanceKey) {
  await client.binding.send(BINDING, 'cancel-instance', {}, {
    processInstanceKey: String(instanceKey),
  });
  console.log('Workflow instance cancelled:', instanceKey);
}
```

## Set Variables on a Running Instance

```bash
curl -X POST http://localhost:3500/v1.0/bindings/zeebe-command \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "shippingAddress": "123 Main St, Anytown, US",
      "trackingNumber": "TRK-12345"
    },
    "metadata": {
      "elementInstanceKey": "2251799813685300"
    },
    "operation": "set-variables"
  }'
```

## Supported Operations

```text
topology            - get the current topology of the Zeebe cluster
deploy-resource     - deploy a BPMN or DMN resource to Zeebe
create-instance     - start a new process instance
cancel-instance     - cancel a running instance
set-variables       - update variables on an instance
resolve-incident    - resolve an incident by key
publish-message     - publish a correlation message
activate-jobs       - fetch and activate jobs for processing
complete-job        - mark a job as successfully completed
fail-job            - mark a job as failed (triggers retry/escalation)
update-job-retries  - update the retry count on a job
throw-error         - throw a BPMN error in a job
```

## Summary

The Dapr Zeebe Command output binding enables microservices to participate in Camunda Zeebe-based business process orchestration - starting workflows, publishing messages, and managing job lifecycle - without embedding the Zeebe Java or Go SDK directly. This keeps your service thin and configuration-driven while enabling powerful BPMN-based workflow coordination across distributed systems.
