# How to Set Up Azure Event Grid Notifications for Storage Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Event Grid, Storage Events, Event-Driven Architecture, Blob Storage, Notifications, Serverless

Description: How to configure Azure Event Grid to send real-time notifications when events occur in your Azure Storage account, with practical filtering and routing examples.

---

Azure Event Grid is a fully managed event routing service that delivers events from Azure resources to subscribers in near real-time. When paired with Azure Storage, it enables event-driven architectures where your applications react to storage events as they happen - a blob gets uploaded, a container gets deleted, a blob's tier changes. Instead of polling for changes, your application gets pushed a notification within seconds. This guide covers the practical setup, filtering, and routing options.

## What Events Does Storage Emit?

Azure Storage publishes the following event types through Event Grid:

| Event Type | Description |
|-----------|-------------|
| Microsoft.Storage.BlobCreated | A blob was created or replaced |
| Microsoft.Storage.BlobDeleted | A blob was deleted |
| Microsoft.Storage.BlobRenamed | A blob was renamed (ADLS Gen2 only) |
| Microsoft.Storage.DirectoryCreated | A directory was created (ADLS Gen2 only) |
| Microsoft.Storage.DirectoryDeleted | A directory was deleted (ADLS Gen2 only) |
| Microsoft.Storage.DirectoryRenamed | A directory was renamed (ADLS Gen2 only) |
| Microsoft.Storage.BlobTierChanged | A blob's access tier was changed |
| Microsoft.Storage.AsyncOperationInitiated | Archive-to-hot/cool rehydration started |
| Microsoft.Storage.BlobInventoryPolicyCompleted | An inventory run completed |

The most commonly used events are BlobCreated and BlobDeleted.

## Creating a Basic Event Subscription

An Event Grid subscription connects a source (your storage account) to a destination (the subscriber). Let's start with a simple webhook subscriber.

### Webhook Subscriber

```bash
# Create an Event Grid subscription that sends blob events to a webhook
az eventgrid event-subscription create \
  --name blob-events-webhook \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --endpoint "https://myapp.azurewebsites.net/api/storage-events" \
  --included-event-types "Microsoft.Storage.BlobCreated" "Microsoft.Storage.BlobDeleted"
```

When Event Grid creates a webhook subscription, it sends a validation event to your endpoint. Your endpoint must respond with the validation code to confirm it can receive events. Most frameworks handle this automatically.

### Azure Function Subscriber

```bash
# Route storage events to an Azure Function
az eventgrid event-subscription create \
  --name blob-events-function \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --endpoint-type azurefunction \
  --endpoint "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Web/sites/my-function-app/functions/ProcessBlobEvent" \
  --included-event-types "Microsoft.Storage.BlobCreated"
```

### Queue Storage Subscriber

For decoupled processing, send events to a storage queue that workers poll:

```bash
# Route events to an Azure Storage Queue
az eventgrid event-subscription create \
  --name blob-events-queue \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --endpoint-type storagequeue \
  --endpoint "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/queuestorageaccount/queueservices/default/queues/blob-events" \
  --included-event-types "Microsoft.Storage.BlobCreated"
```

### Service Bus Subscriber

For ordered processing or complex routing, use Azure Service Bus:

```bash
# Route events to a Service Bus topic
az eventgrid event-subscription create \
  --name blob-events-servicebus \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --endpoint-type servicebustopic \
  --endpoint "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.ServiceBus/namespaces/my-sb-namespace/topics/storage-events" \
  --included-event-types "Microsoft.Storage.BlobCreated"
```

## Filtering Events

Raw event subscriptions can be noisy. Filters let you narrow down which events get delivered.

### Subject Filtering

The event subject for blob events follows the pattern `/blobServices/default/containers/{container}/blobs/{blob}`. You can filter by prefix and suffix:

```bash
# Only receive events for blobs in the 'uploads' container with .jpg extension
az eventgrid event-subscription create \
  --name filtered-blob-events \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --endpoint "https://myapp.azurewebsites.net/api/image-processor" \
  --included-event-types "Microsoft.Storage.BlobCreated" \
  --subject-begins-with "/blobServices/default/containers/uploads/" \
  --subject-ends-with ".jpg"
```

### Advanced Filtering

For more complex filters, use advanced filtering on event data fields:

```bash
# Only receive events for blobs larger than 1 MB
az eventgrid event-subscription create \
  --name large-blob-events \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --endpoint "https://myapp.azurewebsites.net/api/large-file-handler" \
  --included-event-types "Microsoft.Storage.BlobCreated" \
  --advanced-filter data.contentLength NumberGreaterThan 1048576
```

You can combine multiple advanced filters:

```bash
# Events for blobs in 'data' container, created via PutBlob API, larger than 10 MB
az eventgrid event-subscription create \
  --name complex-filter \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --endpoint "https://myapp.azurewebsites.net/api/handler" \
  --included-event-types "Microsoft.Storage.BlobCreated" \
  --subject-begins-with "/blobServices/default/containers/data/" \
  --advanced-filter data.api StringIn PutBlob PutBlockList \
  --advanced-filter data.contentLength NumberGreaterThan 10485760
```

## Understanding the Event Schema

Here is what a BlobCreated event looks like:

```json
{
  "id": "unique-event-id",
  "topic": "/subscriptions/{sub}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount",
  "subject": "/blobServices/default/containers/uploads/blobs/photo.jpg",
  "eventType": "Microsoft.Storage.BlobCreated",
  "eventTime": "2026-02-16T10:30:00Z",
  "data": {
    "api": "PutBlob",
    "clientRequestId": "client-request-id",
    "requestId": "storage-request-id",
    "eTag": "0x8D...",
    "contentType": "image/jpeg",
    "contentLength": 524288,
    "blobType": "BlockBlob",
    "url": "https://mystorageaccount.blob.core.windows.net/uploads/photo.jpg",
    "sequencer": "000000000000000000000000000006D5...",
    "storageDiagnostics": {
      "batchId": "batch-id"
    }
  },
  "dataVersion": "",
  "metadataVersion": "1"
}
```

The `data.api` field tells you which API operation created the blob (PutBlob, PutBlockList, CopyBlob, etc.). The `data.sequencer` field provides ordering for events on the same blob.

## Handling Events in Application Code

### Python Webhook Handler (Flask)

```python
from flask import Flask, request, jsonify
import json

app = Flask(__name__)

@app.route("/api/storage-events", methods=["POST"])
def handle_storage_event():
    """Handle Event Grid events for storage operations."""

    events = request.get_json()

    for event in events:
        event_type = event.get("eventType")

        # Handle Event Grid validation handshake
        if event_type == "Microsoft.EventGrid.SubscriptionValidationEvent":
            validation_code = event["data"]["validationCode"]
            return jsonify({"validationResponse": validation_code})

        # Handle blob created events
        if event_type == "Microsoft.Storage.BlobCreated":
            blob_url = event["data"]["url"]
            content_type = event["data"]["contentType"]
            size = event["data"]["contentLength"]

            print(f"New blob: {blob_url}")
            print(f"Type: {content_type}, Size: {size}")

            # Process the blob based on content type
            if content_type.startswith("image/"):
                process_image(blob_url)
            elif content_type == "text/csv":
                process_csv(blob_url)

    return "", 200
```

### .NET Event Grid Handler

```csharp
using Azure.Messaging.EventGrid;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/storage-events")]
public class StorageEventsController : ControllerBase
{
    [HttpPost]
    public IActionResult HandleEvents([FromBody] EventGridEvent[] events)
    {
        foreach (var eventGridEvent in events)
        {
            // Handle validation
            if (eventGridEvent.EventType == "Microsoft.EventGrid.SubscriptionValidationEvent")
            {
                var validationData = eventGridEvent.Data.ToObjectFromJson<dynamic>();
                return Ok(new { validationResponse = validationData.validationCode });
            }

            // Handle blob created
            if (eventGridEvent.EventType == "Microsoft.Storage.BlobCreated")
            {
                var blobData = eventGridEvent.Data.ToObjectFromJson<dynamic>();
                string blobUrl = blobData.url;
                long contentLength = blobData.contentLength;

                Console.WriteLine($"New blob: {blobUrl}, Size: {contentLength}");
                // Process the blob
            }
        }

        return Ok();
    }
}
```

## Dead-Letter and Retry Configuration

Event Grid retries failed deliveries with exponential backoff. You can configure the retry policy and dead-letter destination:

```bash
# Configure retry and dead-letter settings
az eventgrid event-subscription create \
  --name reliable-events \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --endpoint "https://myapp.azurewebsites.net/api/handler" \
  --max-delivery-attempts 10 \
  --event-ttl 1440 \
  --deadletter-endpoint "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/dlqstorageaccount/blobServices/default/containers/dead-letter"
```

- **max-delivery-attempts**: Maximum number of retry attempts (default 30)
- **event-ttl**: Time-to-live in minutes (default 1440 / 24 hours)
- **deadletter-endpoint**: Where to store events that could not be delivered

## Monitoring Event Grid Subscriptions

Keep an eye on your event delivery health:

```bash
# Check delivery metrics for an event subscription
az eventgrid event-subscription show \
  --name blob-events-webhook \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myRG/providers/Microsoft.Storage/storageAccounts/mystorageaccount"
```

Azure Monitor also provides Event Grid metrics:

- **Matched Events**: Events that matched the subscription filter
- **Delivery Successful**: Events delivered to the endpoint
- **Delivery Failed**: Events that failed delivery after all retries
- **Dead Lettered Events**: Events sent to the dead-letter destination

Event Grid is the backbone of event-driven architectures in Azure. Setting up storage event notifications takes just a few commands, and the filtering capabilities let you be precise about which events your application cares about. Combined with Azure Functions, Service Bus, or custom webhooks, it enables powerful automation workflows that react to storage changes in near real-time.
