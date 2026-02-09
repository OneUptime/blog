# How to Configure Knative Eventing with Dead Letter Sinks for Failed Event Delivery

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Knative, Kubernetes, Event-Driven, Error-Handling, Reliability

Description: Implement robust error handling in Knative Eventing using dead letter sinks to capture failed events, enabling reliable event-driven architectures with proper failure recovery.

---

Failed event deliveries are inevitable in distributed systems. Network issues, service downtime, and processing errors can prevent events from reaching their destinations. Knative Eventing provides dead letter sinks as a mechanism to capture these failed events, preventing data loss and enabling failure analysis. This guide shows you how to implement comprehensive error handling with dead letter sinks.

## Understanding Dead Letter Sinks

A dead letter sink is a destination where Knative sends events that fail delivery after all retry attempts are exhausted. Instead of losing these events, they're preserved for investigation and potential reprocessing. This pattern is essential for building reliable event-driven systems.

Knative supports configurable retry policies including the number of attempts, backoff strategies, and timeout values. When an event fails all retry attempts, Knative routes it to the configured dead letter sink with additional context about the failure.

Dead letter sinks can be any addressable Knative resource including Services, Brokers, or Channels. This flexibility allows you to build sophisticated error handling pipelines that analyze, transform, and potentially reprocess failed events.

## Configuring Basic Dead Letter Sinks

Set up a dead letter sink for a Broker:

```yaml
# dlq-handler-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: dlq-handler
  namespace: default
spec:
  template:
    spec:
      containers:
      - image: your-registry/dlq-handler:latest
        env:
        - name: STORAGE_BACKEND
          value: "postgresql"
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
---
# broker-with-dlq.yaml
apiVersion: eventing.knative.dev/v1
kind: Broker
metadata:
  name: orders-broker
  namespace: default
spec:
  # Delivery configuration
  delivery:
    # Dead letter sink
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: dlq-handler

    # Retry configuration
    retry: 5
    backoffPolicy: exponential
    backoffDelay: PT1S  # ISO 8601 duration: 1 second

    # Timeout for each delivery attempt
    timeout: PT10S
```

Apply the configuration:

```bash
kubectl apply -f dlq-handler-service.yaml
kubectl apply -f broker-with-dlq.yaml

# Verify configuration
kubectl get broker orders-broker -o yaml | grep -A 10 delivery
```

## Implementing the Dead Letter Handler

Create a comprehensive DLQ handler that stores and analyzes failed events:

```javascript
// dlq-handler/server.js
const express = require('express');
const { Pool } = require('pg');
const app = express();

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Initialize database schema
async function initDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS failed_events (
      id SERIAL PRIMARY KEY,
      event_id VARCHAR(255) NOT NULL,
      event_type VARCHAR(255),
      event_source VARCHAR(255),
      failure_reason TEXT,
      retry_count INTEGER,
      original_data JSONB,
      headers JSONB,
      failed_at TIMESTAMP DEFAULT NOW(),
      reprocessed BOOLEAN DEFAULT FALSE,
      reprocessed_at TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_failed_events_type
      ON failed_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_failed_events_reprocessed
      ON failed_events(reprocessed);
  `);
}

initDatabase().catch(console.error);

app.post('/', async (req, res) => {
  try {
    // Extract CloudEvents headers
    const eventId = req.headers['ce-id'];
    const eventType = req.headers['ce-type'];
    const eventSource = req.headers['ce-source'];

    // Knative adds delivery context
    const attempts = req.headers['ce-knativedeliveryattempts'] || '0';
    const lastError = req.headers['ce-knativelasterror'] || 'Unknown error';

    const eventData = req.body;

    console.log(`[DLQ] Received failed event ${eventId}`);
    console.log(`  Type: ${eventType}`);
    console.log(`  Source: ${eventSource}`);
    console.log(`  Attempts: ${attempts}`);
    console.log(`  Error: ${lastError}`);

    // Store failed event
    const result = await pool.query(`
      INSERT INTO failed_events (
        event_id, event_type, event_source,
        failure_reason, retry_count,
        original_data, headers
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `, [
      eventId,
      eventType,
      eventSource,
      lastError,
      parseInt(attempts),
      JSON.stringify(eventData),
      JSON.stringify(req.headers)
    ]);

    const failedEventId = result.rows[0].id;

    // Analyze failure pattern
    const pattern = await analyzeFailurePattern(eventType, lastError);

    // Send alert for critical failures
    if (pattern.critical) {
      await sendAlert({
        severity: 'high',
        message: `Critical event failure pattern detected`,
        eventType: eventType,
        failureRate: pattern.rate,
        failedEventId: failedEventId
      });
    }

    // Attempt automatic recovery for transient errors
    if (isTransientError(lastError)) {
      await scheduleRetry(failedEventId, eventData);
    }

    res.status(200).json({
      status: 'stored',
      id: failedEventId,
      pattern: pattern
    });

  } catch (error) {
    console.error('[DLQ] Error handling failed event:', error);
    // Still return 200 to acknowledge receipt
    // We don't want DLQ failures to cascade
    res.status(200).json({
      status: 'error',
      error: error.message
    });
  }
});

async function analyzeFailurePattern(eventType, error) {
  // Get recent failure rate for this event type
  const result = await pool.query(`
    SELECT COUNT(*) as count
    FROM failed_events
    WHERE event_type = $1
    AND failed_at > NOW() - INTERVAL '5 minutes'
  `, [eventType]);

  const recentFailures = parseInt(result.rows[0].count);

  return {
    critical: recentFailures > 10,
    rate: recentFailures,
    errorType: classifyError(error)
  };
}

function classifyError(error) {
  if (error.includes('timeout')) return 'timeout';
  if (error.includes('connection')) return 'connection';
  if (error.includes('500')) return 'server_error';
  if (error.includes('404')) return 'not_found';
  return 'unknown';
}

function isTransientError(error) {
  const transientPatterns = [
    'timeout',
    'connection refused',
    'temporarily unavailable',
    'service unavailable'
  ];

  return transientPatterns.some(pattern =>
    error.toLowerCase().includes(pattern)
  );
}

async function scheduleRetry(failedEventId, eventData) {
  // Implementation would queue event for retry
  console.log(`Scheduling retry for event ${failedEventId}`);
}

async function sendAlert(alert) {
  // Implementation would send to alerting system
  console.log('Alert:', alert);
}

// API endpoint to query failed events
app.get('/failed-events', async (req, res) => {
  const { eventType, limit = 100 } = req.query;

  let query = `
    SELECT * FROM failed_events
    WHERE reprocessed = FALSE
  `;
  const params = [];

  if (eventType) {
    params.push(eventType);
    query += ` AND event_type = $1`;
  }

  query += ` ORDER BY failed_at DESC LIMIT $${params.length + 1}`;
  params.push(limit);

  const result = await pool.query(query, params);

  res.json({
    count: result.rows.length,
    events: result.rows
  });
});

// API endpoint to reprocess failed event
app.post('/reprocess/:id', async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(`
    SELECT * FROM failed_events
    WHERE id = $1 AND reprocessed = FALSE
  `, [id]);

  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Event not found or already reprocessed' });
  }

  const event = result.rows[0];

  // Send event back to broker for reprocessing
  try {
    await reprocessEvent(event);

    await pool.query(`
      UPDATE failed_events
      SET reprocessed = TRUE, reprocessed_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({ status: 'reprocessed', id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

async function reprocessEvent(event) {
  // Send event back to the original broker
  const axios = require('axios');

  const brokerUrl = 'http://orders-broker-broker.default.svc.cluster.local';

  await axios.post(brokerUrl, JSON.parse(event.original_data), {
    headers: {
      'Ce-Id': event.event_id,
      'Ce-Type': event.event_type,
      'Ce-Source': event.event_source,
      'Ce-Specversion': '1.0',
      'Content-Type': 'application/json'
    }
  });
}

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`DLQ handler listening on port ${PORT}`);
});
```

## Configuring Trigger-Specific Dead Letter Sinks

Set up different DLQ handlers for different triggers:

```yaml
# trigger-specific-dlq.yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: payment-processor
  namespace: default
spec:
  broker: orders-broker

  filter:
    attributes:
      type: com.company.order.payment

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: payment-service

  # Trigger-specific DLQ configuration
  delivery:
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: payment-dlq-handler

    # More aggressive retries for payments
    retry: 10
    backoffPolicy: exponential
    backoffDelay: PT2S
    timeout: PT30S
---
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: notification-sender
spec:
  broker: orders-broker

  filter:
    attributes:
      type: com.company.order.notification

  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: notification-service

  delivery:
    deadLetterSink:
      ref:
        apiVersion: serving.knative.dev/v1
        kind: Service
        name: notification-dlq-handler

    # Fewer retries for non-critical notifications
    retry: 3
    backoffPolicy: linear
    backoffDelay: PT5S
```

## Building a Dead Letter Reprocessing Pipeline

Create a system to automatically reprocess failed events:

```python
# dlq-reprocessor.py
import asyncio
import aiohttp
import psycopg2
from datetime import datetime, timedelta
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DLQReprocessor:
    def __init__(self, db_url, broker_url):
        self.db_url = db_url
        self.broker_url = broker_url
        self.conn = psycopg2.connect(db_url)

    async def run(self):
        """Main reprocessing loop"""
        while True:
            try:
                await self.reprocess_eligible_events()
                await asyncio.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Reprocessor error: {e}")
                await asyncio.sleep(10)

    async def reprocess_eligible_events(self):
        """Find and reprocess events eligible for retry"""

        # Query for events to retry
        # - Failed more than 5 minutes ago
        # - Not yet reprocessed
        # - Transient error type
        cursor = self.conn.cursor()
        cursor.execute("""
            SELECT id, event_id, event_type, event_source,
                   original_data, headers, retry_count
            FROM failed_events
            WHERE reprocessed = FALSE
            AND failed_at < NOW() - INTERVAL '5 minutes'
            AND retry_count < 3
            ORDER BY failed_at
            LIMIT 10
        """)

        events = cursor.fetchall()
        logger.info(f"Found {len(events)} events to reprocess")

        for event in events:
            await self.reprocess_event(event)

    async def reprocess_event(self, event):
        """Reprocess a single event"""
        event_id, ce_id, ce_type, ce_source, data, headers, retry_count = event

        logger.info(f"Reprocessing event {event_id} (CloudEvent: {ce_id})")

        try:
            async with aiohttp.ClientSession() as session:
                headers_dict = {
                    'Ce-Id': ce_id,
                    'Ce-Type': ce_type,
                    'Ce-Source': ce_source,
                    'Ce-Specversion': '1.0',
                    'Content-Type': 'application/json'
                }

                async with session.post(
                    self.broker_url,
                    json=data,
                    headers=headers_dict,
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status == 200:
                        # Mark as successfully reprocessed
                        cursor = self.conn.cursor()
                        cursor.execute("""
                            UPDATE failed_events
                            SET reprocessed = TRUE,
                                reprocessed_at = NOW()
                            WHERE id = %s
                        """, (event_id,))
                        self.conn.commit()

                        logger.info(f"Successfully reprocessed event {event_id}")
                    else:
                        # Increment retry count
                        cursor = self.conn.cursor()
                        cursor.execute("""
                            UPDATE failed_events
                            SET retry_count = retry_count + 1
                            WHERE id = %s
                        """, (event_id,))
                        self.conn.commit()

                        logger.warning(f"Reprocessing failed for event {event_id}: {response.status}")

        except Exception as e:
            logger.error(f"Error reprocessing event {event_id}: {e}")

            # Increment retry count
            cursor = self.conn.cursor()
            cursor.execute("""
                UPDATE failed_events
                SET retry_count = retry_count + 1
                WHERE id = %s
            """, (event_id,))
            self.conn.commit()

if __name__ == '__main__':
    import os

    reprocessor = DLQReprocessor(
        db_url=os.getenv('DATABASE_URL'),
        broker_url=os.getenv('BROKER_URL')
    )

    asyncio.run(reprocessor.run())
```

Deploy the reprocessor:

```yaml
# dlq-reprocessor-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dlq-reprocessor
spec:
  replicas: 1
  selector:
    matchLabels:
      app: dlq-reprocessor
  template:
    metadata:
      labels:
        app: dlq-reprocessor
    spec:
      containers:
      - name: reprocessor
        image: your-registry/dlq-reprocessor:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: BROKER_URL
          value: "http://orders-broker-broker.default.svc.cluster.local"
```

## Monitoring Dead Letter Queues

Create dashboards to track DLQ metrics:

```yaml
# dlq-servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: dlq-handler-monitor
spec:
  selector:
    matchLabels:
      app: dlq-handler
  endpoints:
  - port: metrics
    interval: 15s
---
# dlq-alerts.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: dlq-alerts
spec:
  groups:
  - name: dead-letter-queue
    interval: 30s
    rules:
    - alert: HighDLQRate
      expr: rate(dlq_events_total[5m]) > 10
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "High rate of failed events"
        description: "DLQ receiving {{ $value }} events per second"

    - alert: DLQGrowthAccelerating
      expr: deriv(dlq_events_total[10m]) > 0
      for: 10m
      labels:
        severity: critical
      annotations:
        summary: "DLQ size growing rapidly"
        description: "Failed event rate is accelerating"
```

## Best Practices

Always configure dead letter sinks for production workloads. Don't rely on default behavior that might silently drop failed events.

Store comprehensive failure context. Capture event data, headers, error messages, and retry counts to enable effective debugging.

Implement automatic reprocessing for transient failures. Network blips and temporary service unavailability shouldn't require manual intervention.

Monitor DLQ growth rates. Sudden spikes in failed events indicate systemic issues that need immediate attention.

Set appropriate retry policies. Balance between giving failing services time to recover and quickly routing events to the DLQ for analysis.

Regularly review failed events. Use DLQ data to identify patterns and fix underlying issues rather than continuously reprocessing the same failures.

## Conclusion

Dead letter sinks are essential for building reliable event-driven systems with Knative Eventing. By properly capturing and handling failed events, you prevent data loss while gaining visibility into system health. A well-designed DLQ strategy combines automatic retry logic for transient failures with comprehensive storage and analysis for persistent issues. This approach enables you to build resilient event-driven architectures that gracefully handle the inevitable failures in distributed systems.
