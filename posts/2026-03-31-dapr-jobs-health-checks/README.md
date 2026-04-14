# How to Use Dapr Jobs for Periodic Health Checks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Health Check, Monitoring, Microservice

Description: Learn how to use Dapr Jobs API to schedule periodic health checks for external services, databases, and APIs, with alerting when checks fail.

---

Dapr Jobs can drive periodic health checks for external dependencies - third-party APIs, databases, and partner services - that fall outside your standard Kubernetes readiness probes. This gives you a scheduled active monitoring layer managed within your microservice architecture.

## Why Use Dapr Jobs for Health Checks

- Check external services your application depends on but Kubernetes cannot probe
- Perform end-to-end health validations that go deeper than simple pings
- Run health checks on a configurable schedule per service
- Alert via Dapr Pub/Sub when a dependency becomes unhealthy

## Scheduling Health Check Jobs

```bash
# Check payment gateway every 2 minutes
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/health-check-payment-gateway \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 2m",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"service\": \"payment-gateway\", \"url\": \"https://api.payments.example.com/health\", \"timeout\": 5}"
    }
  }'

# Check database connectivity every 5 minutes
curl -X POST http://localhost:3500/v1.0-alpha1/jobs/health-check-database \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 5m",
    "data": {
      "@type": "type.googleapis.com/google.protobuf.StringValue",
      "value": "{\"service\": \"primary-db\", \"type\": \"database\", \"query\": \"SELECT 1\"}"
    }
  }'
```

## Implementing the Health Check Handler

```javascript
const express = require('express');

const app = express();
app.use(express.json());

const DAPR_URL = 'http://localhost:3500';

app.post('/job/:jobName', async (req, res) => {
  const params = JSON.parse(req.body?.data?.value || '{}');

  let result;
  if (params.type === 'database') {
    result = await checkDatabaseHealth(params);
  } else {
    result = await checkHttpHealth(params);
  }

  // Publish alert if unhealthy
  if (!result.healthy) {
    await publishHealthAlert(params.service, result);
  }

  // Store result in state for dashboard
  await storeHealthResult(params.service, result);

  res.status(200).json(result);
});

async function checkHttpHealth(params) {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), params.timeout * 1000);

    const response = await fetch(params.url, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    return {
      service: params.service,
      healthy: response.ok,
      statusCode: response.status,
      responseTimeMs: Date.now() - start,
      checkedAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      service: params.service,
      healthy: false,
      error: err.message,
      responseTimeMs: Date.now() - start,
      checkedAt: new Date().toISOString()
    };
  }
}

async function publishHealthAlert(service, result) {
  await fetch(`${DAPR_URL}/v1.0/publish/pubsub/health-alerts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      service,
      healthy: result.healthy,
      error: result.error,
      timestamp: result.checkedAt
    })
  });
  console.error(`ALERT: ${service} is unhealthy - ${result.error}`);
}

async function storeHealthResult(service, result) {
  await fetch(`${DAPR_URL}/v1.0/state/statestore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      key: `health:${service}:latest`,
      value: result
    }])
  });
}

app.listen(6001);
```

## Checking Health Results

Retrieve the latest health check result for any service:

```bash
curl http://localhost:3500/v1.0/state/statestore/health:payment-gateway:latest
```

Example response:

```json
{
  "service": "payment-gateway",
  "healthy": true,
  "statusCode": 200,
  "responseTimeMs": 145,
  "checkedAt": "2026-03-31T10:05:00Z"
}
```

## Subscribing to Health Alerts

Handle health alert notifications via Pub/Sub:

```python
from flask import Flask, request

app = Flask(__name__)

@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return [{"pubsubname": "pubsub", "topic": "health-alerts", "route": "/alerts"}]

@app.route('/alerts', methods=['POST'])
def handle_alert():
    event = request.get_json()
    service = event.get('data', {}).get('service')
    healthy = event.get('data', {}).get('healthy')

    if not healthy:
        send_pagerduty_alert(service)
        print(f"Paged on-call for unhealthy service: {service}")

    return {"status": "SUCCESS"}, 200
```

## Summary

Dapr Jobs provides a straightforward way to schedule periodic health checks for external dependencies, integrating naturally with Dapr Pub/Sub for alerting and Dapr State for storing check history. This gives teams proactive visibility into service health beyond standard Kubernetes probes.
