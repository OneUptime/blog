# How to Use Dapr Bindings for ETL Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, ETL, Data Pipeline, Integration

Description: Learn how to build lightweight ETL pipelines using Dapr bindings to extract data from sources, transform it, and load it to destinations without heavy infrastructure.

---

## Dapr Bindings as an ETL Foundation

ETL (Extract, Transform, Load) pipelines traditionally require dedicated infrastructure like Apache Spark, Airflow, or Glue. For many use cases, Dapr bindings offer a simpler alternative: use an input binding to extract data from a source, process it in your microservice, and use an output binding to load it to the destination.

## Example ETL Pipeline

This example extracts records from a MySQL database on a schedule, transforms the data, and loads it into AWS S3 as JSON files.

## Step 1: Extract - Cron Trigger for Scheduled Extraction

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: etl-scheduler
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "0 * * * *"
```

## Step 2: Source Connection - MySQL Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: source-db
spec:
  type: bindings.mysql
  version: v1
  metadata:
    - name: url
      value: "user:password@tcp(mysql-host:3306)/analytics?parseTime=true"
```

## Step 3: Destination - AWS S3 Output Binding

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: data-lake
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: "my-data-lake"
    - name: region
      value: "us-east-1"
    - name: accessKey
      secretKeyRef:
        name: aws-secrets
        key: accessKey
    - name: secretKey
      secretKeyRef:
        name: aws-secrets
        key: secretKey
```

## Application Code: Extract, Transform, Load

```javascript
const express = require("express");
const { DaprClient } = require("@dapr/dapr");

const app = express();
app.use(express.json());
const client = new DaprClient();

// Triggered by the cron binding every hour
app.post("/etl-scheduler", async (req, res) => {
  try {
    const batchDate = new Date().toISOString().split("T")[0];
    console.log(`Starting ETL batch for ${batchDate}`);

    // Extract
    const extractResult = await client.binding.send(
      "source-db",
      "query",
      null,
      {
        sql: `SELECT id, user_id, event_type, payload, created_at
              FROM events
              WHERE DATE(created_at) = CURDATE() - INTERVAL 1 DAY
              LIMIT 10000`,
      }
    );

    const records = extractResult;
    console.log(`Extracted ${records.length} records`);

    // Transform
    const transformed = records.map((row) => ({
      id: row.id,
      userId: row.user_id,
      eventType: row.event_type,
      data: JSON.parse(row.payload || "{}"),
      timestamp: row.created_at,
      processedAt: new Date().toISOString(),
    }));

    // Load - write to S3 as a partitioned JSON file
    const partitionKey = `year=${batchDate.slice(0, 4)}/month=${batchDate.slice(5, 7)}/day=${batchDate.slice(8, 10)}`;
    const fileName = `events/${partitionKey}/batch-${Date.now()}.json`;

    await client.binding.send(
      "data-lake",
      "create",
      JSON.stringify(transformed),
      {
        key: fileName,
        contentType: "application/json",
      }
    );

    console.log(`Loaded ${transformed.length} records to s3://${fileName}`);
    res.status(200).send("OK");
  } catch (err) {
    console.error("ETL error:", err);
    res.status(500).send(err.message);
  }
});

app.listen(3000);
```

## Batching Large Datasets

For large extractions, split into batches to avoid memory issues:

```javascript
async function loadInBatches(data, batchSize = 1000) {
  const batches = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }

  for (let i = 0; i < batches.length; i++) {
    await client.binding.send(
      "data-lake",
      "create",
      JSON.stringify(batches[i]),
      { key: `events/batch-${Date.now()}-part-${i}.json` }
    );
    console.log(`Uploaded batch ${i + 1}/${batches.length}`);
  }
}
```

## Running the Pipeline

```bash
dapr run \
  --app-id etl-pipeline \
  --app-port 3000 \
  --resources-path ./components \
  node app.js
```

## Summary

Dapr bindings provide a lightweight ETL foundation: use the cron binding for scheduling, database bindings for extraction, and cloud storage bindings for loading. The transform step lives entirely in your application code, making the pipeline easy to test, modify, and version without specialized ETL infrastructure.
