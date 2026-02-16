# How to Troubleshoot Azure Service Bus Dead-Letter Queue Message Buildup

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Service Bus, Dead-Letter Queue, Messaging, Troubleshooting, Queues

Description: Diagnose and resolve Azure Service Bus dead-letter queue message buildup by identifying common causes like processing failures and TTL expiration.

---

You check your Azure Service Bus queue and notice thousands of messages piling up in the dead-letter queue (DLQ). The DLQ is a sub-queue that holds messages that cannot be delivered or processed. A few messages in the DLQ is normal. Thousands indicate a problem that needs attention.

This post covers why messages end up in the dead-letter queue, how to inspect them, and how to fix the underlying issues.

## What is the Dead-Letter Queue

Every Azure Service Bus queue and topic subscription has an associated dead-letter queue. Messages are moved to the DLQ in several situations:

- The message exceeds the maximum delivery count (too many processing failures)
- The message's time-to-live (TTL) expires before it is consumed
- A subscription filter evaluation causes an error
- The receiving application explicitly dead-letters the message
- The message cannot be forwarded to the next queue

The DLQ path is the main queue name with `/$deadletterqueue` appended. For example: `my-queue/$deadletterqueue`.

## Step 1: Check the DLQ Message Count

Start by seeing how many messages are stuck.

```bash
# Get queue details including dead-letter message count
az servicebus queue show \
  --resource-group my-rg \
  --namespace-name my-servicebus \
  --name my-queue \
  --query "{ActiveMessages:countDetails.activeMessageCount, DeadLetterMessages:countDetails.deadLetterMessageCount, ScheduledMessages:countDetails.scheduledMessageCount}" \
  --output json
```

For topic subscriptions:

```bash
# Get subscription details including DLQ count
az servicebus topic subscription show \
  --resource-group my-rg \
  --namespace-name my-servicebus \
  --topic-name my-topic \
  --name my-subscription \
  --query "{ActiveMessages:countDetails.activeMessageCount, DeadLetterMessages:countDetails.deadLetterMessageCount}" \
  --output json
```

## Step 2: Inspect Dead-Letter Messages

To fix the problem, you need to understand why messages are being dead-lettered. Each DLQ message has properties that tell you the reason.

Use the Service Bus Explorer in the Azure portal (under the queue or subscription, click "Service Bus Explorer" in the left menu). Switch to the Dead-letter tab to peek at messages.

You can also read DLQ messages programmatically.

```csharp
using Azure.Messaging.ServiceBus;

// Create a receiver for the dead-letter queue
var client = new ServiceBusClient(connectionString);
var dlqReceiver = client.CreateReceiver(
    "my-queue",
    new ServiceBusReceiverOptions
    {
        SubQueue = SubQueue.DeadLetter
    });

// Peek at messages without removing them
var messages = await dlqReceiver.PeekMessagesAsync(maxMessages: 10);

foreach (var msg in messages)
{
    // These properties tell you why the message was dead-lettered
    Console.WriteLine($"MessageId: {msg.MessageId}");
    Console.WriteLine($"DeadLetterReason: {msg.DeadLetterReason}");
    Console.WriteLine($"DeadLetterErrorDescription: {msg.DeadLetterErrorDescription}");
    Console.WriteLine($"EnqueuedTime: {msg.EnqueuedTime}");
    Console.WriteLine($"DeliveryCount: {msg.DeliveryCount}");
    Console.WriteLine($"Body: {msg.Body}");
    Console.WriteLine("---");
}
```

The key properties to check:

- **DeadLetterReason**: A short string indicating why (e.g., "MaxDeliveryCountExceeded", "TTLExpiredException")
- **DeadLetterErrorDescription**: Additional details about the failure
- **DeliveryCount**: How many times the message was delivered before being dead-lettered

## Common Causes and Fixes

### Cause 1: MaxDeliveryCountExceeded

This means the message was delivered to a consumer multiple times, and each time the consumer failed to process it. After reaching the maximum delivery count (default is 10), the message is moved to the DLQ.

```bash
# Check the max delivery count setting on the queue
az servicebus queue show \
  --resource-group my-rg \
  --namespace-name my-servicebus \
  --name my-queue \
  --query "maxDeliveryCount" \
  --output tsv
```

**Why it happens:**

- The consumer throws an exception during processing
- The consumer takes too long and the message lock expires
- The consumer crashes and the message is released back to the queue

**Fix the consumer code:**

```csharp
// Proper error handling in a Service Bus consumer
var processor = client.CreateProcessor("my-queue", new ServiceBusProcessorOptions
{
    // Increase lock duration if processing takes a while
    MaxAutoLockRenewalDuration = TimeSpan.FromMinutes(10),

    // Process one message at a time if order matters
    MaxConcurrentCalls = 1,

    // Auto-complete means the message is completed after your handler returns
    AutoCompleteMessages = false
});

processor.ProcessMessageAsync += async args =>
{
    try
    {
        // Process the message
        var body = args.Message.Body.ToString();
        await ProcessMessageAsync(body);

        // Explicitly complete the message on success
        await args.CompleteMessageAsync(args.Message);
    }
    catch (TransientException ex)
    {
        // For transient errors, abandon the message so it can be retried
        Console.WriteLine($"Transient error: {ex.Message}");
        await args.AbandonMessageAsync(args.Message);
    }
    catch (PermanentException ex)
    {
        // For permanent errors, dead-letter the message with a reason
        Console.WriteLine($"Permanent error: {ex.Message}");
        await args.DeadLetterMessageAsync(args.Message,
            deadLetterReason: "ProcessingFailed",
            deadLetterErrorDescription: ex.Message);
    }
};

processor.ProcessErrorAsync += async args =>
{
    Console.WriteLine($"Error: {args.Exception.Message}");
};

await processor.StartProcessingAsync();
```

### Cause 2: TTL Expiration

Messages have a time-to-live. If they are not consumed before the TTL expires, they are moved to the DLQ (if dead-lettering on message expiration is enabled).

```bash
# Check the default message TTL for the queue
az servicebus queue show \
  --resource-group my-rg \
  --namespace-name my-servicebus \
  --name my-queue \
  --query "{DefaultTTL:defaultMessageTimeToLive, DeadLetteringOnExpiration:deadLetteringOnMessageExpiration}" \
  --output json
```

**Why it happens:**

- Consumers are not running or are too slow
- The TTL is too short for the workload
- A sudden spike in messages exceeds consumer capacity

**Fix:**

- Scale up your consumers to process messages faster
- Increase the TTL if the default is too short
- Enable auto-scaling for your consumer application

```bash
# Increase the default TTL (e.g., to 7 days)
az servicebus queue update \
  --resource-group my-rg \
  --namespace-name my-servicebus \
  --name my-queue \
  --default-message-time-to-live P7D
```

### Cause 3: Message Lock Expiration

When a consumer receives a message, it gets a lock. If the lock expires before the consumer completes or abandons the message, Service Bus assumes the consumer failed and delivers the message to another consumer. After enough lock expirations, the delivery count hits the max.

**Fix**: Increase the lock duration or implement lock renewal.

```bash
# Increase the lock duration (max 5 minutes)
az servicebus queue update \
  --resource-group my-rg \
  --namespace-name my-servicebus \
  --name my-queue \
  --lock-duration PT5M
```

For longer processing, use auto lock renewal in the SDK (shown in the consumer code above with `MaxAutoLockRenewalDuration`).

### Cause 4: Poison Messages

Some messages are inherently unprocessable - malformed JSON, missing required fields, or referencing data that no longer exists. These will always fail, no matter how many times they are retried.

**Fix**: Add message validation at the start of your consumer. If a message is invalid, dead-letter it immediately with a descriptive reason instead of letting it exhaust the retry count.

```csharp
processor.ProcessMessageAsync += async args =>
{
    var body = args.Message.Body.ToString();

    // Validate the message before processing
    if (!IsValidMessage(body))
    {
        await args.DeadLetterMessageAsync(args.Message,
            deadLetterReason: "InvalidMessage",
            deadLetterErrorDescription: "Message body failed validation");
        return;
    }

    // Process the valid message
    await ProcessMessageAsync(body);
    await args.CompleteMessageAsync(args.Message);
};
```

## Step 3: Reprocess or Purge DLQ Messages

Once you fix the underlying issue, you need to deal with the accumulated DLQ messages.

### Reprocess Messages

If the messages are still valid and the issue is fixed, move them back to the main queue.

```csharp
// Reprocess DLQ messages by receiving from DLQ and sending back to the main queue
var dlqReceiver = client.CreateReceiver("my-queue",
    new ServiceBusReceiverOptions { SubQueue = SubQueue.DeadLetter });
var sender = client.CreateSender("my-queue");

while (true)
{
    var message = await dlqReceiver.ReceiveMessageAsync(TimeSpan.FromSeconds(5));
    if (message == null) break;

    // Create a new message with the same body
    var newMessage = new ServiceBusMessage(message.Body)
    {
        ContentType = message.ContentType,
        Subject = message.Subject,
        MessageId = message.MessageId
    };

    // Send back to the main queue
    await sender.SendMessageAsync(newMessage);

    // Complete the DLQ message to remove it
    await dlqReceiver.CompleteMessageAsync(message);
}
```

### Purge DLQ Messages

If the messages are no longer needed, purge them.

```bash
# In the Azure portal, use Service Bus Explorer > Dead-letter tab > Purge messages

# Or programmatically
# Receive and complete each message without reprocessing
```

## Monitoring and Alerting

Set up alerts so you catch DLQ buildup early rather than discovering thousands of messages.

```bash
# Create an alert when DLQ message count exceeds a threshold
az monitor metrics alert create \
  --resource-group my-rg \
  --name dlq-alert \
  --scopes "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.ServiceBus/namespaces/my-servicebus" \
  --condition "total DeadletteredMessages > 100" \
  --window-size PT5M \
  --evaluation-frequency PT1M \
  --action "/subscriptions/<sub-id>/resourceGroups/my-rg/providers/Microsoft.Insights/actionGroups/ops-team"
```

A healthy messaging system has a DLQ that is nearly empty. If messages regularly end up there, something in your processing pipeline needs attention. Fix the root cause, reprocess what you can, and set up monitoring so you catch future issues early.
