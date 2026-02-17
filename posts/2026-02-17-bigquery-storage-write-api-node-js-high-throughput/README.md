# How to Use the Node.js BigQuery Storage Write API for High-Throughput Data Ingestion

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, BigQuery, Node.js, Data Ingestion, Storage API, Google Cloud

Description: Use the BigQuery Storage Write API from Node.js for high-throughput data ingestion that is faster and more efficient than traditional streaming inserts.

---

The BigQuery Storage Write API is the modern way to stream data into BigQuery. It replaces the older streaming insert API (tabledata.insertAll) with a protocol-buffer-based interface that offers better performance, exactly-once semantics, and lower costs. If you are ingesting large volumes of data from a Node.js application - event logs, IoT telemetry, clickstream data, or real-time analytics - the Storage Write API is what you should be using.

In this post, I will walk through setting up the BigQuery Storage Write API in a Node.js application, covering both the default stream (for simple use cases) and committed streams (for exactly-once delivery).

## Why the Storage Write API Over Streaming Inserts

The older streaming insert API (used via `table.insert()`) has several limitations:

- It charges per-row pricing for streaming inserts
- It uses a best-effort deduplication that is not reliable for exactly-once
- Rows have a 1MB size limit and you can only send 10,000 rows per request
- Data may take up to 90 minutes to become available for querying

The Storage Write API fixes all of these:

- Free if you stay under the monthly quota (first 2TB free)
- Supports exactly-once semantics with committed streams
- Uses protocol buffers for efficient serialization
- Data is available for querying within seconds

## Installing Dependencies

```bash
# Install the BigQuery Storage client
npm install @google-cloud/bigquery-storage @google-cloud/bigquery protobufjs
```

## Setting Up the Table

Before writing data, you need a BigQuery table. Here is a simple setup.

```javascript
// setup-table.js - Create the destination table
const { BigQuery } = require('@google-cloud/bigquery');

const bigquery = new BigQuery({ projectId: 'your-project-id' });

async function createTable() {
  const datasetId = 'events_dataset';
  const tableId = 'raw_events';

  // Create the dataset if it does not exist
  const [datasets] = await bigquery.getDatasets();
  const datasetExists = datasets.some((d) => d.id === datasetId);
  if (!datasetExists) {
    await bigquery.createDataset(datasetId);
    console.log(`Created dataset ${datasetId}`);
  }

  // Define the table schema
  const schema = [
    { name: 'event_id', type: 'STRING', mode: 'REQUIRED' },
    { name: 'event_type', type: 'STRING', mode: 'REQUIRED' },
    { name: 'user_id', type: 'STRING', mode: 'NULLABLE' },
    { name: 'payload', type: 'JSON', mode: 'NULLABLE' },
    { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
    { name: 'source', type: 'STRING', mode: 'NULLABLE' },
  ];

  const [table] = await bigquery
    .dataset(datasetId)
    .createTable(tableId, { schema });

  console.log(`Created table ${table.id}`);
}

createTable();
```

## Using the Default Stream

The default stream is the simplest way to write data. It provides at-least-once delivery semantics and is suitable for most use cases where occasional duplicates are acceptable.

```javascript
// writer.js - Write data using the default stream
const {
  BigQueryWriteClient,
  adapt,
} = require('@google-cloud/bigquery-storage');
const { BigQuery } = require('@google-cloud/bigquery');

const PROJECT_ID = 'your-project-id';
const DATASET_ID = 'events_dataset';
const TABLE_ID = 'raw_events';

const writeClient = new BigQueryWriteClient();
const bigquery = new BigQuery({ projectId: PROJECT_ID });

async function writeEvents(events) {
  const tablePath = `projects/${PROJECT_ID}/datasets/${DATASET_ID}/tables/${TABLE_ID}`;

  // Get the table schema to generate the protobuf descriptor
  const [metadata] = await bigquery
    .dataset(DATASET_ID)
    .table(TABLE_ID)
    .getMetadata();

  const storageSchema = adapt.convertBigQuerySchemaToStorageTableSchema(
    metadata.schema
  );
  const protoDescriptor = adapt.convertStorageSchemaToProto2Descriptor(
    storageSchema,
    'EventRow'
  );

  // Create the write stream reference for the default stream
  const parent = `${tablePath}/streams/_default`;

  // Serialize the rows using the protobuf descriptor
  const protoRows = {
    writerSchema: {
      protoDescriptor: protoDescriptor,
    },
    rows: {
      serializedRows: events.map((event) => {
        const row = adapt.convertObjectToProto(
          {
            event_id: event.eventId,
            event_type: event.eventType,
            user_id: event.userId || '',
            payload: event.payload ? JSON.stringify(event.payload) : null,
            timestamp: event.timestamp || new Date().toISOString(),
            source: event.source || 'node-app',
          },
          protoDescriptor
        );
        return row;
      }),
    },
  };

  // Append rows to the default stream
  const [response] = await writeClient.appendRows({
    writeStream: parent,
    protoRows,
  });

  if (response.error) {
    throw new Error(`Write failed: ${response.error.message}`);
  }

  console.log(`Wrote ${events.length} rows, offset: ${response.appendResult.offset}`);
  return response;
}

module.exports = { writeEvents };
```

## Batching Writes for Throughput

For high-throughput scenarios, batch your writes instead of sending one row at a time.

```javascript
// batched-writer.js - Batch events and write periodically
const { writeEvents } = require('./writer');

class BatchedWriter {
  constructor(options = {}) {
    this.batchSize = options.batchSize || 500;
    this.flushIntervalMs = options.flushIntervalMs || 5000;
    this.buffer = [];
    this.isWriting = false;

    // Flush periodically
    this.flushTimer = setInterval(() => this.flush(), this.flushIntervalMs);
  }

  // Add an event to the buffer
  add(event) {
    this.buffer.push(event);

    // Flush if buffer reaches batch size
    if (this.buffer.length >= this.batchSize) {
      this.flush();
    }
  }

  // Flush the current buffer to BigQuery
  async flush() {
    if (this.buffer.length === 0 || this.isWriting) return;

    // Swap the buffer so new events go to a new array
    const batch = this.buffer;
    this.buffer = [];
    this.isWriting = true;

    try {
      await writeEvents(batch);
      console.log(`Flushed ${batch.length} events to BigQuery`);
    } catch (error) {
      console.error(`Failed to flush ${batch.length} events:`, error);
      // Put failed events back in the buffer for retry
      this.buffer.unshift(...batch);
    } finally {
      this.isWriting = false;
    }
  }

  // Stop the writer and flush remaining events
  async close() {
    clearInterval(this.flushTimer);
    await this.flush();
  }
}

module.exports = { BatchedWriter };
```

## Express API for Event Ingestion

```javascript
// app.js - HTTP API that ingests events into BigQuery
const express = require('express');
const { BatchedWriter } = require('./batched-writer');

const app = express();
app.use(express.json());

// Create a batched writer instance
const writer = new BatchedWriter({
  batchSize: 500,
  flushIntervalMs: 5000,
});

// Ingest a single event
app.post('/api/events', (req, res) => {
  const { eventType, userId, payload } = req.body;

  const event = {
    eventId: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventType,
    userId,
    payload,
    timestamp: new Date().toISOString(),
    source: req.headers['x-source'] || 'api',
  };

  writer.add(event);

  // Respond immediately - the write happens asynchronously
  res.status(202).json({ eventId: event.eventId, status: 'accepted' });
});

// Ingest a batch of events
app.post('/api/events/batch', (req, res) => {
  const { events } = req.body;

  if (!Array.isArray(events) || events.length === 0) {
    return res.status(400).json({ error: 'events array is required' });
  }

  if (events.length > 10000) {
    return res.status(400).json({ error: 'Maximum 10000 events per batch' });
  }

  const processedEvents = events.map((e) => ({
    eventId: e.eventId || `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    eventType: e.eventType,
    userId: e.userId,
    payload: e.payload,
    timestamp: e.timestamp || new Date().toISOString(),
    source: 'batch-api',
  }));

  processedEvents.forEach((event) => writer.add(event));

  res.status(202).json({
    accepted: processedEvents.length,
    status: 'queued',
  });
});

// Health check that includes buffer status
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bufferSize: writer.buffer.length,
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down, flushing remaining events...');
  await writer.close();
  process.exit(0);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Event ingestion service running on port ${PORT}`);
});
```

## Error Handling and Retry

Handle write failures gracefully with categorized error handling.

```javascript
// Categorize errors and decide on retry strategy
async function writeWithRetry(events, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await writeEvents(events);
    } catch (error) {
      const isRetryable = [
        'UNAVAILABLE',
        'DEADLINE_EXCEEDED',
        'RESOURCE_EXHAUSTED',
        'INTERNAL',
      ].includes(error.code);

      if (!isRetryable || attempt === maxRetries - 1) {
        console.error('Non-retryable write error:', error);
        throw error;
      }

      // Exponential backoff
      const delay = Math.pow(2, attempt) * 1000;
      console.warn(`Write attempt ${attempt + 1} failed, retrying in ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}
```

## Monitoring Ingestion

Track ingestion metrics for observability.

```javascript
// Simple metrics tracking
const metrics = {
  eventsReceived: 0,
  eventsWritten: 0,
  writeErrors: 0,
  lastWriteTime: null,
};

// Update metrics in the writer
async function writeEventsWithMetrics(events) {
  try {
    await writeEvents(events);
    metrics.eventsWritten += events.length;
    metrics.lastWriteTime = new Date().toISOString();
  } catch (error) {
    metrics.writeErrors++;
    throw error;
  }
}

// Expose metrics endpoint
app.get('/metrics', (req, res) => {
  res.json({
    ...metrics,
    bufferSize: writer.buffer.length,
    uptime: process.uptime(),
  });
});
```

The BigQuery Storage Write API is the recommended path for high-throughput data ingestion from Node.js applications. The default stream handles most use cases with at-least-once delivery, while committed streams provide exactly-once guarantees when you need them. Combined with batching and proper error handling, you can reliably ingest millions of events per day from a few Cloud Run instances.
