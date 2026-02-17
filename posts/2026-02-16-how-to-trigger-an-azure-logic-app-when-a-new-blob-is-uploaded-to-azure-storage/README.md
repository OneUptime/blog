# How to Trigger an Azure Logic App When a New Blob Is Uploaded to Azure Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Logic Apps, Blob Storage, Event Grid, Triggers, Serverless, Automation

Description: Learn three different approaches to trigger an Azure Logic App when a new blob is uploaded to Azure Storage and choose the best one for your use case.

---

Triggering a workflow when a file lands in Azure Blob Storage is one of the most common automation scenarios. Maybe you need to process uploaded images, parse incoming CSV files, validate documents, or kick off a data pipeline. Azure gives you multiple ways to connect blob uploads to Logic Apps, and the approach you choose affects latency, cost, and reliability.

In this post, I will walk through three approaches: the built-in Blob Storage trigger, Event Grid integration, and Event Grid with a Service Bus queue for guaranteed delivery. I will explain the tradeoffs of each so you can pick the right one.

## Approach 1: Built-in Blob Storage Polling Trigger

The simplest approach uses the Azure Blob Storage connector's "When a blob is added or modified" trigger. This trigger polls the storage container at a configured interval.

### Setup

1. Create a new Logic App (Consumption or Standard)
2. Add the trigger "When a blob is added or modified (properties only)" from the Azure Blob Storage connector
3. Configure the connection to your storage account
4. Set the container name
5. Set the polling interval (e.g., every 1 minute)

### How It Works

The trigger polls the storage container at the configured interval. On each poll, it checks for new or modified blobs by comparing the last modified timestamp. If it finds new blobs, the workflow runs once for each new blob.

### Getting the Blob Content

The polling trigger returns blob metadata (name, path, size, content type) but not the actual content. Add a "Get blob content" action as the next step:

```json
{
  "actions": {
    "Get_blob_content": {
      "type": "ApiConnection",
      "inputs": {
        "host": {
          "connection": {
            "name": "@parameters('$connections')['azureblob']['connectionId']"
          }
        },
        "method": "get",
        "path": "/v2/datasets/@{encodeURIComponent(encodeURIComponent('AccountNameFromSettings'))}/GetFileContentByPath",
        "queries": {
          "path": "@triggerBody()?['Path']",
          "inferContentType": true
        }
      }
    }
  }
}
```

### Limitations

- **Latency**: The minimum polling interval is 1 second for Standard and 1 minute for Consumption, but in practice there is a delay equal to your polling interval plus processing time.
- **Cost**: Every poll counts as a trigger execution, even if no new blobs are found. At 1-minute polling, that is 43,800 trigger checks per month regardless of how many blobs are uploaded.
- **Scalability**: For containers with thousands of blobs, the polling trigger can become slow because it needs to enumerate blobs to find changes.
- **Reliability**: If the Logic App is disabled or the platform has a brief outage during a poll cycle, you might miss blobs.

### When to Use It

Use the polling trigger for low-volume, non-critical scenarios where a few minutes of latency is acceptable and the container has a manageable number of blobs.

## Approach 2: Event Grid Trigger (Recommended)

Event Grid provides near real-time, push-based notifications when blobs are created. This is the recommended approach for most production scenarios.

### Step 1: Enable Event Grid on the Storage Account

Event Grid events are generated automatically by Azure Storage, but you need to create a subscription to route them to your Logic App.

### Step 2: Create the Logic App with an Event Grid Trigger

1. Create a new Logic App
2. Add the trigger "When a resource event occurs" from the Azure Event Grid connector
3. Configure the subscription:
   - **Subscription**: Your Azure subscription
   - **Resource Type**: Microsoft.Storage.StorageAccounts
   - **Resource Name**: Your storage account name
   - **Event Type Item**: Microsoft.Storage.BlobCreated

### Step 3: Filter by Container and File Type

The Event Grid trigger fires for any blob created in the entire storage account. Add a condition to filter for the specific container and file types you care about:

```json
{
  "actions": {
    "Filter_By_Container": {
      "type": "If",
      "expression": {
        "and": [
          {
            "contains": [
              "@triggerBody()?['data']?['url']",
              "/uploads/"
            ]
          },
          {
            "endsWith": [
              "@triggerBody()?['data']?['url']",
              ".csv"
            ]
          }
        ]
      },
      "actions": {
        "Process_CSV": {
          "type": "Scope",
          "actions": {}
        }
      }
    }
  }
}
```

Alternatively, configure subject filtering directly on the Event Grid subscription for better performance:

```bash
# Create an Event Grid subscription with subject filtering
# This filters events at the Event Grid level, before they reach your Logic App
az eventgrid event-subscription create \
  --name blob-upload-subscription \
  --source-resource-id "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<storage-account>" \
  --endpoint-type webhook \
  --endpoint "https://prod-XX.eastus.logic.azure.com:443/workflows/YOUR_WORKFLOW_ID/triggers/manual/paths/invoke?..." \
  --included-event-types Microsoft.Storage.BlobCreated \
  --subject-begins-with "/blobServices/default/containers/uploads/" \
  --subject-ends-with ".csv"
```

### Step 4: Get the Blob Content

The Event Grid event contains the blob URL in the event data. Use it to fetch the blob content:

```json
{
  "actions": {
    "Get_Blob_Content": {
      "type": "Http",
      "inputs": {
        "method": "GET",
        "uri": "@triggerBody()?['data']?['url']",
        "authentication": {
          "type": "ManagedServiceIdentity",
          "audience": "https://storage.azure.com/"
        }
      }
    }
  }
}
```

### Advantages Over Polling

- **Near real-time**: Events arrive within seconds of blob creation
- **Cost effective**: No empty polls. You only pay when a blob is actually created
- **Scalable**: Event Grid handles millions of events per second
- **Reliable**: Event Grid has built-in retry with exponential backoff

### When to Use It

Use Event Grid for most production scenarios. It is better than polling in almost every way.

## Approach 3: Event Grid with Service Bus Queue (Most Reliable)

For critical workflows where you absolutely cannot miss a blob upload event, add a Service Bus queue between Event Grid and the Logic App. This gives you durable message storage - if the Logic App is temporarily unavailable, events queue up in Service Bus and are processed when the Logic App comes back.

### Architecture

```mermaid
graph LR
    A[Blob Upload] --> B[Event Grid]
    B --> C[Service Bus Queue]
    C --> D[Logic App]
```

### Step 1: Create a Service Bus Queue

```bash
# Create a Service Bus namespace and queue
az servicebus namespace create \
  --resource-group rg-workflows \
  --name sb-blob-events \
  --location eastus \
  --sku Standard

az servicebus queue create \
  --resource-group rg-workflows \
  --namespace-name sb-blob-events \
  --name blob-upload-events \
  --max-delivery-count 10 \
  --default-message-time-to-live P7D
```

### Step 2: Route Event Grid to Service Bus

```bash
# Create an Event Grid subscription that sends to the Service Bus queue
az eventgrid event-subscription create \
  --name blob-to-servicebus \
  --source-resource-id "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Storage/storageAccounts/<storage-account>" \
  --endpoint-type servicebusqueue \
  --endpoint "/subscriptions/<sub-id>/resourceGroups/rg-workflows/providers/Microsoft.ServiceBus/namespaces/sb-blob-events/queues/blob-upload-events" \
  --included-event-types Microsoft.Storage.BlobCreated \
  --subject-begins-with "/blobServices/default/containers/uploads/"
```

### Step 3: Create the Logic App with Service Bus Trigger

Use the "When a message is received in a queue (auto-complete)" trigger from the Service Bus connector instead of the Event Grid trigger.

This approach gives you:

- **Guaranteed delivery**: If the Logic App fails to process a message, Service Bus retries delivery
- **Dead letter queue**: After max delivery attempts, failed messages go to a dead letter queue for manual review
- **Ordering**: Service Bus can provide ordered delivery with sessions
- **Batch processing**: You can use "peek-lock" and process messages in batches

## Complete Example: Processing Uploaded CSV Files

Here is a complete workflow that processes CSV files uploaded to a storage container:

1. **Trigger**: Event Grid - When a BlobCreated event occurs for the "uploads" container
2. **Action**: Get blob content using HTTP with managed identity authentication
3. **Action**: Parse the CSV content

```json
{
  "actions": {
    "Parse_CSV_Lines": {
      "type": "Compose",
      "inputs": "@split(body('Get_Blob_Content'), '\n')"
    }
  }
}
```

4. **Action**: For each line, parse the fields and insert into a database
5. **Action**: Move the processed blob to an "archive" container
6. **Action**: Delete the original blob from "uploads"

### Moving Processed Blobs

After processing, move the blob to an archive container:

```json
{
  "actions": {
    "Copy_To_Archive": {
      "type": "ApiConnection",
      "inputs": {
        "host": {
          "connection": {
            "name": "@parameters('$connections')['azureblob']['connectionId']"
          }
        },
        "method": "post",
        "path": "/v2/datasets/default/copyFile",
        "queries": {
          "source": "@triggerBody()?['data']?['url']",
          "destination": "/archive/@{utcNow('yyyy/MM/dd')}/@{last(split(triggerBody()?['data']?['url'], '/'))}"
        }
      }
    },
    "Delete_Original": {
      "type": "ApiConnection",
      "inputs": {
        "host": {
          "connection": {
            "name": "@parameters('$connections')['azureblob']['connectionId']"
          }
        },
        "method": "delete",
        "path": "/v2/datasets/default/files/@{encodeURIComponent(triggerBody()?['data']?['url'])}"
      },
      "runAfter": {
        "Copy_To_Archive": ["Succeeded"]
      }
    }
  }
}
```

## Comparison Summary

| Feature | Polling Trigger | Event Grid | Event Grid + Service Bus |
|---|---|---|---|
| Latency | 1-5 minutes | Seconds | Seconds + queue processing |
| Cost (no events) | Continuous polling cost | $0 | $0 + Service Bus baseline |
| Cost (per event) | Same as polling cost | ~$0.60 per million events | + Service Bus message cost |
| Reliability | Possible missed events | High (built-in retries) | Highest (durable queue) |
| Setup complexity | Low | Medium | Higher |
| Best for | Dev/test, low volume | Most production scenarios | Critical business workflows |

## Wrapping Up

For most scenarios, the Event Grid trigger is the right choice. It gives you near real-time notifications, eliminates polling costs, and handles the vast majority of reliability requirements. Add a Service Bus queue in front of the Logic App only when you need guaranteed delivery for critical business processes. Reserve the polling trigger for quick prototypes or situations where Event Grid is not available. Whichever approach you choose, always include error handling and archive processed blobs so you have an audit trail.
