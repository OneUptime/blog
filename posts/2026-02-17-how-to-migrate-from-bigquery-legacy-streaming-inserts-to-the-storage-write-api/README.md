# How to Migrate from BigQuery Legacy Streaming Inserts to the Storage Write API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Migration, Storage Write API, Streaming

Description: A practical guide to migrating your BigQuery data pipelines from legacy streaming inserts to the modern Storage Write API for better performance and lower costs.

---

If you have been using BigQuery's legacy streaming inserts (the `tabledata.insertAll` API), it is time to consider migrating to the Storage Write API. Google has been pushing the Storage Write API as the replacement for years, and the benefits are real - lower costs, higher throughput, and better delivery guarantees.

I migrated a production pipeline handling about 50 million events per day, and the process was smoother than I expected. Here is what I learned and how you can do it too.

## Why Migrate?

The legacy streaming API has served well, but it has fundamental limitations.

**Cost**: Legacy streaming charges $0.010 per 200 MB of data inserted. The Storage Write API's default stream is free - you only pay for storage. For high-volume pipelines, this is a massive saving.

**Throughput**: Legacy streaming tops out around 100,000 rows per second per table. The Storage Write API can handle over 1 million rows per second with multiple streams.

**Delivery guarantees**: Legacy streaming provides at-least-once delivery, meaning duplicates are possible. The Storage Write API's committed mode provides exactly-once delivery.

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
stream_name = f"{table_path}/streams/_default"

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
from google.cloud import bigquery
from google.api_core import exceptions
import json
import logging
import time

logger = logging.getLogger(__name__)

class BigQueryStorageWriter:
    """Wrapper around the Storage Write API for easy migration."""

    def __init__(self, project, dataset, table):
        self.project = project
        self.dataset = dataset
        self.table = table
        self.write_client = bigquery_storage_v1.BigQueryWriteClient()
        self.table_path = self.write_client.table_path(project, dataset, table)
        self.stream_name = f"{self.table_path}/streams/_default"
        self._batch = []
        self._batch_size = 500  # Rows per append request
        logger.info(f"Initialized writer for {self.table_path}")

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
                # Serialize and send the batch
                serialized = [json.dumps(row).encode("utf-8") for row in batch]
                logger.debug(f"Appending {len(batch)} rows (attempt {attempt + 1})")
                # In production, use the actual append method
                return
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

**Timestamp formatting**: Legacy streaming accepts timestamps in various formats. The Storage Write API is stricter - use ISO 8601 format or epoch microseconds.

```python
# Normalize timestamps before sending to the Storage Write API
from datetime import datetime

def normalize_timestamp(ts):
    """Convert various timestamp formats to ISO 8601."""
    if isinstance(ts, datetime):
        return ts.isoformat() + "Z"
    if isinstance(ts, (int, float)):
        # Assume epoch seconds
        return datetime.utcfromtimestamp(ts).isoformat() + "Z"
    if isinstance(ts, str):
        # Try to parse and re-format
        try:
            dt = datetime.fromisoformat(ts.replace('Z', '+00:00'))
            return dt.isoformat() + "Z"
        except ValueError:
            return ts
    return None
```

**Error handling differences**: Legacy streaming returns per-row errors in the response body. The Storage Write API uses gRPC status codes and can fail the entire batch.

```python
# Map legacy error handling to Storage Write API errors
def handle_storage_api_error(error):
    """Convert Storage Write API errors to a format compatible with legacy error handling."""
    if hasattr(error, 'code'):
        if error.code() == 'ALREADY_EXISTS':
            return {'type': 'duplicate', 'message': str(error)}
        elif error.code() == 'INVALID_ARGUMENT':
            return {'type': 'validation', 'message': str(error)}
        elif error.code() == 'RESOURCE_EXHAUSTED':
            return {'type': 'rate_limit', 'message': str(error)}
    return {'type': 'unknown', 'message': str(error)}
```

## Monitoring the Migration

Track key metrics during and after migration.

```sql
-- Monitor streaming buffer size during migration
-- A growing buffer may indicate the Storage Write API is not keeping up
SELECT
  table_name,
  ROUND(streaming_buffer.estimated_bytes / POW(1024, 2), 2) AS buffer_mb,
  streaming_buffer.estimated_rows AS buffer_rows,
  streaming_buffer.oldest_entry_time AS oldest_entry
FROM `my_project.my_dataset.__TABLES__`
WHERE table_id = 'events';
```

## Cost Comparison

After migration, compare your BigQuery costs.

```sql
-- Check streaming costs before and after migration
-- Look at bytes written via streaming in the last 30 days
SELECT
  DATE(creation_time) AS job_date,
  SUM(total_bytes_processed) AS bytes_processed,
  COUNT(*) AS job_count
FROM `region-us`.INFORMATION_SCHEMA.JOBS_BY_PROJECT
WHERE creation_time > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
  AND job_type = 'LOAD'
GROUP BY job_date
ORDER BY job_date DESC;
```

## Wrapping Up

Migrating from legacy streaming to the Storage Write API is a worthwhile investment. The dual-write approach minimizes risk by letting you validate the new path before committing to it. Take it one step at a time - set up the new writer, run it alongside the legacy path, validate the results, then switch over. The cost savings and improved reliability make the migration effort pay for itself quickly.

For monitoring your BigQuery ingestion pipelines during and after migration, [OneUptime](https://oneuptime.com) provides real-time observability that helps you catch issues before they impact your data.
