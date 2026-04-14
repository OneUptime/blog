# How to Monitor Dapr Job Execution

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Monitoring, Observability, Prometheus

Description: Learn how to monitor Dapr job execution using metrics, logging, distributed tracing, and Dapr State to track job success rates and execution history.

---

Monitoring job execution is critical for ensuring scheduled tasks run reliably and on time. Dapr provides observability through metrics, logs, and distributed tracing that you can leverage to build comprehensive job monitoring.

## Built-in Dapr Metrics for Jobs

Dapr exposes Prometheus metrics for job-related activity. Enable metrics collection:

```yaml
# dapr-config.yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  metrics:
    enabled: true
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

Key job metrics exposed by Dapr sidecar:

```text
dapr_http_server_request_count{app_id, method, path, status}
dapr_http_server_latency{app_id, method, path}
```

For job-specific metrics, instrument your handler:

```python
from prometheus_client import Counter, Histogram, start_http_server
import time

JOB_RUNS = Counter('job_runs_total', 'Total job runs', ['job_name', 'status'])
JOB_DURATION = Histogram('job_duration_seconds', 'Job execution duration', ['job_name'])

start_http_server(9090)  # expose metrics

@app.route('/job/<job_name>', methods=['POST'])
def handle_job(job_name):
    start = time.time()
    try:
        execute_job(job_name, request.get_json())
        JOB_RUNS.labels(job_name=job_name, status='success').inc()
        return '', 200
    except Exception as e:
        JOB_RUNS.labels(job_name=job_name, status='failure').inc()
        return str(e), 500
    finally:
        JOB_DURATION.labels(job_name=job_name).observe(time.time() - start)
```

## Storing Execution History in Dapr State

Track execution history for auditing and dashboards:

```javascript
const DAPR_URL = 'http://localhost:3500';

async function recordJobExecution(jobName, status, details) {
  const timestamp = new Date().toISOString();
  const runId = `${jobName}-${Date.now()}`;

  // Store latest run
  await fetch(`${DAPR_URL}/v1.0/state/statestore`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([
      {
        key: `job:${jobName}:latest`,
        value: { status, timestamp, details, runId }
      },
      {
        key: `job:${jobName}:run:${runId}`,
        value: { status, timestamp, details }
      }
    ])
  });
}

app.post('/job/:jobName', async (req, res) => {
  const { jobName } = req.params;
  const startTime = Date.now();

  try {
    await processJob(jobName, req.body);
    const duration = Date.now() - startTime;

    await recordJobExecution(jobName, 'success', { durationMs: duration });
    res.status(200).send('OK');
  } catch (err) {
    await recordJobExecution(jobName, 'failure', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});
```

## Distributed Tracing for Job Execution

Dapr automatically propagates trace context when invoking job handlers. Configure Zipkin or Jaeger to capture job traces:

```bash
# Run Zipkin locally
docker run -d -p 9411:9411 openzipkin/zipkin

# Configure Dapr to use it
dapr run --app-id my-scheduler --config dapr-config.yaml -- node app.js
```

Job handler traces appear in Zipkin under the `my-scheduler` service with path `/job/{job-name}`.

## Alerting on Job Failures via Pub/Sub

Publish failure events for downstream alerting:

```go
func handleJob(ctx context.Context, job *common.JobEvent) error {
    start := time.Now()
    err := executeJobLogic(job)
    duration := time.Since(start)

    event := map[string]interface{}{
        "jobName":    job.Name,
        "duration":   duration.Milliseconds(),
        "successful": err == nil,
        "timestamp":  time.Now().UTC().Format(time.RFC3339),
    }

    if err != nil {
        event["error"] = err.Error()
        // Publish failure for alerting
        client.PublishEvent(ctx, "pubsub", "job-failures", event)
        return err
    }

    // Publish success metrics
    client.PublishEvent(ctx, "pubsub", "job-completions", event)
    return nil
}
```

## Grafana Dashboard for Job Monitoring

Set up a Prometheus scrape config to pull Dapr metrics:

```yaml
scrape_configs:
  - job_name: 'dapr-apps'
    static_configs:
      - targets: ['my-app:9090']
    metrics_path: '/metrics'
```

Query for job success rate in Grafana:

```text
rate(job_runs_total{status="success"}[5m]) /
rate(job_runs_total[5m])
```

## Summary

Monitoring Dapr job execution combines Prometheus metrics for real-time observability, Dapr State for execution history, distributed tracing for end-to-end visibility, and Pub/Sub for alerting on failures. This multi-layered approach ensures you have complete visibility into all scheduled job activity.
