# How to Use Dapr Jobs for Report Generation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Report, Scheduling, Microservice

Description: Learn how to schedule automated report generation using Dapr Jobs API, producing and delivering reports on a recurring schedule in distributed microservices.

---

Automated report generation - daily summaries, weekly analytics, monthly invoices - is a critical operational requirement. Dapr Jobs provides the scheduling backbone, letting you focus on report logic rather than timer infrastructure.

## Report Generation Architecture

```text
Dapr Scheduler
     |
     v
Report Service (triggered by job)
     |
     +-- Query Data Sources
     |
     +-- Generate Report (PDF/CSV/HTML)
     |
     +-- Store to Object Storage
     |
     +-- Notify via Dapr Pub/Sub
```

## Scheduling Different Report Types

Create jobs for each report type:

```bash
# Daily sales summary - every day at 6 AM
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/daily-sales-report \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 0 6 * * *",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"reportType\": \"sales\", \"period\": \"daily\", \"recipients\": [\"sales@example.com\"]}"
    }
  }'

# Weekly engagement report - every Monday at 8 AM
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/weekly-engagement-report \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "0 0 8 * * 1",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"reportType\": \"engagement\", \"period\": \"weekly\"}"
    }
  }'
```

## Implementing the Report Handler

```javascript
const express = require('express');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');

const app = express();
app.use(express.json());

app.post('/job/daily-sales-report', async (req, res) => {
  try {
    const params = JSON.parse(req.body?.value || '{}');
    console.log(`Generating ${params.reportType} report for ${params.period}`);

    // Fetch data from data source
    const data = await fetchSalesData(params.period);

    // Generate PDF report
    const reportPath = await generatePDFReport(data, params.reportType);

    // Store report using Dapr output binding
    await storeReport(reportPath, params.reportType);

    // Send notification via Dapr Pub/Sub
    await notifyReportReady(params.reportType, params.recipients);

    res.status(200).json({ status: 'ok', report: reportPath });
  } catch (err) {
    console.error('Report generation failed:', err);
    res.status(500).json({ error: err.message });
  }
});

async function storeReport(reportPath, reportType) {
  const content = require('fs').readFileSync(reportPath);
  const timestamp = new Date().toISOString().split('T')[0];

  await fetch(`http://localhost:3500/v1.0/bindings/report-storage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      operation: 'create',
      data: content.toString('base64'),
      metadata: {
        key: `reports/${reportType}/${timestamp}.pdf`,
        contentType: 'application/pdf'
      }
    })
  });
}

async function notifyReportReady(reportType, recipients) {
  await fetch(`http://localhost:3500/v1.0/publish/pubsub/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reportType,
      recipients,
      generatedAt: new Date().toISOString()
    })
  });
}

app.listen(6001);
```

## Parameterized Report on User Request

Allow users to request custom reports with a one-time job:

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._jobs import Job
from google.protobuf.any_pb2 import Any as GrpcAny
import json

def schedule_custom_report(user_id: str, start_date: str, end_date: str):
    with DaprClient() as client:
        job_data = json.dumps({
            "reportType": "custom",
            "userId": user_id,
            "startDate": start_date,
            "endDate": end_date
        })

        data = GrpcAny(value=job_data.encode("utf-8"))

        job = Job(
            name=f"custom-report-{user_id}-{start_date}",
            due_time="5m",  # generate in 5 minutes
            data=data,
        )

        client.schedule_job_alpha1(job=job)
        print(f"Scheduled custom report for {user_id}")
```

## Summary

Dapr Jobs enables automated report generation with reliable, persistent scheduling. By triggering report services through the Jobs API and integrating with Dapr bindings for storage and Pub/Sub for notifications, you can build a complete reporting pipeline that scales with your microservice architecture.
