# How to Migrate from BigQuery Legacy Streaming Inserts to the Storage Write API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Migration, Storage Write API, Streaming

Description: A practical guide to migrating your BigQuery data pipelines from legacy streaming inserts to the modern Storage Write API for better performance and lower costs.

---

If you have been using BigQuery's legacy streaming inserts (the `tabledata.insertAll` API), it is time to consider migrating to the Storage Write API. Google has been pushing the Storage Write API as the replacement for years, and the benefits are real - lower costs, higher throughput, and better delivery guarantees.

I migrated a production pipeline handling about 50 million events per day, and the process was smoother than I expected. Here is what I learned and how you can do it too.

## Why Migrate?

The legacy streaming API has served well, but it has fundamental limitations.

**Cost**: Legacy streaming charges $0.010 per 200 MiB of data inserted. The Storage Write API is priced lower at $0.025 per GiB, with the first 2 TiB per month free. For high-volume pipelines, this is a massive saving.

**Throughput**: Legacy streaming is limited by project-level streaming insert throughput quotas. The Storage Write API has higher throughput quotas, supports long-lived gRPC connections, and can scale with multiple streams or default-stream connections.

**Delivery guarantees**: Legacy streaming provides best-effort deduplication with `insertId`, but duplicates are still possible. The Storage Write API's default stream is at-least-once, while application-created committed streams can provide exactly-once delivery when you manage stream offsets.

**Error handling**: Legacy streaming returns per-row errors in the response. The Storage Write API uses gRPC streams with better flow control and error propagation.

## Understanding the Differences

Before migrating, understand the key differences in how the two APIs work.

Legacy streaming inserts use REST/JSON. You send a batch of rows as a JSON POST request.

```python
# Legacy streaming insert - what you are migrating FROM

from google.cloud import bigquery

client = bigquery.Client()
table_ref = client.dataset('my_dataset').table('events')

# Rows as list of dictionaries
rows = [
    {"event_id": "evt-001", "user_id": 12345, "event_type": "click"},
    {"event_id": "evt-002", "user_id": 12346, "event_type": "view"},
]

# Legacy insert_rows_json method
errors = client.insert_rows_json(table_ref, rows)
if errors:
    print(f"Errors: {errors}")
```

The Storage Write API uses gRPC and Protocol Buffers. You create a write stream and append serialized rows.

```python
# Storage Write API - what you are migrating TO
from google.cloud.bigquery_storage_v1 import BigQueryWriteClient
from google.cloud.bigquery_storage_v1 import types

client = BigQueryWriteClient()
table_path = f"projects/my_project/datasets/my_dataset/tables/events"

# Use the default stream for the simplest migration
stream_name = f"{table_path}/_default"

# Rows are serialized as protocol buffers (handled by the writer)
```

## Migration Strategy

I recommend a phased approach:

1. **Dual-write**: Send data to both the legacy API and the Storage Write API simultaneously
2. **Validate**: Compare row counts and data quality between the two paths
3. **Switch**: Route all traffic to the Storage Write API
4. **Clean up**: Remove legacy streaming code

## Phase 1: Set Up the Storage Write API Writer

Start by creating a writer class that wraps the Storage Write API.

```python
# storage_writer.py - Wrapper for the Storage Write API
from google.cloud import bigquery_storage_v1
from google.api_core import exceptions
from google.cloud.bigquery_storage_v1 import types
from google.cloud.bigquery_storage_v1 import writer
from google.protobuf import descriptor_pb2
import logging
import time

import event_pb2  # Generated from a proto that matches the BigQuery table schema.

logger = logging.getLogger(__name__)

def build_event(row):
    """Convert one dict into the generated proto message for the events table."""
    event = event_pb2.Event()
    event.event_id = row["event_id"]
    event.user_id = row["user_id"]
    event.event_type = row["event_type"]
    return event

class BigQueryStorageWriter:
    """Wrapper around the Storage Write API for easy migration."""

    def __init__(self, project, dataset, table):
        self.project = project
        self.dataset = dataset
        self.table = table
        self.write_client = bigquery_storage_v1.BigQueryWriteClient()
        self.table_path = self.write_client.table_path(project, dataset, table)
        self.stream_name = f"{self.table_path}/_default"
        self._batch_size = 500  # Rows per append request
        self._append_stream = self._create_append_stream()
        logger.info(f"Initialized writer for {self.table_path}")

    def _create_append_stream(self):
        """Create a reusable AppendRowsStream for the default stream."""
        proto_descriptor = descriptor_pb2.DescriptorProto()
        event_pb2.Event.DESCRIPTOR.CopyToProto(proto_descriptor)

        proto_schema = types.ProtoSchema()
        proto_schema.proto_descriptor = proto_descriptor

        proto_data = types.AppendRowsRequest.ProtoData()
        proto_data.writer_schema = proto_schema

        request_template = types.AppendRowsRequest()
        request_template.write_stream = self.stream_name
        request_template.proto_rows = proto_data

        return writer.AppendRowsStream(self.write_client, request_template)

    def insert_rows(self, rows):
        """
        Insert rows using the Storage Write API.
        Matches the interface of the legacy client.insert_rows_json() method.
        """
        errors = []

        # Process rows in batches
        for i in range(0, len(rows), self._batch_size):
            batch = rows[i:i + self._batch_size]
            try:
                self._append_batch(batch)
            except Exception as e:
                logger.error(f"Failed to append batch {i // self._batch_size}: {e}")
                errors.append({
                    "batch_index": i // self._batch_size,
                    "error": str(e),
                    "row_count": len(batch)
                })

        return errors

    def _append_batch(self, batch, retry_count=3):
        """Append a batch of rows with retry logic."""
        for attempt in range(retry_count):
            try:
                proto_rows = types.ProtoRows()
                for row in batch:
                    proto_rows.serialized_rows.append(build_event(row).SerializeToString())

                proto_data = types.AppendRowsRequest.ProtoData()
                proto_data.rows = proto_rows

                request = types.AppendRowsRequest()
                request.proto_rows = proto_data

                logger.debug(f"Appending {len(batch)} rows (attempt {attempt + 1})")
                response_future = self._append_stream.send(request)
                response_future.result()
                return []
            except exceptions.ResourceExhausted:
                # Back off on resource exhaustion
                wait_time = (2 ** attempt) + 1
                logger.warning(f"Rate limited, waiting {wait_time}s")
                time.sleep(wait_time)
            except Exception as e:
                if attempt == retry_count - 1:
                    raise
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                time.sleep(1)
```

## Phase 2: Implement Dual-Write

Run both the legacy and new writers in parallel to validate correctness.

```python
# dual_writer.py - Dual-write for validation
from legacy_writer import LegacyStreamingWriter
from storage_writer import BigQueryStorageWriter
import logging

logger = logging.getLogger(__name__)

class DualWriter:
    """Writes to both legacy streaming and Storage Write API for validation."""

    def __init__(self, project, dataset, table):
        self.legacy = LegacyStreamingWriter(project, dataset, table)
        self.storage_api = BigQueryStorageWriter(project, dataset, table)
        self.use_storage_api = False  # Toggle for cutover

    def insert_rows(self, rows):
        """Write to both APIs and compare results."""
        # Always write to the primary path
        if self.use_storage_api:
            primary_errors = self.storage_api.insert_rows(rows)
            primary_name = "storage_api"
        else:
            primary_errors = self.legacy.insert_rows(rows)
            primary_name = "legacy"

        # Shadow write to the secondary path (best-effort)
        try:
            if self.use_storage_api:
                secondary_errors = self.legacy.insert_rows(rows)
            else:
                secondary_errors = self.storage_api.insert_rows(rows)
        except Exception as e:
            logger.warning(f"Shadow write failed: {e}")
            secondary_errors = [str(e)]

        # Log comparison
        if primary_errors:
            logger.error(f"Primary ({primary_name}) had errors: {primary_errors}")
        if secondary_errors:
            logger.warning(f"Secondary had errors: {secondary_errors}")

        return primary_errors

    def switch_to_storage_api(self):
        """Switch primary writes to the Storage Write API."""
        self.use_storage_api = True
        logger.info("Switched primary writes to Storage Write API")

    def switch_to_legacy(self):
        """Switch back to legacy streaming if needed."""
        self.use_storage_api = False
        logger.info("Switched primary writes back to legacy streaming")
```

## Phase 3: Validate Data

Compare data between the two write paths.

```sql
-- Compare row counts between legacy and Storage Write API tables
-- During dual-write, you might write to separate tables first
SELECT
  'legacy' AS source,
  COUNT(*) AS row_count,
  MIN(event_timestamp) AS min_ts,
  MAX(event_timestamp) AS max_ts
FROM `my_project.my_dataset.events_legacy`
WHERE DATE(event_timestamp) = CURRENT_DATE()

UNION ALL

SELECT
  'storage_api' AS source,
  COUNT(*) AS row_count,
  MIN(event_timestamp) AS min_ts,
  MAX(event_timestamp) AS max_ts
FROM `my_project.my_dataset.events_storage_api`
WHERE DATE(event_timestamp) = CURRENT_DATE();
```

```sql
-- Check for data consistency between the two paths
-- Look for events in one table but not the other
SELECT
  'missing_from_storage_api' AS issue,
  COUNT(*) AS count
FROM `my_project.my_dataset.events_legacy` l
LEFT JOIN `my_project.my_dataset.events_storage_api` s
  ON l.event_id = s.event_id
WHERE s.event_id IS NULL
  AND DATE(l.event_timestamp) = CURRENT_DATE()

UNION ALL

SELECT
  'missing_from_legacy' AS issue,
  COUNT(*) AS count
FROM `my_project.my_dataset.events_storage_api` s
LEFT JOIN `my_project.my_dataset.events_legacy` l
  ON s.event_id = l.event_id
WHERE l.event_id IS NULL
  AND DATE(s.event_timestamp) = CURRENT_DATE();
```

## Phase 4: Switch Over

Once you have validated that the Storage Write API produces consistent results, switch over.

```python
# cutover.py - Switch from legacy to Storage Write API
import logging

logger = logging.getLogger(__name__)

def perform_cutover(dual_writer):
    """
    Switch primary writes from legacy to Storage Write API.
    Keep legacy as a shadow write for 24-48 hours before removing.
    """
    logger.info("Starting cutover to Storage Write API")

    # Switch the primary write path
    dual_writer.switch_to_storage_api()
    logger.info("Primary writes now using Storage Write API")

    # Monitor for 24 hours, then remove shadow writes
    # In practice, use a feature flag or configuration setting
    logger.info("Monitor for errors before removing legacy shadow writes")
```

## Handling Common Migration Issues

**Schema differences**: The Storage Write API requires a protocol buffer schema that matches your BigQuery table. If your legacy code relies on schema auto-detection for new fields, you need to handle schema updates explicitly.

**Timestamp formatting**: Legacy streaming accepts timestamps in several string formats. The Storage Write API is stricter - for protocol buffer writes, BigQuery `TIMESTAMP` columns are commonly represented as `int64` epoch microseconds or `google.protobuf.Timestamp`.

```python
# Normalize timestamps before sending to the Storage Write API
from datetime import datetime, timezone

def normalize_timestamp_micros(ts):
    """Convert various timestamp formats to epoch microseconds."""
    if isinstance(ts, datetime):
        dt = ts if ts.tzinfo else ts.replace(tzinfo=timezone.utc)
        return int(dt.timestamp() * 1_000_000)
    if isinstance(ts, (int, float)):
        # Assume epoch seconds
        return int(ts * 1_000_000)
    if isinstance(ts, str):
        # Try to parse and re-format
        try:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            return int(dt.timestamp() * 1_000_000)
        except ValueError:
            return ts
    return None
```

**Error handling differences**: Legacy streaming returns per-row errors in the response body. The Storage Write API uses gRPC status codes and can fail the entire batch.

```python
# Map legacy error handling to Storage Write API errors
import grpc

def handle_storage_api_error(error):
    """Convert Storage Write API errors to a format compatible with legacy error handling."""
    if hasattr(error, 'code'):
        if error.code() == grpc.StatusCode.ALREADY_EXISTS:
            return {'type': 'duplicate', 'message': str(error)}
        elif error.code() == grpc.StatusCode.INVALID_ARGUMENT:
            return {'type': 'validation', 'message': str(error)}
        elif error.code() == grpc.StatusCode.RESOURCE_EXHAUSTED:
            return {'type': 'rate_limit', 'message': str(error)}
    return {'type': 'unknown', 'message': str(error)}
```

## Monitoring the Migration

Track key metrics during and after migration.

```sql
-- Monitor Storage Write API ingestion during migration
SELECT
  start_timestamp,
  stream_type,
  error_code,
  SUM(total_requests) AS requests,
  SUM(total_rows) AS rows,
  ROUND(SUM(total_input_bytes) / POW(1024, 2), 2) AS input_mb
FROM `region-us`.INFORMATION_SCHEMA.WRITE_API_TIMELINE
WHERE table_id = 'events'
  AND start_timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
GROUP BY start_timestamp, stream_type, error_code
ORDER BY start_timestamp DESC;
```

## Cost Comparison

After migration, compare your BigQuery costs. Use your Cloud Billing export for the actual billed charges, and use ingestion metrics to sanity-check the volume you expect to see on the bill.

```sql
-- Estimate Storage Write API bytes written in the last 30 days
SELECT
  DATE(start_timestamp) AS ingestion_date,
  ROUND(SUM(total_input_bytes) / POW(1024, 3), 2) AS input_gib,
  SUM(total_rows) AS rows_written
FROM `region-us`.INFORMATION_SCHEMA.WRITE_API_TIMELINE
WHERE start_timestamp > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND table_id = 'events'
GROUP BY ingestion_date
ORDER BY ingestion_date DESC;
```

## Wrapping Up

Migrating from legacy streaming to the Storage Write API is a worthwhile investment. The dual-write approach minimizes risk by letting you validate the new path before committing to it. Take it one step at a time - set up the new writer, run it alongside the legacy path, validate the results, then switch over. The cost savings and improved reliability make the migration effort pay for itself quickly.

For monitoring your BigQuery ingestion pipelines during and after migration, [OneUptime](https://oneuptime.com) provides real-time observability that helps you catch issues before they impact your data.
