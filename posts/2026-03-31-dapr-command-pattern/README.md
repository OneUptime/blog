# How to Implement Command Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Command Pattern, CQRS, Service Invocation, Microservice

Description: Learn how to implement the Command design pattern with Dapr to encapsulate requests as objects, enabling queuing, logging, and undo operations in microservices.

---

## The Command Pattern in Microservices

The Command pattern encapsulates a request as a standalone object containing all information needed to execute it. In microservices, commands travel between services as structured messages. Dapr provides the transport layer (service invocation or pub/sub) and state management for command logging and undo support.

## Defining Commands as Structured Messages

Commands are plain objects with a type, payload, and metadata:

```typescript
interface Command {
  commandId: string;
  commandType: string;
  payload: Record<string, unknown>;
  issuedAt: string;
  issuedBy: string;
  correlationId: string;
}

interface CreateOrderCommand extends Command {
  commandType: "CreateOrder";
  payload: {
    customerId: string;
    items: Array<{ productId: string; quantity: number }>;
    shippingAddress: string;
  };
}
```

## Command Handler Service

The command handler receives commands via Dapr service invocation and executes them:

```typescript
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(express.json());

const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || '3500';

async function logCommandToStateStore(command: Command) {
  await fetch(`http://localhost:${DAPR_HTTP_PORT}/v1.0/state/statestore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      key: `command:${command.commandId}`,
      value: { ...command, status: 'executed', executedAt: new Date().toISOString() }
    }])
  });
}

app.post('/commands/create-order', async (req, res) => {
  const command: CreateOrderCommand = req.body;

  // Validate command
  if (!command.commandId || !command.payload.customerId) {
    return res.status(400).json({ error: 'Invalid command' });
  }

  // Execute command
  const order = {
    orderId: uuidv4(),
    customerId: command.payload.customerId,
    items: command.payload.items,
    status: 'created',
    createdAt: new Date().toISOString()
  };

  // Persist order
  await saveOrder(order);

  // Log executed command for audit and undo
  await logCommandToStateStore(command);

  res.json({ orderId: order.orderId, commandId: command.commandId });
});

app.listen(3000);
```

## Sending Commands via Dapr Service Invocation

The command sender creates a properly structured command and invokes the handler:

```typescript
async function sendCreateOrderCommand(customerId: string, items: Item[]) {
  const command: CreateOrderCommand = {
    commandId: uuidv4(),
    commandType: 'CreateOrder',
    payload: { customerId, items, shippingAddress: '123 Main St' },
    issuedAt: new Date().toISOString(),
    issuedBy: 'checkout-service',
    correlationId: uuidv4()
  };

  const response = await fetch(
    `http://localhost:${DAPR_HTTP_PORT}/v1.0/invoke/order-service/method/commands/create-order`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command)
    }
  );

  return response.json();
}
```

## Async Commands via Dapr Pub/Sub

For commands that do not need an immediate response, use pub/sub:

```typescript
async function dispatchCommand(command: Command) {
  await fetch(
    `http://localhost:${DAPR_HTTP_PORT}/v1.0/publish/pubsub/commands?metadata.cloudevent.type=${command.commandType}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(command)
    }
  );
}
```

The command handler subscribes to the `commands` topic and routes each event to the correct handler based on `commandType`.

## Summary

Implementing the Command pattern with Dapr creates a clear boundary between command senders and command handlers. Dapr service invocation handles synchronous commands with retries and mTLS, while pub/sub handles asynchronous fire-and-forget commands. Logging commands to the Dapr state store enables audit trails and undo operations with minimal additional code.
