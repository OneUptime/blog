# How to Run Azurite in Docker for Azure Storage Emulation

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Azurite, Azure, Cloud Emulation, Storage, Blob Storage, Docker Compose

Description: Deploy Azurite in Docker to emulate Azure Blob, Queue, and Table storage locally for development and testing

---

Azurite is the official Azure Storage emulator maintained by Microsoft. It provides local implementations of Azure Blob Storage, Queue Storage, and Table Storage. If your application uses Azure Storage, Azurite lets you develop and run tests without an Azure subscription or internet connection. Docker is the cleanest way to run Azurite, keeping it isolated from your development machine and making it easy to start, stop, and reset.

This guide covers deploying Azurite in Docker, connecting to it with Azure SDKs, testing common storage operations, and integrating it into your development workflow.

## Quick Start

Run Azurite with a single command:

```bash
# Start Azurite with all three storage services
docker run -d \
  --name azurite \
  -p 10000:10000 \
  -p 10001:10001 \
  -p 10002:10002 \
  -v azurite-data:/data \
  mcr.microsoft.com/azure-storage/azurite
```

The three ports map to:
- **10000**: Blob Storage
- **10001**: Queue Storage
- **10002**: Table Storage

## Docker Compose Setup

For a project-integrated setup:

```yaml
# docker-compose.yml - Azurite with persistent storage
version: "3.8"

services:
  azurite:
    image: mcr.microsoft.com/azure-storage/azurite
    container_name: azurite
    ports:
      - "10000:10000"  # Blob
      - "10001:10001"  # Queue
      - "10002:10002"  # Table
    volumes:
      - azurite-data:/data
    command: >
      azurite
      --blobHost 0.0.0.0
      --queueHost 0.0.0.0
      --tableHost 0.0.0.0
      --location /data
      --loose
      --skipApiVersionCheck
    restart: unless-stopped

volumes:
  azurite-data:
```

The `--loose` flag relaxes API version checking, which helps with compatibility across SDK versions. The `--skipApiVersionCheck` flag prevents Azurite from rejecting requests with newer API versions.

Start it:

```bash
# Launch Azurite
docker compose up -d
```

## Connection String

Azurite uses a well-known default connection string:

```
DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;
```

The account name is always `devstoreaccount1` and the account key is a fixed value. These are not real credentials and are safe to commit to source control.

## Working with Blob Storage (Python)

Here is a complete example of using Azure Blob Storage with Azurite:

```python
# blob_example.py - Azure Blob Storage operations against Azurite
from azure.storage.blob import BlobServiceClient, BlobClient, ContainerClient

# Connection string for Azurite
CONN_STR = (
    "DefaultEndpointsProtocol=http;"
    "AccountName=devstoreaccount1;"
    "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/"
    "K1SZFPTOtr/KBHBeksoGMGw==;"
    "BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
)

# Create the BlobServiceClient
blob_service = BlobServiceClient.from_connection_string(CONN_STR)

# Create a container
container_name = "my-documents"
container_client = blob_service.create_container(container_name)
print(f"Created container: {container_name}")

# Upload a file
blob_client = blob_service.get_blob_client(container_name, "report.txt")
with open("report.txt", "rb") as data:
    blob_client.upload_blob(data, overwrite=True)
print("Uploaded report.txt")

# List blobs in the container
container = blob_service.get_container_client(container_name)
for blob in container.list_blobs():
    print(f"  Blob: {blob.name}, Size: {blob.size} bytes")

# Download a blob
download_stream = blob_client.download_blob()
content = download_stream.readall()
print(f"Downloaded {len(content)} bytes")

# Delete the blob
blob_client.delete_blob()
print("Deleted report.txt")
```

## Working with Queue Storage

```python
# queue_example.py - Azure Queue Storage operations against Azurite
from azure.storage.queue import QueueServiceClient
import json

CONN_STR = (
    "DefaultEndpointsProtocol=http;"
    "AccountName=devstoreaccount1;"
    "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/"
    "K1SZFPTOtr/KBHBeksoGMGw==;"
    "QueueEndpoint=http://127.0.0.1:10001/devstoreaccount1;"
)

queue_service = QueueServiceClient.from_connection_string(CONN_STR)

# Create a queue
queue_name = "task-queue"
queue_client = queue_service.create_queue(queue_name)

# Send messages to the queue
for i in range(5):
    message = json.dumps({"task_id": i, "action": "process_image"})
    queue_client.send_message(message)
    print(f"Sent message {i}")

# Receive and process messages
messages = queue_client.receive_messages(max_messages=5, visibility_timeout=30)
for msg in messages:
    data = json.loads(msg.content)
    print(f"Processing task {data['task_id']}: {data['action']}")
    # Delete the message after processing
    queue_client.delete_message(msg)
```

## Working with Table Storage

```python
# table_example.py - Azure Table Storage operations against Azurite
from azure.data.tables import TableServiceClient, TableClient

CONN_STR = (
    "DefaultEndpointsProtocol=http;"
    "AccountName=devstoreaccount1;"
    "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/"
    "K1SZFPTOtr/KBHBeksoGMGw==;"
    "TableEndpoint=http://127.0.0.1:10002/devstoreaccount1;"
)

table_service = TableServiceClient.from_connection_string(CONN_STR)

# Create a table
table_name = "users"
table_client = table_service.create_table_if_not_exists(table_name)

# Insert entities
users = [
    {"PartitionKey": "US", "RowKey": "user-1", "Name": "Alice", "Email": "alice@example.com"},
    {"PartitionKey": "US", "RowKey": "user-2", "Name": "Bob", "Email": "bob@example.com"},
    {"PartitionKey": "EU", "RowKey": "user-3", "Name": "Charlie", "Email": "charlie@example.com"},
]

for user in users:
    table_client.upsert_entity(user)
    print(f"Inserted {user['Name']}")

# Query entities by partition
us_users = table_client.query_entities("PartitionKey eq 'US'")
for user in us_users:
    print(f"  {user['Name']} ({user['Email']})")
```

## .NET Integration

```csharp
// Program.cs - Azure Storage operations with Azurite in .NET
using Azure.Storage.Blobs;
using Azure.Storage.Queues;

// Azurite connection string
const string connStr = "UseDevelopmentStorage=true";

// Blob operations
var blobServiceClient = new BlobServiceClient(connStr);
var containerClient = blobServiceClient.GetBlobContainerClient("my-container");
await containerClient.CreateIfNotExistsAsync();

var blobClient = containerClient.GetBlobClient("hello.txt");
await blobClient.UploadAsync(BinaryData.FromString("Hello from Azurite!"), overwrite: true);

Console.WriteLine("Uploaded blob to Azurite");

// Queue operations
var queueClient = new QueueClient(connStr, "my-queue");
await queueClient.CreateIfNotExistsAsync();
await queueClient.SendMessageAsync("Test message");

Console.WriteLine("Sent queue message to Azurite");
```

Note that `UseDevelopmentStorage=true` is a shorthand connection string that the Azure SDKs automatically resolve to the Azurite default endpoints.

## Using Azure Storage Explorer

Microsoft's Azure Storage Explorer GUI tool works with Azurite. Connect to it:

1. Open Azure Storage Explorer
2. Click "Add an account"
3. Select "Attach to a local emulator"
4. Enter the Azurite endpoints (ports 10000, 10001, 10002)
5. Browse your containers, queues, and tables visually

## Environment-Based Configuration

Structure your application to switch between Azurite and real Azure Storage:

```python
# config.py - switch between Azurite and real Azure Storage
import os

def get_storage_connection_string():
    """Return the appropriate connection string based on environment."""
    env = os.environ.get("ENVIRONMENT", "development")

    if env == "development":
        return (
            "DefaultEndpointsProtocol=http;"
            "AccountName=devstoreaccount1;"
            "AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/"
            "K1SZFPTOtr/KBHBeksoGMGw==;"
            "BlobEndpoint=http://azurite:10000/devstoreaccount1;"
            "QueueEndpoint=http://azurite:10001/devstoreaccount1;"
            "TableEndpoint=http://azurite:10002/devstoreaccount1;"
        )
    else:
        # In production, use the real Azure connection string from env
        return os.environ["AZURE_STORAGE_CONNECTION_STRING"]
```

## CI/CD Integration

Use Azurite in GitHub Actions:

```yaml
# .github/workflows/test.yml
name: Integration Tests
on: [push]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      azurite:
        image: mcr.microsoft.com/azure-storage/azurite
        ports:
          - 10000:10000
          - 10001:10001
          - 10002:10002
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        env:
          AZURE_STORAGE_CONNECTION_STRING: "UseDevelopmentStorage=true"
        run: |
          pip install -r requirements.txt
          pytest tests/integration/
```

## HTTPS Support

Enable HTTPS for Azurite when testing TLS-related code:

```bash
# Generate a self-signed certificate
openssl req -x509 -newkey rsa:2048 \
  -keyout azurite-key.pem -out azurite-cert.pem \
  -days 365 -nodes -subj "/CN=localhost"

# Run Azurite with HTTPS enabled
docker run -d \
  --name azurite-tls \
  -p 10000:10000 -p 10001:10001 -p 10002:10002 \
  -v $(pwd)/azurite-cert.pem:/certs/cert.pem \
  -v $(pwd)/azurite-key.pem:/certs/key.pem \
  mcr.microsoft.com/azure-storage/azurite \
  azurite --blobHost 0.0.0.0 --queueHost 0.0.0.0 --tableHost 0.0.0.0 \
  --cert /certs/cert.pem --key /certs/key.pem
```

## Conclusion

Azurite in Docker provides a faithful local replica of Azure Storage services. The well-known connection string and SDK compatibility mean your code works identically against Azurite and real Azure Storage. Use it during development to avoid Azure costs and network latency, and in CI/CD to run integration tests without cloud credentials. The persistent storage option lets you maintain state across container restarts during development, while a fresh container gives you a clean slate for each test run.
