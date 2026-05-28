# How to Implement Exactly-Once Delivery with the BigQuery Storage Write API

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Exactly-Once Delivery, Storage Write API, Data Integrity

Description: Learn how to implement exactly-once data delivery to BigQuery using the Storage Write API's committed mode with stream offsets and proper error handling.

---

Duplicate data in your analytics tables is a problem that compounds over time. Counts get inflated, revenue figures become unreliable, and downstream consumers lose trust in the data. The BigQuery Storage Write API's committed mode helps solve retry-related duplicates by providing exactly-once delivery semantics within a write stream.

Getting exactly-once right requires understanding how stream offsets work and how to handle failures properly. I have implemented this pattern for financial data pipelines where duplicates are unacceptable, and I want to share the approach.

## How Exactly-Once Works

The Storage Write API's committed mode uses stream offsets to track exactly which rows have been successfully written. Here is the concept:

1. You create a dedicated write stream (not the default stream).
2. Each append request includes an offset that indicates where in the stream the data should be written.
3. The server validates that the offset matches the expected next offset.
4. If you retry a request with an offset that was already written, the server returns an `ALREADY_EXISTS` offset error and does not write it again.
5. Data in a committed stream is visible as soon as BigQuery acknowledges the append. You can finalize the stream when you are done to release it.

```mermaid
sequenceDiagram
    participant Client
    participant BQ as BigQuery

    Client->>BQ: CreateWriteStream (COMMITTED type)
    BQ-->>Client: Stream created

    Client->>BQ: AppendRows (offset=0, rows 1-100)
    BQ-->>Client: ACK (offset=0)

    Client->>BQ: AppendRows (offset=100, rows 101-200)
    BQ-->>Client: ACK (offset=100)

    Note over Client,BQ: Network error on next append
    Client->>BQ: AppendRows (offset=200, rows 201-300)
    BQ-->>Client: Timeout

    Client->>BQ: Retry: AppendRows (offset=200, rows 201-300)
    BQ-->>Client: ALREADY_EXISTS (offset already processed)

    Client->>BQ: FinalizeWriteStream
    BQ-->>Client: Finalized (300 rows)
```

## Creating a Committed Write Stream

Here is how to create a committed write stream in Python.

```python
# exactly_once_writer.py - Exactly-once delivery using committed streams

from google.cloud import bigquery_storage_v1
from google.cloud.bigquery_storage_v1 import types
from google.protobuf import wrappers_pb2
from google.rpc import code_pb2
from google.api_core import exceptions
import logging
import time

logger = logging.getLogger(__name__)

class ExactlyOnceWriter:
    """Writer that guarantees exactly-once delivery within a BigQuery stream."""

    def __init__(self, project, dataset, table):
        self.project = project
        self.dataset = dataset
        self.table = table
        self.client = bigquery_storage_v1.BigQueryWriteClient()
        self.parent = self.client.table_path(project, dataset, table)
        self.stream = None
        self.current_offset = 0

    def create_stream(self):
        """Create a new committed write stream."""
        write_stream = types.WriteStream()
        # COMMITTED type provides exactly-once semantics
        write_stream.type_ = types.WriteStream.Type.COMMITTED

        self.stream = self.client.create_write_stream(
            parent=self.parent,
            write_stream=write_stream
        )
        self.current_offset = 0
        logger.info(f"Created stream: {self.stream.name}")
        return self.stream.name

    def append_rows(self, rows, max_retries=3):
        """
        Append rows with exactly-once delivery guarantee.
        Uses stream offsets to prevent duplicates on retry.
        """
        if not self.stream:
            raise RuntimeError("No active stream. Call create_stream() first.")

        offset = self.current_offset
        row_count = len(rows)

        for attempt in range(max_retries):
            try:
                # The offset tells BigQuery where these rows should go
                # If we retry with the same offset after a successful append,
                # BigQuery returns ALREADY_EXISTS instead of writing duplicates
                request = types.AppendRowsRequest()
                request.write_stream = self.stream.name
                request.offset = wrappers_pb2.Int64Value(value=offset)

                # Serialize and append rows
                # (Protocol buffer serialization details omitted for clarity)
                # request.proto_rows = build_proto_rows(rows)
                response = next(self.client.append_rows(iter([request])))

                if response.error.code == code_pb2.ALREADY_EXISTS:
                    logger.info(
                        f"Offset {offset} already written (duplicate request). "
                        f"Treating as success."
                    )
                    self.current_offset += row_count
                    return True

                if response.error.code == code_pb2.OUT_OF_RANGE:
                    raise RuntimeError(
                        f"Offset {offset} is beyond the current end of the stream"
                    )

                if response.error.code:
                    raise RuntimeError(
                        f"Append failed at offset {offset}: {response.error.message}"
                    )

                logger.info(
                    f"Appending {row_count} rows at offset {offset} "
                    f"(attempt {attempt + 1})"
                )

                # After successful append, advance the offset
                self.current_offset += row_count
                logger.info(f"Append successful. New offset: {self.current_offset}")
                return True

            except exceptions.AlreadyExists:
                # This offset was already written - this is a successful retry
                logger.info(
                    f"Offset {offset} already written (duplicate request). "
                    f"Treating as success."
                )
                self.current_offset += row_count
                return True

            except exceptions.ResourceExhausted:
                # Rate limited - back off and retry
                wait = min(2 ** attempt * 0.5, 30)
                logger.warning(f"Rate limited. Waiting {wait}s before retry.")
                time.sleep(wait)

            except exceptions.InvalidArgument as e:
                # Bad data - do not retry
                logger.error(f"Invalid data at offset {offset}: {e}")
                raise

            except Exception as e:
                if attempt < max_retries - 1:
                    wait = min(2 ** attempt, 10)
                    logger.warning(
                        f"Attempt {attempt + 1} failed: {e}. "
                        f"Retrying in {wait}s."
                    )
                    time.sleep(wait)
                else:
                    logger.error(
                        f"All {max_retries} attempts failed for offset {offset}"
                    )
                    raise

    def finalize_stream(self):
        """Finalize the stream - no more data can be appended."""
        if not self.stream:
            return

        response = self.client.finalize_write_stream(
            name=self.stream.name
        )
        logger.info(
            f"Stream finalized. Row count: {response.row_count}"
        )
        return response.row_count

    def commit_stream(self):
        """
        No commit step is needed for COMMITTED type streams.
        Data is visible and durable after each successful append.
        """
        if not self.stream:
            return

        logger.info(
            "Committed stream data is visible after successful append; "
            "BatchCommitWriteStreams is only for PENDING streams."
        )
        return None
```

## Using the Exactly-Once Writer

Here is how to use the writer in a data pipeline.

```python
# pipeline.py - Using the exactly-once writer in a pipeline
import json
from exactly_once_writer import ExactlyOnceWriter

def process_batch(events):
    """Process a batch of events with exactly-once delivery."""
    writer = ExactlyOnceWriter("my_project", "my_dataset", "events")

    try:
        # Create a new stream for this batch
        stream_name = writer.create_stream()
        print(f"Processing {len(events)} events on stream {stream_name}")

        # Split events into chunks for efficient appending
        chunk_size = 500
        for i in range(0, len(events), chunk_size):
            chunk = events[i:i + chunk_size]
            writer.append_rows(chunk)
            print(f"  Appended rows {i} to {i + len(chunk)}")

        # Finalize - no more data will be appended to this stream
        total_rows = writer.finalize_stream()
        print(f"Stream finalized with {total_rows} rows")

        # No commit step is needed for committed streams
        writer.commit_stream()
        print("Committed stream data is already visible")

    except Exception as e:
        print(f"Pipeline failed: {e}")
        # Successfully acknowledged appends are already visible.
        # Retry only data after the last saved checkpoint.
        raise


if __name__ == "__main__":
    # Simulate a batch of events
    events = [
        {"event_id": f"evt-{i}", "user_id": i % 1000, "event_type": "click"}
        for i in range(10000)
    ]
    process_batch(events)
```

## Handling Stream Failures

When a stream fails, you need to decide what to do with the partially written data.

```python
# failure_handling.py - Handling stream failures gracefully
def process_with_recovery(events, writer):
    """Process events with failure recovery."""
    checkpoint_offset = 0

    try:
        writer.create_stream()

        chunk_size = 500
        for i in range(0, len(events), chunk_size):
            chunk = events[i:i + chunk_size]
            writer.append_rows(chunk)
            # Save checkpoint after each successful append
            checkpoint_offset = i + len(chunk)

        writer.finalize_stream()
        writer.commit_stream()

    except Exception as e:
        print(f"Failed at offset {checkpoint_offset}: {e}")

        # Option 1: Create a new stream and retry from the checkpoint
        remaining_events = events[checkpoint_offset:]
        if remaining_events:
            print(f"Retrying {len(remaining_events)} remaining events")
            retry_writer = ExactlyOnceWriter(
                writer.project, writer.dataset, writer.table
            )
            process_with_recovery(remaining_events, retry_writer)

        # Option 2: Abandon this stream and let the next pipeline run pick up
        # only the data after the last saved checkpoint. Acknowledged appends
        # on committed streams are already visible.
```

## Offset Management for Long-Running Streams

For long-running streams that span multiple processing windows, you need persistent offset tracking.

```python
# offset_tracker.py - Track offsets persistently for recovery
import json
import os

class OffsetTracker:
    """Track stream offsets in a persistent store for recovery."""

    def __init__(self, checkpoint_path):
        self.checkpoint_path = checkpoint_path

    def save_checkpoint(self, stream_name, offset, metadata=None):
        """Save the current offset to persistent storage."""
        checkpoint = {
            "stream_name": stream_name,
            "offset": offset,
            "metadata": metadata or {}
        }
        with open(self.checkpoint_path, 'w') as f:
            json.dump(checkpoint, f)

    def load_checkpoint(self):
        """Load the last saved checkpoint."""
        if not os.path.exists(self.checkpoint_path):
            return None
        with open(self.checkpoint_path, 'r') as f:
            return json.load(f)

    def clear_checkpoint(self):
        """Clear the checkpoint after successful finalization."""
        if os.path.exists(self.checkpoint_path):
            os.remove(self.checkpoint_path)
```

## Multiple Streams for High Throughput

For very high throughput scenarios, use multiple streams in parallel. Each stream maintains its own offset independently.

```python
# parallel_writer.py - Multiple streams for parallel exactly-once writes
from concurrent.futures import ThreadPoolExecutor, as_completed
from exactly_once_writer import ExactlyOnceWriter

def parallel_write(events, project, dataset, table, num_streams=4):
    """Write events using multiple parallel streams."""
    # Partition events across streams
    chunk_size = len(events) // num_streams
    partitions = []
    for i in range(num_streams):
        start = i * chunk_size
        end = start + chunk_size if i < num_streams - 1 else len(events)
        partitions.append(events[start:end])

    # Create writers and process partitions in parallel
    stream_names = []
    with ThreadPoolExecutor(max_workers=num_streams) as executor:
        futures = {}
        for i, partition in enumerate(partitions):
            writer = ExactlyOnceWriter(project, dataset, table)
            writer.create_stream()
            stream_names.append(writer.stream.name)
            future = executor.submit(write_partition, writer, partition)
            futures[future] = i

        # Wait for all partitions to complete
        for future in as_completed(futures):
            partition_idx = futures[future]
            try:
                future.result()
                print(f"Partition {partition_idx} completed")
            except Exception as e:
                print(f"Partition {partition_idx} failed: {e}")
                raise

    print(f"All {num_streams} streams finalized successfully")


def write_partition(writer, events):
    """Write a partition of events to a single stream."""
    chunk_size = 500
    for i in range(0, len(events), chunk_size):
        chunk = events[i:i + chunk_size]
        writer.append_rows(chunk)
    writer.finalize_stream()

```

## Verifying Exactly-Once Delivery

After implementing exactly-once delivery, verify it works by checking for duplicates.

```sql
-- Check for duplicate event_ids which would indicate delivery issues
SELECT
  event_id,
  COUNT(*) AS occurrence_count
FROM `my_project.my_dataset.events`
WHERE event_date = CURRENT_DATE()
GROUP BY event_id
HAVING COUNT(*) > 1
LIMIT 20;
```

```sql
-- Compare expected vs actual row counts
SELECT
  COUNT(*) AS total_rows,
  COUNT(DISTINCT event_id) AS unique_events,
  COUNT(*) - COUNT(DISTINCT event_id) AS duplicate_count
FROM `my_project.my_dataset.events`
WHERE event_date = CURRENT_DATE();
```

## Wrapping Up

Exactly-once delivery with the BigQuery Storage Write API requires more setup than the default stream, but it eliminates retry-related duplicates within a stream. The key concepts are: use COMMITTED type streams, always include offsets in your append requests, handle retries by re-sending with the same offset, and finalize streams when you are done. If you need an atomic commit that makes a whole batch visible at once, use PENDING streams instead. For financial, billing, or any data where accuracy matters, this is the right approach.

For monitoring your exactly-once delivery pipelines and alerting on any data integrity issues, [OneUptime](https://oneuptime.com) provides the observability tools needed to keep your data pipelines reliable.
