# How to Use Dapr Bindings for Batch Processing

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Binding, Batch Processing, Cron, Automation

Description: Learn how to implement scheduled batch processing jobs using Dapr bindings, combining cron triggers with database and storage bindings for reliable data processing.

---

## Batch Processing with Dapr Bindings

Dapr bindings are well suited for batch processing workloads. The cron input binding provides a reliable scheduler, while database and storage output bindings handle reading sources and writing results. This approach avoids dedicated batch infrastructure for many common use cases.

## Architecture Overview

A typical Dapr-powered batch job:
1. Cron binding triggers the job at a scheduled interval
2. Application queries a source system via an output binding
3. Data is processed (filtered, transformed, aggregated)
4. Results are written to a destination via another output binding
5. Optional: send a summary notification

## Defining the Cron Trigger

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: nightly-report-trigger
spec:
  type: bindings.cron
  version: v1
  metadata:
    - name: schedule
      value: "0 0 2 * * *"
```

Supported schedule formats:
- `@every 30m` - every 30 minutes
- `0 0 2 * * *` - 2:00 AM daily
- `0 0 9 * * 1` - 9:00 AM every Monday

## Querying Source Data

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: analytics-db
spec:
  type: bindings.postgresql
  version: v1
  metadata:
    - name: connectionString
      value: "postgres://user:pass@db-host:5432/analytics?sslmode=require"
```

## Writing Results to Storage

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: report-storage
spec:
  type: bindings.aws.s3
  version: v1
  metadata:
    - name: bucket
      value: "nightly-reports"
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

## Batch Job Application Code

```javascript
const express = require("express");
const { DaprClient } = require("@dapr/dapr");

const app = express();
app.use(express.json());
const client = new DaprClient();

app.post("/nightly-report-trigger", async (req, res) => {
  const startTime = Date.now();
  const reportDate = getPreviousDay();
  console.log(`Starting nightly batch for ${reportDate}`);

  try {
    // Step 1: Extract data from source DB
    const rows = await client.binding.send(
      "analytics-db",
      "query",
      null,
      {
        sql: `
          SELECT
            product_id,
            SUM(quantity) AS total_sold,
            SUM(revenue) AS total_revenue,
            COUNT(DISTINCT user_id) AS unique_buyers
          FROM orders
          WHERE DATE(created_at) = $1
            AND status = 'COMPLETED'
          GROUP BY product_id
          ORDER BY total_revenue DESC
        `,
        params: [reportDate],
      }
    );

    // Step 2: Transform
    const report = {
      date: reportDate,
      generatedAt: new Date().toISOString(),
      totalProducts: rows.length,
      totalRevenue: rows.reduce((s, r) => s + parseFloat(r.total_revenue), 0),
      topProducts: rows.slice(0, 10),
      allProducts: rows,
    };

    // Step 3: Write report to S3
    const reportKey = `reports/${reportDate}/nightly-sales.json`;
    await client.binding.send(
      "report-storage",
      "create",
      JSON.stringify(report, null, 2),
      { key: reportKey }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`Batch complete: ${rows.length} products, ${duration}s`);

    res.status(200).send("OK");
  } catch (err) {
    console.error("Batch job failed:", err);
    res.status(500).send(err.message);
  }
});

function getPreviousDay() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

app.listen(3000);
```

## Handling Long-Running Batches

For jobs that take longer than the sidecar's response timeout, use an async pattern:

```javascript
app.post("/nightly-report-trigger", async (req, res) => {
  // Acknowledge immediately to prevent timeout
  res.status(200).send("OK");

  // Run the actual work asynchronously
  runBatchJob().catch((err) => {
    console.error("Batch job error:", err);
  });
});
```

## Summary

Dapr's cron input binding combined with database and storage output bindings provides a straightforward batch processing framework. The cron binding handles reliable scheduling, your application contains the business logic, and output bindings manage delivery to any destination. This pattern requires no dedicated batch infrastructure and integrates naturally with Dapr's monitoring and resiliency features.
