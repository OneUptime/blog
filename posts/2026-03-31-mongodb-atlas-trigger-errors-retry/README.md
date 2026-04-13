# How to Handle Trigger Errors and Retry Policies in MongoDB Atlas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas Triggers, Error Handling

Description: Configure error handling, retry policies, and dead-letter logging for MongoDB Atlas database and scheduled triggers to prevent silent failures in event-driven pipelines.

---

Atlas Triggers execute Atlas Functions in response to events. If a function throws an uncaught error, the trigger execution fails. Without proper error handling and retry configuration, failed events can be silently dropped or cause cascading failures. This guide covers error handling best practices.

## Default Trigger Behavior on Failure

By default, if a trigger function throws an error:

- The error is logged in Atlas App Services Logs
- For database triggers with event ordering enabled: the trigger pauses and retries from the failed event
- For database triggers without event ordering: the event is dropped
- For scheduled triggers: the missed execution is logged but not retried

## Enabling Event Ordering and Auto-Resume

Event ordering guarantees that trigger events are processed in the order they occur in the oplog. When enabled, a failed execution suspends the trigger:

```json
{
  "name": "process-orders",
  "type": "DATABASE",
  "config": {
    "operation_types": ["INSERT", "UPDATE"],
    "collection": "orders",
    "database": "production",
    "service_name": "mongodb-atlas",
    "full_document": true,
    "unordered": false
  },
  "event_processors": {
    "FUNCTION": {
      "config": {
        "function_name": "processOrder"
      }
    }
  }
}
```

A suspended trigger resumes from the failed event when you re-enable it in the Atlas UI.

## Wrapping Function Logic in Try-Catch

Always use try-catch in trigger functions to control error behavior:

```javascript
exports = async function(changeEvent) {
  const orderId = changeEvent.documentKey._id;

  try {
    await processOrder(changeEvent.fullDocument);
    console.log(`Successfully processed order ${orderId}`);
  } catch (err) {
    console.error(`Failed to process order ${orderId}:`, err.message);

    // Write to dead-letter collection for manual review
    const db = context.services.get("mongodb-atlas").db("production");
    await db.collection("trigger_dlq").insertOne({
      triggerId: context.app.id,
      eventType: changeEvent.operationType,
      documentKey: changeEvent.documentKey,
      fullDocument: changeEvent.fullDocument,
      error: err.message,
      failedAt: new Date()
    });

    // Re-throw if you want the trigger to pause (ordered triggers)
    // throw err;

    // Or swallow if you want to continue to next event (unordered)
  }
};
```

## Implementing Retry Logic Inside the Function

For transient errors (network timeouts, external API failures), retry within the function:

```javascript
async function withRetry(fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`Attempt ${attempt} failed: ${err.message}`);
      // Note: Atlas Functions do not support setTimeout, so retries
      // execute immediately. For delayed retries, use a scheduled
      // trigger to reprocess events from a dead-letter collection.
    }
  }
  throw lastError;
}

exports = async function(changeEvent) {
  const doc = changeEvent.fullDocument;

  await withRetry(async () => {
    const response = await context.http.post({
      url: "https://api.external.com/events",
      body: JSON.stringify({ event: "order_created", data: doc }),
      headers: { "Content-Type": ["application/json"] }
    });
    if (response.statusCode >= 500) {
      throw new Error(`External API returned ${response.statusCode}`);
    }
  }, 3);
};
```

## Dead-Letter Queue Pattern

Maintain a dead-letter collection for events that fail all retry attempts:

```javascript
async function processToDLQ(changeEvent, error) {
  const db = context.services.get("mongodb-atlas").db("system");
  await db.collection("failed_trigger_events").insertOne({
    collection: changeEvent.ns.coll,
    operationType: changeEvent.operationType,
    documentKey: changeEvent.documentKey,
    rawEvent: changeEvent,
    errorMessage: error.message,
    errorStack: error.stack,
    failedAt: new Date(),
    retryCount: 0,
    resolved: false
  });
}
```

## Alerting on Trigger Failures

Create an Atlas alert on trigger failure count:

1. Atlas UI - Project Settings - Alerts
2. Add Alert - App Services - Number of trigger errors
3. Set threshold (e.g., more than 5 errors in 15 minutes)
4. Configure notification channel (email, PagerDuty, Slack webhook)

## Viewing Trigger Logs

```bash
# Via App Services CLI
appservices logs list --app <app-id> --errors

# Via Admin API - filter for trigger errors
curl -H "Authorization: Bearer <token>" \
  "https://services.cloud.mongodb.com/api/admin/v3.0/groups/<project-id>/apps/<app-id>/logs?type=TRIGGER_FAILURE"
```

## Summary

Atlas trigger error handling involves enabling event ordering for sequential guarantees, wrapping function code in try-catch, writing failed events to a dead-letter collection, and implementing retries for transient failures. For ordered triggers, choose whether to re-throw errors (pausing the trigger for manual intervention) or swallow them (allowing processing to continue at the risk of skipped events).
