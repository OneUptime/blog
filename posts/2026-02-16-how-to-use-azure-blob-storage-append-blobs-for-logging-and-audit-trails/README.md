# How to Use Azure Blob Storage Append Blobs for Logging and Audit Trails

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Blob Storage, Append Blobs, Logging, Audit Trail, Data Ingestion, Cloud Storage

Description: Learn how to use Azure Blob Storage append blobs for efficient log collection and audit trails with concurrent append operations and best practices.

---

When you need to collect logs or build audit trails in Azure, the typical approach is to write to a database or a message queue. But for many scenarios, append blobs in Azure Blob Storage offer a simpler, cheaper, and surprisingly capable alternative. Append blobs are optimized for append operations - you can add data to the end of the blob without reading or rewriting the existing content. Multiple writers can append to the same blob concurrently, making them ideal for distributed logging.

This guide covers how to use append blobs effectively for logging and audit trails, including concurrent writes, rotation strategies, and querying the collected data.

## What Makes Append Blobs Different

Azure Blob Storage has three blob types:

- **Block blobs**: General-purpose storage for files, images, documents. Supports up to 190.7 TiB per blob.
- **Page blobs**: Optimized for random read/write operations (used for VM disks). Supports up to 8 TiB.
- **Append blobs**: Optimized for append-only operations. Supports up to ~195 GiB (50,000 blocks x 4 MiB per block).

Append blobs have a key advantage for logging: the `AppendBlock` operation is atomic. Each append either succeeds completely or fails completely - there are no partial writes. This means you will never end up with half a log line in your file.

The limitations to know:
- Maximum 50,000 append operations per blob
- Maximum 4 MiB per append operation
- No support for modifying or deleting existing blocks
- No access tier changes (always in Hot tier)

## Step 1: Create an Append Blob

Create an append blob using the Azure SDK. Unlike block blobs, you create the blob first and then append to it:

```python
from azure.storage.blob import BlobServiceClient, BlobType
from datetime import datetime

# Initialize the blob service client
connection_string = "DefaultEndpointsProtocol=https;AccountName=stlogs2026;..."
blob_service = BlobServiceClient.from_connection_string(connection_string)

container = blob_service.get_container_client("application-logs")

# Create container if it does not exist
container.create_container()

# Create an append blob for today's logs
today = datetime.utcnow().strftime("%Y-%m-%d")
blob_name = f"app-server-01/{today}.log"
blob_client = container.get_blob_client(blob_name)

# Create the empty append blob
blob_client.create_append_blob()
print(f"Created append blob: {blob_name}")
```

## Step 2: Append Log Entries

Once the blob exists, append data to it. Each append operation adds a new block to the end of the blob:

```python
from azure.storage.blob import BlobServiceClient
from datetime import datetime
import json

connection_string = "DefaultEndpointsProtocol=https;AccountName=stlogs2026;..."
blob_service = BlobServiceClient.from_connection_string(connection_string)

def append_log_entry(container_name, blob_name, log_entry):
    """Append a single log entry to an append blob"""
    blob_client = blob_service.get_blob_client(container_name, blob_name)

    # Format the log entry as a JSON line with newline
    log_line = json.dumps(log_entry) + "\n"

    # Append to the blob
    blob_client.append_block(log_line.encode("utf-8"))

# Example usage - logging an API request
today = datetime.utcnow().strftime("%Y-%m-%d")
blob_name = f"api-logs/{today}.jsonl"

# Create the blob if it does not exist
blob_client = blob_service.get_blob_client("application-logs", blob_name)
try:
    blob_client.get_blob_properties()
except Exception:
    blob_client.create_append_blob()

# Append log entries
append_log_entry("application-logs", blob_name, {
    "timestamp": datetime.utcnow().isoformat(),
    "level": "INFO",
    "service": "api-gateway",
    "method": "GET",
    "path": "/api/v1/users",
    "status": 200,
    "duration_ms": 45,
    "client_ip": "10.0.1.100"
})

append_log_entry("application-logs", blob_name, {
    "timestamp": datetime.utcnow().isoformat(),
    "level": "ERROR",
    "service": "api-gateway",
    "method": "POST",
    "path": "/api/v1/orders",
    "status": 500,
    "duration_ms": 2340,
    "error": "Database connection timeout"
})
```

## Step 3: Batch Appends for Efficiency

Appending one log line at a time is inefficient for high-volume logging. Batch multiple entries into a single append operation:

```python
from azure.storage.blob import BlobServiceClient
from datetime import datetime
import json
import threading
import time

class BatchAppendLogger:
    """Batches log entries and appends them to blob storage periodically"""

    def __init__(self, blob_service, container_name, flush_interval=5, batch_size=100):
        self.blob_service = blob_service
        self.container_name = container_name
        self.flush_interval = flush_interval  # seconds
        self.batch_size = batch_size
        self.buffer = []
        self.lock = threading.Lock()

        # Start background flush thread
        self.flush_thread = threading.Thread(target=self._periodic_flush, daemon=True)
        self.flush_thread.start()

    def log(self, entry):
        """Add a log entry to the buffer"""
        with self.lock:
            self.buffer.append(entry)
            if len(self.buffer) >= self.batch_size:
                self._flush()

    def _periodic_flush(self):
        """Flush the buffer every flush_interval seconds"""
        while True:
            time.sleep(self.flush_interval)
            with self.lock:
                if self.buffer:
                    self._flush()

    def _flush(self):
        """Write buffered entries to blob storage"""
        if not self.buffer:
            return

        # Take all current entries and clear buffer
        entries = self.buffer[:]
        self.buffer = []

        # Format entries as newline-delimited JSON
        batch_data = "".join(json.dumps(e) + "\n" for e in entries)

        # Determine the blob name based on current date
        today = datetime.utcnow().strftime("%Y-%m-%d")
        blob_name = f"batched-logs/{today}.jsonl"

        blob_client = self.blob_service.get_blob_client(
            self.container_name, blob_name
        )

        # Create blob if needed, then append
        try:
            blob_client.append_block(batch_data.encode("utf-8"))
        except Exception:
            blob_client.create_append_blob()
            blob_client.append_block(batch_data.encode("utf-8"))

        print(f"Flushed {len(entries)} entries to {blob_name}")

# Usage
blob_service = BlobServiceClient.from_connection_string(connection_string)
logger = BatchAppendLogger(blob_service, "application-logs")

# Log entries are batched and flushed automatically
logger.log({"timestamp": datetime.utcnow().isoformat(), "message": "User login", "user_id": "123"})
logger.log({"timestamp": datetime.utcnow().isoformat(), "message": "Order placed", "order_id": "456"})
```

## Step 4: Handle Concurrent Writers

Multiple services can append to the same blob concurrently. Azure handles this with optimistic concurrency using the `appendpos` condition:

```python
from azure.storage.blob import BlobServiceClient
from azure.core.exceptions import HttpResponseError

def safe_append(blob_client, data, max_retries=5):
    """Append data with concurrency control"""
    for attempt in range(max_retries):
        try:
            # Get current blob length
            props = blob_client.get_blob_properties()
            current_length = props.content_length

            # Append with position check
            # This fails if another writer appended between our read and write
            blob_client.append_block(
                data.encode("utf-8"),
                appendpos_condition=current_length
            )
            return True

        except HttpResponseError as e:
            if "AppendPositionConditionNotMet" in str(e):
                # Another writer beat us, retry
                continue
            raise

    return False
```

However, for most logging scenarios, you do not need strict ordering. Multiple writers can append without position checks and the data will be correctly stored, just potentially interleaved. Each individual append is atomic, so log entries will never be corrupted.

## Step 5: Implement Log Rotation

Since append blobs have a 50,000-block limit, you need to rotate to new blobs before hitting the limit. Here are common rotation strategies:

**Time-based rotation**: Create a new blob each hour or day.

```python
def get_current_log_blob(container_client, prefix):
    """Get or create the log blob for the current hour"""
    now = datetime.utcnow()
    blob_name = f"{prefix}/{now.strftime('%Y/%m/%d/%H')}.jsonl"
    blob_client = container_client.get_blob_client(blob_name)

    try:
        blob_client.get_blob_properties()
    except Exception:
        blob_client.create_append_blob()

    return blob_client
```

**Size-based rotation**: Create a new blob when the current one approaches the block limit.

```python
def get_log_blob_with_rotation(container_client, prefix):
    """Get the current log blob, rotating if near the block limit"""
    today = datetime.utcnow().strftime("%Y-%m-%d")
    sequence = 0

    while True:
        blob_name = f"{prefix}/{today}-{sequence:04d}.jsonl"
        blob_client = container_client.get_blob_client(blob_name)

        try:
            props = blob_client.get_blob_properties()
            block_count = props.content_length  # rough estimate
            # If near 50K blocks, try next sequence
            if block_count > 45000 * 100:  # Assume ~100 bytes per entry
                sequence += 1
                continue
        except Exception:
            blob_client.create_append_blob()

        return blob_client
```

## Step 6: Read and Query Log Data

Append blobs can be read just like any other blob. For JSON Lines format, processing is straightforward:

```python
from azure.storage.blob import BlobServiceClient
import json

blob_service = BlobServiceClient.from_connection_string(connection_string)
blob_client = blob_service.get_blob_client("application-logs", "api-logs/2026-02-16.jsonl")

# Download and parse the log file
stream = blob_client.download_blob()
content = stream.readall().decode("utf-8")

# Process each log entry
for line in content.strip().split("\n"):
    if line:
        entry = json.loads(line)

        # Filter for errors
        if entry.get("level") == "ERROR":
            print(f"[{entry['timestamp']}] {entry.get('error', 'Unknown error')}")
```

For larger log files, use streaming to avoid loading everything into memory:

```python
# Stream large log files line by line
stream = blob_client.download_blob()
for chunk in stream.chunks():
    text = chunk.decode("utf-8")
    for line in text.split("\n"):
        if line.strip():
            entry = json.loads(line)
            # Process entry
```

## Step 7: Set Up Lifecycle Management

Configure lifecycle management to manage old logs:

```bash
# Create a lifecycle policy for log cleanup
az storage account management-policy create \
  --account-name stlogs2026 \
  --resource-group rg-logs \
  --policy '{
    "rules": [
      {
        "name": "archive-old-logs",
        "enabled": true,
        "type": "Lifecycle",
        "definition": {
          "filters": {
            "blobTypes": ["appendBlob"],
            "prefixMatch": ["application-logs/"]
          },
          "actions": {
            "baseBlob": {
              "delete": {
                "daysAfterModificationGreaterThan": 90
              }
            }
          }
        }
      }
    ]
  }'
```

Note that append blobs cannot be moved to Cool or Archive tiers. They can only be deleted. If you need tiering for long-term log retention, copy the append blob data to block blobs, which support all access tiers.

## Audit Trail Best Practices

For audit trails that need to be tamper-proof:

1. **Use immutability policies**: Apply a time-based retention policy on the log container to prevent deletion
2. **Use separate storage accounts**: Keep audit logs in a dedicated account with restricted access
3. **Include integrity checksums**: Add a hash of each log entry that includes the previous entry's hash (creating a chain)
4. **Enable diagnostic logging**: Track who accessed the audit trail itself

```bash
# Apply immutability policy to the audit trail container
az storage container immutability-policy create \
  --account-name stauditlogs2026 \
  --container-name audit-trail \
  --period 2555 \
  --allow-protected-append-writes true
```

The `--allow-protected-append-writes true` flag is essential for audit trails. It allows new data to be appended to existing append blobs while preventing modification or deletion of existing data.

## Wrapping Up

Append blobs are a simple but effective tool for log collection and audit trails. They support concurrent writers, guarantee atomic appends, and integrate naturally with Azure's storage ecosystem. Use batch appending for high-volume scenarios, implement time-based rotation to stay within the 50,000-block limit, and combine append blobs with immutability policies for tamper-proof audit trails. For long-term retention with cost optimization, plan a strategy to copy completed log files to block blobs where they can be tiered to cooler storage.
