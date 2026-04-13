# How to Build Dapr Workflows with JavaScript SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, JavaScript, Node.js, SDK

Description: Build durable Dapr workflows using the JavaScript SDK, covering workflow definition, activity registration, error handling, and starting workflow instances from Node.js apps.

---

## Overview

The Dapr JavaScript SDK provides first-class support for the Dapr Workflow engine. Workflows are written as regular async functions but execute durably - Dapr replays them from checkpointed state so they survive process restarts, scaling events, and failures.

## Installation

```bash
npm install @dapr/dapr
```

## Workflow Concepts

- **Workflow**: A durable generator function that orchestrates activities and sub-workflows
- **Activity**: A short-running function that performs actual work (calls APIs, reads state)
- **WorkflowRuntime**: The host process that executes workflows and activities

## Defining a Workflow

```javascript
const { WorkflowRuntime, DaprWorkflowClient } = require("@dapr/dapr");

// Activity: fetch order details
async function getOrderActivity(ctx, orderId) {
  console.log(`Fetching order ${orderId}`);
  // Call external service or state store
  return { orderId, amount: 100.0, items: ["item-1", "item-2"] };
}

// Activity: process payment
async function processPaymentActivity(ctx, order) {
  console.log(`Processing payment for order ${order.orderId}`);
  // Integrate with payment gateway
  return { paymentId: `pay-${Date.now()}`, status: "success" };
}

// Activity: send confirmation email
async function sendConfirmationActivity(ctx, input) {
  console.log(`Sending confirmation for order ${input.orderId}`);
  return { emailSent: true };
}

// Workflow orchestrator - must be a generator function and deterministic
function* orderFulfillmentWorkflow(ctx, orderId) {
  // Step 1: Get order
  const order = yield ctx.callActivity(getOrderActivity, orderId);

  // Step 2: Process payment
  const payment = yield ctx.callActivity(processPaymentActivity, order);

  if (payment.status !== "success") {
    throw new Error(`Payment failed for order ${orderId}`);
  }

  // Step 3: Send confirmation
  const confirmation = yield ctx.callActivity(sendConfirmationActivity, {
    orderId: order.orderId,
    paymentId: payment.paymentId,
  });

  return {
    orderId,
    paymentId: payment.paymentId,
    emailSent: confirmation.emailSent,
  };
}
```

## Registering and Starting the Runtime

```javascript
async function main() {
  const workflowRuntime = new WorkflowRuntime();

  // Register workflows and activities
  workflowRuntime
    .registerWorkflow(orderFulfillmentWorkflow)
    .registerActivity(getOrderActivity)
    .registerActivity(processPaymentActivity)
    .registerActivity(sendConfirmationActivity);

  // Start the runtime
  await workflowRuntime.start();
  console.log("Workflow runtime started");

  // Keep process alive
  process.on("SIGTERM", async () => {
    await workflowRuntime.stop();
    process.exit(0);
  });
}

main().catch(console.error);
```

## Starting a Workflow Instance

```javascript
const { DaprWorkflowClient } = require("@dapr/dapr");

async function startOrderWorkflow(orderId) {
  const workflowClient = new DaprWorkflowClient();

  try {
    const instanceId = await workflowClient.scheduleNewWorkflow(
      orderFulfillmentWorkflow,
      orderId,
      `order-workflow-${orderId}` // optional: custom instance ID
    );
    console.log(`Workflow started: ${instanceId}`);

    // Wait for completion
    const result = await workflowClient.waitForWorkflowCompletion(
      instanceId,
      undefined,
      30 // timeout in seconds
    );

    console.log("Workflow result:", result.serializedOutput);
    return result;
  } finally {
    await workflowClient.stop();
  }
}
```

## Error Handling in Workflows

```javascript
function* orderFulfillmentWithRetry(ctx, orderId) {
  const order = yield ctx.callActivity(getOrderActivity, orderId);

  // Retry payment up to 3 times
  let payment;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      payment = yield ctx.callActivity(processPaymentActivity, order);
      break;
    } catch (err) {
      if (attempt === 3) throw err;
      // Wait before retry (deterministic timer)
      yield ctx.createTimer(new Date(Date.now() + attempt * 5000));
    }
  }

  return { orderId, paymentId: payment.paymentId };
}
```

## Querying Workflow Status

```javascript
const workflowClient = new DaprWorkflowClient();

const state = await workflowClient.getWorkflowState(instanceId, true);
console.log(`Status: ${state.runtimeStatus}`);
console.log(`Created: ${state.createdAt}`);
console.log(`Last updated: ${state.lastUpdatedAt}`);

await workflowClient.stop();
```

## Summary

Building Dapr workflows with the JavaScript SDK involves registering workflow orchestrators and activity functions with the `WorkflowRuntime`, starting the runtime in your Node.js process, and using `DaprWorkflowClient` to trigger and monitor instances. Workflow functions must be deterministic generator functions - use `yield ctx.callActivity` for side effects and `yield ctx.createTimer` for delays. The SDK handles state checkpointing and replay automatically, making workflows resilient to process restarts.
