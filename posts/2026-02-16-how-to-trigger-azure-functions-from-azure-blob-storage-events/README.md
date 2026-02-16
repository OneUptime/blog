# How to Trigger Azure Functions from Azure Blob Storage Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Functions, Blob Storage, Event Grid, Serverless, Event-Driven, Automation

Description: Learn how to set up Azure Functions that automatically trigger when blobs are created, updated, or deleted in Azure Blob Storage.

---

One of the most common serverless patterns in Azure is triggering a function whenever a blob is uploaded or modified. Think image processing when a photo is uploaded, data validation when a CSV lands in a container, or virus scanning when any file arrives. Azure Functions provides two ways to react to blob events: the classic Blob trigger and the Event Grid-based trigger. This guide walks through both approaches, when to use each, and the gotchas you need to know.

## Blob Trigger vs. Event Grid Trigger

Before writing any code, you need to understand the two trigger mechanisms:

**Blob Trigger (classic)**: The function polls a blob container by periodically scanning for new or modified blobs. It uses a combination of Azure Storage logs and blob receipts to track what has been processed.

**Event Grid Trigger**: Azure Event Grid pushes an event to the function when a blob operation occurs. The function reacts in near-real-time without polling.

| Feature | Blob Trigger | Event Grid Trigger |
|---------|-------------|-------------------|
| Latency | Up to several minutes (polling) | Seconds |
| Scalability | Limited by polling frequency | Scales with Event Grid |
| Reliability | Can miss events if high volume | More reliable at high volume |
| Setup complexity | Simple (just a connection string) | Requires Event Grid subscription |
| Blob path filtering | Prefix-based only | Full regex/suffix support |

My recommendation: use the Event Grid trigger for new projects. The Blob trigger is simpler to set up, but the latency and reliability issues make it a poor choice for production workloads.

## Setting Up an Event Grid-Based Blob Trigger

### Step 1: Create the Function App

```bash
# Create a resource group
az group create --name func-rg --location eastus

# Create a storage account for the function app runtime
az storage account create \
  --name funcappstorage2026 \
  --resource-group func-rg \
  --location eastus \
  --sku Standard_LRS

# Create the function app
az functionapp create \
  --resource-group func-rg \
  --name my-blob-processor \
  --consumption-plan-location eastus \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --storage-account funcappstorage2026 \
  --os-type Linux
```

### Step 2: Write the Function Code

Create a function that processes blobs when Event Grid delivers a BlobCreated event. Here is a Python example that processes uploaded images:

```python
# function_app.py
import azure.functions as func
import logging
import json
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

app = func.FunctionApp()

# Event Grid trigger that fires on blob created events
# The source filter limits events to a specific storage account
@app.function_name(name="ProcessUploadedBlob")
@app.event_grid_trigger(arg_name="event")
def process_blob(event: func.EventGridEvent):
    """Process a blob when it is uploaded to the images container."""

    # Parse the event data
    event_data = event.get_json()
    blob_url = event_data.get("url", "")
    content_type = event_data.get("contentType", "")
    content_length = event_data.get("contentLength", 0)

    logging.info(f"Processing blob: {blob_url}")
    logging.info(f"Content type: {content_type}, Size: {content_length}")

    # Extract container and blob name from the URL
    # URL format: https://account.blob.core.windows.net/container/blobname
    parts = blob_url.split("/")
    container_name = parts[3]
    blob_name = "/".join(parts[4:])

    # Only process blobs in the 'uploads' container
    if container_name != "uploads":
        logging.info(f"Skipping blob in container: {container_name}")
        return

    # Download the blob for processing
    credential = DefaultAzureCredential()
    blob_service = BlobServiceClient(
        account_url=f"https://{parts[2]}",
        credential=credential
    )

    blob_client = blob_service.get_blob_client(container_name, blob_name)
    blob_data = blob_client.download_blob().readall()

    # Process the blob (example: validate file size)
    if content_length > 100 * 1024 * 1024:  # 100 MB limit
        logging.warning(f"Blob {blob_name} exceeds size limit: {content_length}")
        # Move to quarantine container
        quarantine_client = blob_service.get_blob_client("quarantine", blob_name)
        quarantine_client.upload_blob(blob_data, overwrite=True)
        blob_client.delete_blob()
        return

    logging.info(f"Successfully processed blob: {blob_name}")
```

### Step 3: Create the Event Grid Subscription

Create a subscription that routes blob events from your storage account to the function:

```bash
# Get the function's resource ID for the endpoint
FUNCTION_ID=$(az functionapp show \
  --name my-blob-processor \
  --resource-group func-rg \
  --query "id" -o tsv)

# Create an Event Grid subscription on the storage account
az eventgrid event-subscription create \
  --name blob-upload-subscription \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --endpoint-type azurefunction \
  --endpoint "${FUNCTION_ID}/functions/ProcessUploadedBlob" \
  --included-event-types "Microsoft.Storage.BlobCreated" \
  --subject-begins-with "/blobServices/default/containers/uploads" \
  --subject-ends-with ".jpg" ".png" ".gif"
```

The filters are important:

- **included-event-types**: Only trigger on blob creation (not deletion, tier changes, etc.)
- **subject-begins-with**: Only trigger for blobs in the "uploads" container
- **subject-ends-with**: Only trigger for image files

## Setting Up a Classic Blob Trigger

If you prefer the simpler Blob trigger for low-volume scenarios, here is how:

```python
# function_app.py
import azure.functions as func
import logging

app = func.FunctionApp()

# Classic blob trigger that polls for new blobs
# path defines which container and blob pattern to watch
@app.function_name(name="ProcessNewFile")
@app.blob_trigger(
    arg_name="myblob",
    path="uploads/{name}",
    connection="AzureWebJobsStorage"
)
def process_new_file(myblob: func.InputStream):
    """Triggered when a new blob appears in the uploads container."""

    logging.info(f"Blob trigger fired for: {myblob.name}")
    logging.info(f"Blob size: {myblob.length} bytes")

    # Read the blob content
    content = myblob.read()

    # Process the content
    # For example, count lines in a text file
    if myblob.name.endswith(".csv"):
        line_count = content.decode("utf-8").count("\n")
        logging.info(f"CSV file {myblob.name} has {line_count} lines")
```

The Blob trigger uses the `path` parameter to define which container and blob pattern to watch. The `{name}` placeholder captures the blob name and makes it available in the function.

## Handling Large Blobs

For large blobs, you do not want to load the entire blob into memory in the function. Instead, use the blob URL from the event to create a streaming reader:

```python
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential

@app.function_name(name="ProcessLargeBlob")
@app.event_grid_trigger(arg_name="event")
def process_large_blob(event: func.EventGridEvent):
    """Process large blobs without loading them entirely into memory."""

    event_data = event.get_json()
    blob_url = event_data["url"]

    # Parse the URL to get account, container, and blob name
    parts = blob_url.split("/")
    account_url = f"https://{parts[2]}"
    container_name = parts[3]
    blob_name = "/".join(parts[4:])

    credential = DefaultAzureCredential()
    blob_service = BlobServiceClient(account_url, credential=credential)
    blob_client = blob_service.get_blob_client(container_name, blob_name)

    # Stream the blob in chunks instead of loading all at once
    # Each chunk is 4 MB, processed incrementally
    stream = blob_client.download_blob()
    chunks_processed = 0
    for chunk in stream.chunks():
        # Process each chunk
        process_chunk(chunk)
        chunks_processed += 1

    logging.info(f"Processed {chunks_processed} chunks from {blob_name}")
```

## Error Handling and Dead-Letter Configuration

When your function fails to process an event, Event Grid retries delivery. Configure dead-lettering to capture events that fail repeatedly:

```bash
# Create a dead-letter container
az storage container create \
  --name dead-letter-events \
  --account-name mystorageaccount

# Update the event subscription with dead-letter destination
az eventgrid event-subscription update \
  --name blob-upload-subscription \
  --source-resource-id "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount" \
  --deadletter-endpoint "/subscriptions/{sub-id}/resourceGroups/myResourceGroup/providers/Microsoft.Storage/storageAccounts/mystorageaccount/blobServices/default/containers/dead-letter-events"
```

## Avoiding Infinite Loops

A common mistake is having a function that writes to the same container it is triggered from, creating an infinite loop. There are a few ways to prevent this:

1. **Use separate containers**: Read from "uploads" and write results to "processed"
2. **Use subject filters**: Filter the Event Grid subscription so it only fires for specific blob name patterns
3. **Check blob metadata**: Set a "processed" flag in blob metadata and skip blobs that already have it

```python
# Check if blob was already processed using metadata
properties = blob_client.get_blob_properties()
if properties.metadata.get("processed") == "true":
    logging.info(f"Blob {blob_name} already processed, skipping")
    return

# After processing, mark the blob as processed
blob_client.set_blob_metadata({"processed": "true"})
```

## Testing Locally

You can test Event Grid triggers locally using the Azure Functions Core Tools and a tool like ngrok or the Azure Event Grid viewer:

```bash
# Start the function locally
func start

# Send a test event using curl
curl -X POST http://localhost:7071/runtime/webhooks/EventGrid \
  -H "Content-Type: application/json" \
  -H "aeg-event-type: Notification" \
  -d '[{
    "id": "test-event-1",
    "eventType": "Microsoft.Storage.BlobCreated",
    "subject": "/blobServices/default/containers/uploads/blobs/test.jpg",
    "eventTime": "2026-02-16T10:00:00Z",
    "data": {
      "api": "PutBlob",
      "url": "https://mystorageaccount.blob.core.windows.net/uploads/test.jpg",
      "contentType": "image/jpeg",
      "contentLength": 1024
    },
    "dataVersion": "1"
  }]'
```

This lets you iterate on the function logic without deploying to Azure or generating real blob events. Once you are happy with the behavior locally, deploy to Azure and test with real blobs to verify the end-to-end flow.
