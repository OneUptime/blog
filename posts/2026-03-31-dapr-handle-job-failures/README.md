# How to Handle Job Failures in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Error Handling, Resiliency, Retry

Description: Learn how to handle job failures in Dapr, including retry strategies, dead-letter patterns, and alerting when scheduled jobs fail in microservices.

---

Dapr Jobs has basic built-in retry logic - by default, if your handler returns a non-200 response, the job retries up to 3 times with a 1-second delay. You can customize this with the `failure_policy` field (using `constant` for configurable retries or `drop` to skip retries entirely). However, the built-in retry is limited, so implementing your own complementary retry and failure handling strategies is important for reliable job execution.

## Understanding Dapr Jobs Failure Behavior

When a job triggers and your handler returns a non-200 status:
- The job failure is logged by the Dapr sidecar
- By default, the job **retries up to 3 times** with a 1-second delay between attempts
- You can configure a `failure_policy` on the job: `constant` allows custom `max_retries` and `interval`, while `drop` disables retries entirely
- The next scheduled execution proceeds as normal regardless of failure
- There is no built-in dead-letter mechanism

While the built-in retries handle simple transient failures, your handler should still be resilient and implement additional retry logic for more complex failure scenarios.

## Implementing Retry Logic in Job Handlers

Build retry logic directly into your handler:

```javascript
const express = require('express');
const app = express();
app.use(express.json());

async function withRetry(fn, maxRetries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxRetries) {
        throw err;
      }
      console.warn(`Attempt ${attempt} failed, retrying in ${delayMs}ms:`, err.message);
      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }
}

app.post('/job/sync-external-data', async (req, res) => {
  try {
    await withRetry(async () => {
      const data = await fetchExternalAPI();
      await saveToDatabase(data);
    }, 3, 500);

    res.status(200).send('OK');
  } catch (err) {
    console.error('Job failed after all retries:', err.message);
    await notifyFailure('sync-external-data', err.message);
    // Return 200 to prevent false alarms in Dapr logs
    // but record the failure internally
    res.status(200).send('Handled failure');
  }
});

app.listen(6001);
```

## Dead-Letter Pattern with Dapr Pub/Sub

When a job repeatedly fails, route it to a dead-letter topic:

```python
import requests
from flask import Flask, request, jsonify
import json

app = Flask(__name__)
DAPR_URL = "http://localhost:3500"

def publish_to_dead_letter(job_name: str, payload: dict, error: str):
    requests.post(
        f"{DAPR_URL}/v1.0/publish/pubsub/job-dead-letters",
        json={
            "jobName": job_name,
            "originalPayload": payload,
            "error": error,
            "failedAt": __import__('datetime').datetime.utcnow().isoformat()
        }
    )

@app.route('/job/process-invoices', methods=['POST'])
def process_invoices():
    payload = request.get_json()

    try:
        result = run_invoice_processing(payload)
        return jsonify(result), 200
    except TransientError as e:
        # Transient: log and hope next run succeeds
        print(f"Transient error processing invoices: {e}")
        return jsonify({"error": str(e)}), 500
    except PermanentError as e:
        # Permanent: send to dead letter for manual review
        publish_to_dead_letter("process-invoices", payload, str(e))
        print(f"Permanent failure, sent to dead letter: {e}")
        return jsonify({"error": str(e), "deadLettered": True}), 200
```

## Handling Dead-Letter Jobs

Subscribe to the dead-letter topic for manual intervention:

```python
@app.route('/dapr/subscribe', methods=['GET'])
def subscribe():
    return jsonify([{
        "pubsubname": "pubsub",
        "topic": "job-dead-letters",
        "route": "/dead-letters"
    }])

@app.route('/dead-letters', methods=['POST'])
def handle_dead_letter():
    event = request.get_json()
    data = event.get('data', {})

    # Alert operations team
    send_slack_alert(
        f"Job dead-lettered: {data['jobName']}\n"
        f"Error: {data['error']}\n"
        f"Failed at: {data['failedAt']}"
    )

    # Store for manual replay
    requests.post(
        f"{DAPR_URL}/v1.0/state/statestore",
        json=[{
            "key": f"dead-letter:{data['jobName']}:{data['failedAt']}",
            "value": data
        }]
    )

    return jsonify({"status": "SUCCESS"}), 200
```

## Idempotent Job Handlers

Make handlers idempotent to safely handle duplicate executions:

```go
func handleDailyReport(ctx context.Context, job *common.JobEvent) error {
    today := time.Now().UTC().Format("2006-01-02")
    lockKey := fmt.Sprintf("job-lock:daily-report:%s", today)

    // Check if already ran today
    existing, _ := daprClient.GetState(ctx, "statestore", lockKey, nil)
    if existing.Value != nil {
        log.Printf("Daily report already generated for %s, skipping", today)
        return nil
    }

    // Acquire lock
    daprClient.SaveState(ctx, "statestore", lockKey,
        []byte("running"), nil)

    if err := generateDailyReport(); err != nil {
        daprClient.DeleteState(ctx, "statestore", lockKey, nil)
        return err
    }

    // Mark complete
    daprClient.SaveState(ctx, "statestore", lockKey,
        []byte("complete"), nil)
    return nil
}
```

## Summary

Dapr Jobs provides basic built-in retry behavior (3 retries by default, configurable via `failure_policy`), but robust production systems benefit from additional failure handling within your job handlers. Combining the built-in retries with handler-level retries, dead-letter patterns via Pub/Sub, and idempotent execution guards provides a comprehensive strategy for reliable job execution.
