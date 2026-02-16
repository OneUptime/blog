# How to Enable Blob Change Feed in Azure Storage for Event Tracking

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Change Feed, Event Tracking, Audit Logging, Data Processing, Storage Events

Description: How to enable and consume the Azure Blob Storage change feed to track all create, modify, and delete events on your blobs.

---

When you need a reliable, ordered record of every change that happens to blobs in your storage account, the blob change feed is the right tool. Unlike Event Grid notifications (which are best-effort and can be missed), the change feed provides a guaranteed, ordered, read-only log of all blob changes. It is stored as blobs in a special container within your storage account, making it easy to process with standard tools. This guide covers how to enable it, read the data, and build useful workflows on top of it.

## What the Change Feed Captures

The change feed records events for the following operations on blobs:

- **BlobCreated**: A new blob was created or an existing blob was overwritten
- **BlobDeleted**: A blob was deleted
- **BlobPropertiesUpdated**: Blob metadata or properties changed
- **BlobSnapshotCreated**: A snapshot was taken
- **BlobTierChanged**: The blob's access tier was changed
- **BlobVersionCreated**: A new version was created (when blob versioning is enabled)

Each event record includes the blob name, container, event type, timestamp, content type, content length, and the API operation that triggered the change.

## How It Differs from Event Grid

Both the change feed and Azure Event Grid can notify you about blob changes, but they serve different purposes:

| Feature | Change Feed | Event Grid |
|---------|------------|------------|
| Delivery guarantee | All events captured | Best-effort (can miss events under load) |
| Ordering | Guaranteed per-blob ordering | No ordering guarantee |
| Retention | Configurable, stored in your account | Events expire if not consumed |
| Latency | Minutes (batch processing) | Seconds (near real-time) |
| Use case | Audit, compliance, batch sync | Real-time triggers, event-driven apps |

Use Event Grid when you need real-time reactions. Use the change feed when you need a complete, reliable record of everything that happened.

## Enabling the Change Feed

You can enable the change feed through the Azure Portal, CLI, or ARM templates.

### Using Azure CLI

```bash
# Enable blob change feed on a storage account
# Optionally set a retention period in days
az storage account blob-service-properties update \
  --account-name mystorageaccount \
  --resource-group myResourceGroup \
  --enable-change-feed true \
  --change-feed-retention-days 90
```

The `--change-feed-retention-days` parameter is optional. If you do not set it, change feed records are retained indefinitely. Setting a retention period helps manage storage costs for high-volume accounts.

### Using Azure Portal

1. Navigate to your storage account
2. Under "Data management," click "Data protection"
3. Under "Tracking," check "Enable blob change feed"
4. Optionally set the retention period
5. Click Save

### Using ARM Template

For infrastructure-as-code deployments, include the change feed setting in your storage account template:

```json
{
  "type": "Microsoft.Storage/storageAccounts/blobServices",
  "apiVersion": "2023-01-01",
  "name": "[concat(parameters('storageAccountName'), '/default')]",
  "properties": {
    "changeFeed": {
      "enabled": true,
      "retentionInDays": 90
    }
  }
}
```

## Understanding the Change Feed Format

After enabling, the change feed data appears in a special container called `$blobchangefeed` in your storage account. The data is organized by time:

```
$blobchangefeed/
  log/
    00/
      2026/
        02/
          16/
            0000/
              - segment files (Avro format)
            0100/
              - segment files
            ...
```

The directory structure follows the pattern `log/00/YYYY/MM/DD/HHmm/`. Each segment is stored in Apache Avro format, which is a compact binary format with a schema embedded in each file.

## Reading the Change Feed with Python

The Azure SDK provides a high-level API for reading the change feed that handles the Avro parsing and pagination for you:

```python
from azure.storage.blob.changefeed import ChangeFeedClient
from azure.identity import DefaultAzureCredential
from datetime import datetime, timezone

credential = DefaultAzureCredential()

# Create a change feed client
cf_client = ChangeFeedClient(
    "https://mystorageaccount.blob.core.windows.net",
    credential=credential
)

# Read events from a specific time range
# This returns an iterator over all change events
start_time = datetime(2026, 2, 16, 0, 0, 0, tzinfo=timezone.utc)
end_time = datetime(2026, 2, 16, 23, 59, 59, tzinfo=timezone.utc)

events = cf_client.list_changes(
    start_time=start_time,
    end_time=end_time
)

for event in events:
    print(f"Time: {event['eventTime']}")
    print(f"Type: {event['eventType']}")
    print(f"Blob: {event['subject']}")
    print(f"API: {event['data']['api']}")
    print("---")
```

### Resumable Processing with Continuation Tokens

For long-running processing jobs, you want the ability to stop and resume without reprocessing events:

```python
from azure.storage.blob.changefeed import ChangeFeedClient
from azure.identity import DefaultAzureCredential
import json

credential = DefaultAzureCredential()
cf_client = ChangeFeedClient(
    "https://mystorageaccount.blob.core.windows.net",
    credential=credential
)

# Load the last saved continuation token (if any)
try:
    with open("change_feed_cursor.json", "r") as f:
        cursor = json.load(f)["continuation_token"]
except FileNotFoundError:
    cursor = None

# List changes, resuming from the saved cursor
change_feed = cf_client.list_changes(results_per_page=100).by_page(cursor)

for page in change_feed:
    for event in page:
        # Process each event
        process_event(event)

    # Save the continuation token after each page
    # This lets you resume from here if the process crashes
    token = change_feed.continuation_token
    with open("change_feed_cursor.json", "w") as f:
        json.dump({"continuation_token": token}, f)
```

## Building a Blob Audit Log

One of the most common uses for the change feed is building an audit log that tracks who changed what and when. Here is a practical example that writes audit records to a database:

```python
import pyodbc
from azure.storage.blob.changefeed import ChangeFeedClient
from azure.identity import DefaultAzureCredential
from datetime import datetime, timezone, timedelta

def sync_audit_log():
    """Read new change feed events and insert them into an audit database."""

    credential = DefaultAzureCredential()
    cf_client = ChangeFeedClient(
        "https://mystorageaccount.blob.core.windows.net",
        credential=credential
    )

    # Process events from the last hour
    start = datetime.now(timezone.utc) - timedelta(hours=1)

    conn = pyodbc.connect("Driver={ODBC Driver 18 for SQL Server};"
                          "Server=myserver.database.windows.net;"
                          "Database=auditdb;")
    cursor = conn.cursor()

    events = cf_client.list_changes(start_time=start)

    batch = []
    for event in events:
        batch.append((
            event["eventTime"],
            event["eventType"],
            event["subject"],                    # Blob path
            event["data"].get("api", "unknown"), # API operation
            event["data"].get("contentLength", 0),
            event["data"].get("contentType", ""),
        ))

        # Insert in batches of 500
        if len(batch) >= 500:
            cursor.executemany(
                "INSERT INTO blob_audit (event_time, event_type, blob_path, api_operation, content_length, content_type) VALUES (?, ?, ?, ?, ?, ?)",
                batch
            )
            conn.commit()
            batch = []

    # Insert remaining events
    if batch:
        cursor.executemany(
            "INSERT INTO blob_audit (event_time, event_type, blob_path, api_operation, content_length, content_type) VALUES (?, ?, ?, ?, ?, ?)",
            batch
        )
        conn.commit()

    conn.close()
```

## Processing the Raw Avro Files Directly

If you prefer to process the raw Avro files (for example, in a Spark job or a data pipeline), you can access them directly from the `$blobchangefeed` container:

```python
from azure.storage.blob import BlobServiceClient
from azure.identity import DefaultAzureCredential
import avro.datafile
import avro.io
import io

credential = DefaultAzureCredential()
blob_service = BlobServiceClient(
    "https://mystorageaccount.blob.core.windows.net",
    credential=credential
)

# Access the change feed container
container = blob_service.get_container_client("$blobchangefeed")

# List available segments for a specific date
blobs = container.list_blobs(
    name_starts_with="log/00/2026/02/16/"
)

for blob in blobs:
    if blob.name.endswith(".avro"):
        # Download and parse the Avro file
        blob_client = container.get_blob_client(blob.name)
        data = blob_client.download_blob().readall()

        reader = avro.datafile.DataFileReader(
            io.BytesIO(data),
            avro.io.DatumReader()
        )

        for record in reader:
            print(record)
        reader.close()
```

## Cost and Performance Considerations

The change feed itself is stored as regular blobs in the `$blobchangefeed` container, so you pay standard blob storage rates for the data. For a busy storage account, the change feed can grow quickly:

- Each event record is roughly 300-500 bytes
- An account processing 1 million blob operations per day generates about 300-500 MB of change feed data per day
- With 90-day retention, that is 27-45 GB of change feed storage

The change feed is append-only and new segments are typically available within a few minutes of the events occurring. This is not real-time - if you need sub-second event delivery, use Event Grid instead.

## Practical Tips

- **Enable change feed before you need it.** It only captures events from the point it is enabled. You cannot retroactively generate change feed data for past events.
- **Combine with Event Grid.** Use Event Grid for real-time processing and the change feed for batch reconciliation. This gives you both speed and completeness.
- **Set retention based on compliance needs.** If your industry requires 7-year audit trails, do not set a 90-day retention on the change feed. Either set it to indefinite or archive the data to a separate storage account before it expires.
- **Process incrementally.** Always use continuation tokens or time-based filtering to avoid reprocessing old events. The change feed can be large, and scanning from the beginning every time is wasteful.

The blob change feed is one of those features that you set up once and it quietly does its job in the background. It becomes invaluable when you need to answer questions like "what changed in the last 24 hours?" or "when was this blob last modified and by which operation?" Having that data readily available can save hours of investigation during incidents.
