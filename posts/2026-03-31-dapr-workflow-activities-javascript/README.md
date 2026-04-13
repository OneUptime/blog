# How to Implement Workflow Activities in JavaScript

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, JavaScript, Activity, Node.js

Description: Learn how to implement Dapr workflow activities in JavaScript using the Node.js SDK to build reliable, composable steps in distributed workflow orchestrations.

---

## What Are Workflow Activities?

Workflow activities in Dapr are the discrete, executable steps within a workflow. Each activity performs a concrete task - calling an API, querying a database, or sending a message. The Dapr workflow engine manages activity execution, including retries on failure, so your activity code can focus purely on the task at hand.

In JavaScript (Node.js), activities are plain async functions, while workflows are generator functions (`function*`) that use `yield` to call activities. Both are registered with the Dapr workflow runtime.

## Installing the Dapr Node.js SDK

```bash
npm install @dapr/dapr
```

## Defining an Activity

An activity is an async function that receives a context object and optional input:

```javascript
const { WorkflowActivityContext } = require('@dapr/dapr');

async function processPaymentActivity(ctx, input) {
  const { orderId, amount, currency } = input;

  console.log(`Processing payment for order ${orderId}: ${amount} ${currency}`);

  // Call external payment gateway
  const result = await paymentGateway.charge({
    orderId,
    amount,
    currency,
  });

  return {
    success: result.status === 'approved',
    transactionId: result.id,
    timestamp: new Date().toISOString(),
  };
}
```

## Defining a Workflow That Calls Activities

Workflows are generator functions that orchestrate activities using `yield ctx.callActivity()`. The workflow pauses at each `yield` until the activity returns:

```javascript
const { DaprWorkflowClient, WorkflowRuntime } = require('@dapr/dapr');

function* orderWorkflow(ctx, input) {
  const { orderId, email, payment } = input;

  // Call the payment activity
  const paymentResult = yield ctx.callActivity(processPaymentActivity, {
    ...payment,
    orderId,
  });

  if (!paymentResult.success) {
    return { status: 'failed', reason: 'payment declined' };
  }

  // Call the notification activity
  yield ctx.callActivity(sendEmailActivity, {
    to: email,
    subject: 'Order Confirmed',
    body: `Your order ${orderId} has been confirmed.`,
  });

  return { status: 'completed', transactionId: paymentResult.transactionId };
}
```

## Registering and Starting the Runtime

```javascript
const { WorkflowRuntime } = require('@dapr/dapr');

async function main() {
  const workflowRuntime = new WorkflowRuntime();

  workflowRuntime
    .registerWorkflow(orderWorkflow)
    .registerActivity(processPaymentActivity)
    .registerActivity(sendEmailActivity);

  await workflowRuntime.start();
  console.log('Workflow runtime started');
}

main().catch(console.error);
```

## Starting a Workflow Instance

Use the `DaprWorkflowClient` to trigger workflows from your application code:

```javascript
const { DaprWorkflowClient } = require('@dapr/dapr');

async function startOrder(orderId) {
  const client = new DaprWorkflowClient();

  const instanceId = await client.scheduleNewWorkflow(orderWorkflow, {
    orderId,
    email: 'customer@example.com',
    payment: { amount: 99.99, currency: 'USD' },
  });

  console.log(`Workflow started with instance ID: ${instanceId}`);

  // Poll for completion
  const state = await client.waitForWorkflowCompletion(instanceId, undefined, 30);
  console.log('Workflow result:', state.serializedOutput);

  await client.stop();
}
```

## Error Handling in Activities

Activities can throw errors, which Dapr will catch and retry based on the configured policy. For permanent failures, throw an error without retrying:

```javascript
async function sendEmailActivity(ctx, input) {
  try {
    await emailClient.send(input);
    return { delivered: true };
  } catch (err) {
    console.error('Email delivery failed:', err.message);
    throw new Error(`Email failed: ${err.message}`);
  }
}
```

## Summary

Dapr workflow activities in JavaScript are async functions that integrate cleanly with the Node.js SDK. Workflows themselves are generator functions that use `yield ctx.callActivity()` to call activities. Register activities alongside your workflow, and let Dapr handle retries and state persistence. This pattern keeps your orchestration logic clean and your side-effect logic isolated in testable activity functions.
