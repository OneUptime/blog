# How to Send and Receive Messages with Azure Service Bus Using azure-servicebus in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Service Bus, Python, Messaging, Queue, Pub/Sub, azure-servicebus

Description: Learn how to send and receive messages using Azure Service Bus queues and topics with the azure-servicebus Python SDK.

---

Message queues decouple your services. When your web API needs to trigger a long-running task like sending an email or processing an image, you do not want it blocking the HTTP response. You drop a message on a queue, return immediately, and a background worker picks it up later. Azure Service Bus is a fully managed message broker that handles this pattern plus pub/sub with topics and subscriptions. The azure-servicebus Python SDK is how you interact with it from code.

## Setting Up

Install the required packages.

```bash
# Install Service Bus SDK and identity library
pip install azure-servicebus azure-identity
```

Create a Service Bus namespace if you do not have one.

```bash
# Create a Service Bus namespace
az servicebus namespace create \
    --name my-servicebus-ns \
    --resource-group my-rg \
    --location eastus \
    --sku Standard

# Create a queue
az servicebus queue create \
    --name order-processing \
    --namespace-name my-servicebus-ns \
    --resource-group my-rg

# Create a topic and subscription for pub/sub
az servicebus topic create \
    --name notifications \
    --namespace-name my-servicebus-ns \
    --resource-group my-rg

az servicebus topic subscription create \
    --name email-sub \
    --topic-name notifications \
    --namespace-name my-servicebus-ns \
    --resource-group my-rg
```

Assign the right RBAC role for your identity.

```bash
# Assign sender and receiver roles
NAMESPACE_ID=$(az servicebus namespace show --name my-servicebus-ns --resource-group my-rg --query id -o tsv)

az role assignment create \
    --role "Azure Service Bus Data Sender" \
    --assignee <your-principal-id> \
    --scope $NAMESPACE_ID

az role assignment create \
    --role "Azure Service Bus Data Receiver" \
    --assignee <your-principal-id> \
    --scope $NAMESPACE_ID
```

## Connecting to Service Bus

```python
from azure.identity import DefaultAzureCredential
from azure.servicebus import ServiceBusClient

# Connect using DefaultAzureCredential
credential = DefaultAzureCredential()
namespace = "my-servicebus-ns.servicebus.windows.net"

servicebus_client = ServiceBusClient(
    fully_qualified_namespace=namespace,
    credential=credential
)
```

## Sending Messages to a Queue

The most basic operation is sending a single message to a queue.

```python
from azure.servicebus import ServiceBusClient, ServiceBusMessage

credential = DefaultAzureCredential()
namespace = "my-servicebus-ns.servicebus.windows.net"

with ServiceBusClient(namespace, credential) as client:
    # Create a sender for the order-processing queue
    with client.get_queue_sender("order-processing") as sender:
        # Create and send a message
        message = ServiceBusMessage("Order #12345 - process payment")
        sender.send_messages(message)
        print("Message sent")
```

For structured data, send JSON as the message body.

```python
import json
from azure.servicebus import ServiceBusMessage

order_data = {
    "order_id": "12345",
    "customer_id": "cust-789",
    "items": [
        {"product": "Wireless Headphones", "qty": 1, "price": 79.99},
        {"product": "USB-C Hub", "qty": 2, "price": 34.99}
    ],
    "total": 149.97
}

with ServiceBusClient(namespace, credential) as client:
    with client.get_queue_sender("order-processing") as sender:
        # Serialize the order data to JSON
        message = ServiceBusMessage(
            body=json.dumps(order_data),
            content_type="application/json",
            subject="new-order",
            application_properties={
                "priority": "high",
                "region": "us-east"
            }
        )
        sender.send_messages(message)
        print(f"Order {order_data['order_id']} queued for processing")
```

## Sending Batches

When you have multiple messages, sending them as a batch is more efficient than sending one at a time.

```python
with ServiceBusClient(namespace, credential) as client:
    with client.get_queue_sender("order-processing") as sender:
        # Create a batch - SDK manages size limits automatically
        batch = sender.create_message_batch()

        orders = [
            {"order_id": "001", "total": 25.00},
            {"order_id": "002", "total": 149.97},
            {"order_id": "003", "total": 89.50}
        ]

        for order in orders:
            try:
                # Try adding each message to the batch
                batch.add_message(ServiceBusMessage(json.dumps(order)))
            except ValueError:
                # Batch is full, send it and start a new one
                sender.send_messages(batch)
                batch = sender.create_message_batch()
                batch.add_message(ServiceBusMessage(json.dumps(order)))

        # Send any remaining messages
        if len(batch) > 0:
            sender.send_messages(batch)
            print(f"Sent batch of {len(batch)} messages")
```

## Receiving Messages from a Queue

On the consumer side, you receive messages and process them. Service Bus uses a peek-lock model by default: the message becomes invisible to other receivers while you process it, and you explicitly complete or abandon it.

```python
import json

with ServiceBusClient(namespace, credential) as client:
    with client.get_queue_receiver("order-processing") as receiver:
        # Receive up to 10 messages, wait up to 5 seconds
        messages = receiver.receive_messages(
            max_message_count=10,
            max_wait_time=5
        )

        for msg in messages:
            try:
                # Parse the message body
                body = json.loads(str(msg))
                print(f"Processing order: {body.get('order_id', 'unknown')}")

                # Do your actual processing here
                # process_order(body)

                # Mark the message as successfully processed
                receiver.complete_message(msg)
                print("Message completed")

            except Exception as e:
                # Something went wrong - put the message back on the queue
                receiver.abandon_message(msg)
                print(f"Message abandoned due to error: {e}")
```

## Continuous Message Processing

For a long-running worker that continuously processes messages, you want a loop.

```python
import time
import json

def process_messages():
    """Run a continuous message processing loop."""
    with ServiceBusClient(namespace, credential) as client:
        with client.get_queue_receiver("order-processing") as receiver:
            print("Worker started, waiting for messages...")

            while True:
                messages = receiver.receive_messages(
                    max_message_count=10,
                    max_wait_time=10  # Wait up to 10 seconds for messages
                )

                if not messages:
                    # No messages available, loop continues
                    continue

                for msg in messages:
                    try:
                        body = json.loads(str(msg))
                        print(f"Processing: {body}")

                        # Simulate work
                        time.sleep(1)

                        receiver.complete_message(msg)
                    except Exception as e:
                        print(f"Error processing message: {e}")
                        receiver.abandon_message(msg)

# Start the worker
process_messages()
```

## Dead Letter Queue

When a message cannot be processed after multiple attempts, it ends up in the dead letter queue (DLQ). You should monitor the DLQ and handle failed messages.

```python
# Send a message to the dead letter queue explicitly
with ServiceBusClient(namespace, credential) as client:
    with client.get_queue_receiver("order-processing") as receiver:
        messages = receiver.receive_messages(max_message_count=1, max_wait_time=5)

        for msg in messages:
            # If processing fails permanently, dead-letter it
            receiver.dead_letter_message(
                msg,
                reason="InvalidPayload",
                error_description="Message body was not valid JSON"
            )

# Read from the dead letter queue
with ServiceBusClient(namespace, credential) as client:
    # The DLQ is a sub-queue accessed with a special receiver
    dlq_receiver = client.get_queue_receiver(
        "order-processing",
        sub_queue="deadletter"
    )

    with dlq_receiver:
        dead_letters = dlq_receiver.receive_messages(max_message_count=10, max_wait_time=5)
        for dl_msg in dead_letters:
            print(f"Dead letter reason: {dl_msg.dead_letter_reason}")
            print(f"Error description: {dl_msg.dead_letter_error_description}")
            print(f"Body: {str(dl_msg)}")
            dlq_receiver.complete_message(dl_msg)
```

## Topics and Subscriptions (Pub/Sub)

Queues are point-to-point. Topics and subscriptions implement publish-subscribe, where one message can be delivered to multiple subscribers.

```python
# Publishing to a topic
with ServiceBusClient(namespace, credential) as client:
    with client.get_topic_sender("notifications") as sender:
        message = ServiceBusMessage(
            json.dumps({
                "type": "order_completed",
                "order_id": "12345",
                "customer_email": "user@example.com"
            }),
            subject="order_completed"
        )
        sender.send_messages(message)
        print("Notification published")

# Consuming from a subscription
with ServiceBusClient(namespace, credential) as client:
    with client.get_subscription_receiver(
        topic_name="notifications",
        subscription_name="email-sub"
    ) as receiver:
        messages = receiver.receive_messages(max_message_count=10, max_wait_time=5)
        for msg in messages:
            body = json.loads(str(msg))
            print(f"Sending email for order {body['order_id']} to {body['customer_email']}")
            receiver.complete_message(msg)
```

## Scheduled Messages

You can schedule a message to appear on the queue at a future time.

```python
from datetime import datetime, timezone, timedelta

with ServiceBusClient(namespace, credential) as client:
    with client.get_queue_sender("order-processing") as sender:
        # Schedule a message for 30 minutes from now
        message = ServiceBusMessage("Reminder: follow up on order #12345")
        scheduled_time = datetime.now(timezone.utc) + timedelta(minutes=30)

        sequence_number = sender.schedule_messages(message, scheduled_time)
        print(f"Message scheduled, sequence number: {sequence_number}")

        # You can cancel a scheduled message if needed
        # sender.cancel_scheduled_messages(sequence_number)
```

## Sessions

Sessions guarantee ordered processing of related messages. All messages with the same session ID are processed in order by a single receiver.

```python
# Send messages with a session ID
with ServiceBusClient(namespace, credential) as client:
    with client.get_queue_sender("session-queue") as sender:
        for i in range(5):
            message = ServiceBusMessage(
                f"Step {i + 1} of workflow",
                session_id="workflow-abc"  # Group related messages
            )
            sender.send_messages(message)

# Receive session messages (they arrive in order)
with ServiceBusClient(namespace, credential) as client:
    with client.get_queue_receiver(
        "session-queue",
        session_id="workflow-abc"
    ) as receiver:
        messages = receiver.receive_messages(max_message_count=10, max_wait_time=5)
        for msg in messages:
            print(f"Session: {msg.session_id}, Body: {str(msg)}")
            receiver.complete_message(msg)
```

## Best Practices

1. **Always complete or abandon messages.** If you do not, they become visible again after the lock timeout, causing duplicate processing.
2. **Monitor the dead letter queue.** Failed messages pile up silently if you do not watch it.
3. **Use sessions for ordered processing.** Do not rely on queue ordering alone since it is not guaranteed for concurrent receivers.
4. **Set message TTL appropriately.** Messages that sit too long are probably stale.
5. **Use batching for throughput.** Sending and receiving in batches is significantly faster than one-at-a-time.

## Wrapping Up

Azure Service Bus with the azure-servicebus SDK gives you a robust messaging foundation. Queues handle point-to-point communication, topics handle pub/sub, sessions provide ordering guarantees, and the dead letter queue catches failures. Combined with DefaultAzureCredential for authentication, you can build decoupled, resilient architectures without much ceremony.
