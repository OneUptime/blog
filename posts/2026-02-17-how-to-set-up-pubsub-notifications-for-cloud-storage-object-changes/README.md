# How to Set Up Pub/Sub Notifications for Cloud Storage Object Changes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Pub/Sub, Cloud Storage, Event-Driven, Notifications

Description: Learn how to configure Google Cloud Storage to send Pub/Sub notifications when objects are created, updated, or deleted, enabling event-driven processing of file uploads.

---

A lot of data pipelines start with a file landing in a Cloud Storage bucket. Someone uploads a CSV, a system exports a daily report, or an IoT device pushes sensor data. The question is: how does the rest of your pipeline know a new file has arrived?

Polling the bucket on a schedule is one option, but it is wasteful and introduces latency. A better approach is to use Pub/Sub notifications on the bucket. Every time an object is created, updated, deleted, or archived, Cloud Storage publishes a notification to a Pub/Sub topic. From there, you can trigger any downstream processing in real time.

## How It Works

Cloud Storage supports sending notifications to Pub/Sub for various object lifecycle events. When you configure a notification, Cloud Storage publishes a message to the specified topic whenever a matching event occurs. The message includes details about the affected object: its name, bucket, size, content type, and metadata.

The event types you can listen for are:

- `OBJECT_FINALIZE` - A new object is created or an existing one is overwritten
- `OBJECT_DELETE` - An object is permanently deleted
- `OBJECT_ARCHIVE` - A live object version becomes noncurrent (with versioning enabled)
- `OBJECT_METADATA_UPDATE` - An object's metadata is updated

## Setting Up the Notification

### Step 1: Create the Pub/Sub Topic

```bash
# Create a topic for storage notifications
gcloud pubsub topics create gcs-file-notifications
```

### Step 2: Grant Cloud Storage Permission to Publish

Cloud Storage uses a service account to publish notifications. You need to grant it the Publisher role on the topic:

```bash
# Get the Cloud Storage service account for your project
GCS_SA=$(gsutil kms serviceaccount -p my-project)

# Grant publish access to the topic
gcloud pubsub topics add-iam-policy-binding gcs-file-notifications \
  --member="serviceAccount:${GCS_SA}" \
  --role="roles/pubsub.publisher"
```

### Step 3: Create the Notification

```bash
# Notify on all object creation events in the bucket
gsutil notification create -t gcs-file-notifications \
  -f json \
  -e OBJECT_FINALIZE \
  gs://my-data-bucket
```

The `-f json` flag specifies that the notification payload should be in JSON format. The `-e` flag filters to specific event types. You can specify multiple event types by repeating the flag:

```bash
# Notify on creates and deletes
gsutil notification create -t gcs-file-notifications \
  -f json \
  -e OBJECT_FINALIZE \
  -e OBJECT_DELETE \
  gs://my-data-bucket
```

### Step 4: Create a Subscription

```bash
# Create a subscription to receive the notifications
gcloud pubsub subscriptions create gcs-processor-sub \
  --topic=gcs-file-notifications \
  --ack-deadline=60
```

## Terraform Configuration

Here is the complete setup in Terraform:

```hcl
# Pub/Sub topic for storage notifications
resource "google_pubsub_topic" "gcs_notifications" {
  name = "gcs-file-notifications"
}

# Storage notification configuration
resource "google_storage_notification" "file_upload" {
  bucket         = google_storage_bucket.data_bucket.name
  payload_format = "JSON_API_V1"
  topic          = google_pubsub_topic.gcs_notifications.id
  event_types    = ["OBJECT_FINALIZE"]

  # Optional: only notify for objects with a specific prefix
  custom_attributes = {
    source = "data-pipeline"
  }

  depends_on = [google_pubsub_topic_iam_member.gcs_publisher]
}

# Grant Cloud Storage permission to publish to the topic
data "google_storage_project_service_account" "gcs_account" {}

resource "google_pubsub_topic_iam_member" "gcs_publisher" {
  topic  = google_pubsub_topic.gcs_notifications.name
  role   = "roles/pubsub.publisher"
  member = "serviceAccount:${data.google_storage_project_service_account.gcs_account.email_address}"
}

# Storage bucket
resource "google_storage_bucket" "data_bucket" {
  name     = "my-data-bucket-${var.project_id}"
  location = "US"

  uniform_bucket_level_access = true
}

# Subscription for processing notifications
resource "google_pubsub_subscription" "gcs_processor" {
  name  = "gcs-processor-sub"
  topic = google_pubsub_topic.gcs_notifications.id

  ack_deadline_seconds = 60

  expiration_policy {
    ttl = ""
  }
}
```

## Understanding the Notification Message

When an object event occurs, the Pub/Sub message contains structured data about the object. Here is what a typical notification looks like:

```json
{
  "kind": "storage#object",
  "id": "my-data-bucket/uploads/report-2026-02-17.csv/1708200000000000",
  "selfLink": "https://www.googleapis.com/storage/v1/b/my-data-bucket/o/uploads%2Freport-2026-02-17.csv",
  "name": "uploads/report-2026-02-17.csv",
  "bucket": "my-data-bucket",
  "generation": "1708200000000000",
  "metageneration": "1",
  "contentType": "text/csv",
  "timeCreated": "2026-02-17T10:00:00.000Z",
  "updated": "2026-02-17T10:00:00.000Z",
  "size": "1048576",
  "md5Hash": "abc123def456...",
  "crc32c": "xyz789..."
}
```

The message also includes attributes:

- `bucketId` - The bucket name
- `objectId` - The object name (path)
- `objectGeneration` - The object generation number
- `eventType` - The type of event (OBJECT_FINALIZE, etc.)
- `payloadFormat` - The format of the data payload
- `notificationConfig` - The notification configuration ID

## Processing Notifications

Here is a Python subscriber that processes file upload notifications:

```python
# Process Cloud Storage notifications from Pub/Sub
from google.cloud import pubsub_v1, storage
import json

subscriber = pubsub_v1.SubscriberClient()
storage_client = storage.Client()
subscription_path = subscriber.subscription_path("my-project", "gcs-processor-sub")

def handle_notification(message):
    """Process a Cloud Storage notification."""
    # Extract event details from attributes
    event_type = message.attributes.get('eventType')
    bucket_name = message.attributes.get('bucketId')
    object_name = message.attributes.get('objectId')

    print(f"Event: {event_type}, Bucket: {bucket_name}, Object: {object_name}")

    if event_type != 'OBJECT_FINALIZE':
        # We only care about new files
        message.ack()
        return

    # Parse the notification payload for additional details
    data = json.loads(message.data.decode('utf-8'))
    file_size = int(data.get('size', 0))
    content_type = data.get('contentType', 'unknown')

    print(f"New file: {object_name} ({file_size} bytes, {content_type})")

    # Process based on file type
    if object_name.endswith('.csv'):
        process_csv(bucket_name, object_name)
    elif object_name.endswith('.json'):
        process_json(bucket_name, object_name)
    else:
        print(f"Skipping unsupported file type: {object_name}")

    message.ack()

def process_csv(bucket_name, object_name):
    """Download and process a CSV file."""
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    content = blob.download_as_text()
    # Process the CSV content
    lines = content.strip().split('\n')
    print(f"Processing CSV with {len(lines)} lines")

def process_json(bucket_name, object_name):
    """Download and process a JSON file."""
    bucket = storage_client.bucket(bucket_name)
    blob = bucket.blob(object_name)
    data = json.loads(blob.download_as_text())
    print(f"Processing JSON with {len(data)} records")

streaming_pull = subscriber.subscribe(
    subscription_path, callback=handle_notification
)

print("Listening for storage notifications...")
streaming_pull.result()
```

## Triggering Cloud Functions from Storage Events

A common pattern is using a push subscription to trigger a Cloud Function:

```python
# Cloud Function triggered by Cloud Storage notifications via Pub/Sub
import base64
import json
from google.cloud import storage

def process_file_upload(event, context):
    """Cloud Function triggered by Pub/Sub from GCS notification."""
    # Decode the Pub/Sub message
    pubsub_message = json.loads(base64.b64decode(event['data']).decode('utf-8'))

    bucket_name = pubsub_message['bucket']
    file_name = pubsub_message['name']
    file_size = int(pubsub_message.get('size', 0))

    print(f"Processing: gs://{bucket_name}/{file_name} ({file_size} bytes)")

    # Download and process the file
    client = storage.Client()
    bucket = client.bucket(bucket_name)
    blob = bucket.blob(file_name)

    # Only process files under 100MB in a Cloud Function
    if file_size > 100 * 1024 * 1024:
        print(f"File too large for Cloud Function, skipping: {file_size} bytes")
        return

    content = blob.download_as_text()
    # Process content...

    print(f"Successfully processed {file_name}")
```

## Filtering by Object Prefix

If your bucket contains files from multiple sources, you can use Pub/Sub subscription filters to route notifications:

```hcl
# Only process files in the "uploads/" prefix
resource "google_pubsub_subscription" "uploads_processor" {
  name   = "uploads-processor-sub"
  topic  = google_pubsub_topic.gcs_notifications.id
  filter = "hasPrefix(attributes.objectId, \"uploads/\")"
}

# Only process files in the "exports/" prefix
resource "google_pubsub_subscription" "exports_processor" {
  name   = "exports-processor-sub"
  topic  = google_pubsub_topic.gcs_notifications.id
  filter = "hasPrefix(attributes.objectId, \"exports/\")"
}
```

Alternatively, you can set up prefix filtering at the notification level:

```bash
# Only notify for objects with the "uploads/" prefix
gsutil notification create -t gcs-file-notifications \
  -f json \
  -e OBJECT_FINALIZE \
  -p uploads/ \
  gs://my-data-bucket
```

## Managing Notifications

List existing notifications on a bucket:

```bash
# List all notifications configured on a bucket
gsutil notification list gs://my-data-bucket
```

Remove a notification:

```bash
# Delete a specific notification configuration
gsutil notification delete projects/_/buckets/my-data-bucket/notificationConfigs/1
```

## Handling Duplicate Notifications

Cloud Storage may send duplicate notifications for the same event. This can happen during retries or system recovery. To handle this, use the object generation number as a deduplication key:

```python
# Deduplicate notifications using object generation
import redis

redis_client = redis.Redis(host='redis-host', port=6379)

def handle_with_dedup(message):
    """Handle notification with deduplication."""
    object_id = message.attributes.get('objectId')
    generation = message.attributes.get('objectGeneration')
    dedup_key = f"gcs-notif:{object_id}:{generation}"

    if not redis_client.set(dedup_key, "1", nx=True, ex=3600):
        # Already processed this exact object version
        message.ack()
        return

    # Process the notification
    process_file(message)
    message.ack()
```

## Wrapping Up

Pub/Sub notifications for Cloud Storage are the right way to build event-driven file processing pipelines on GCP. They replace polling with real-time delivery, support filtering by event type and object prefix, and integrate naturally with Cloud Functions, Cloud Run, and custom subscribers. Set up the notification, grant the IAM permissions, and create a subscription. From there, every file upload automatically triggers your processing pipeline without any delay.
