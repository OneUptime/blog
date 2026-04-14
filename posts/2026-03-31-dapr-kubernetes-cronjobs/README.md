# How to Use Dapr with Kubernetes CronJobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Kubernetes, CronJob, Scheduled Task, Batch Processing

Description: Run scheduled Dapr-enabled jobs using Kubernetes CronJobs to perform periodic tasks like data cleanup, report generation, and pub/sub message publishing.

---

## Overview

Kubernetes CronJobs can run Dapr-enabled containers on a schedule. Each job invocation starts a pod with the Dapr sidecar injected, allowing it to use Dapr APIs for state management, pub/sub publishing, and service invocation before completing.

## Basic Dapr-Enabled CronJob

Create a CronJob that publishes a scheduled event via Dapr pub/sub:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: daily-report-publisher
  namespace: default
spec:
  schedule: "0 9 * * *"
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            dapr.io/enabled: "true"
            dapr.io/app-id: "report-publisher"
            dapr.io/app-port: "3000"
        spec:
          restartPolicy: OnFailure
          containers:
          - name: report-publisher
            image: myregistry/report-publisher:latest
            env:
            - name: DAPR_HTTP_ENDPOINT
              value: "http://localhost:3500"
```

## Publishing Events from a CronJob

The CronJob container publishes a message and then exits cleanly:

```javascript
const { DaprClient } = require('@dapr/dapr');

async function waitForSidecar() {
  while (true) {
    try {
      const res = await fetch('http://localhost:3500/v1.0/healthz');
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 1000));
  }
}

async function main() {
  const client = new DaprClient();

  // Wait for Dapr sidecar to be ready
  await waitForSidecar();

  const report = {
    date: new Date().toISOString(),
    type: 'daily-summary',
    generatedAt: Date.now()
  };

  await client.pubsub.publish('pubsub', 'reports', report);
  console.log('Report published:', report.date);

  await client.stop();
  process.exit(0);
}

main().catch(err => {
  console.error('Job failed:', err);
  process.exit(1);
});
```

## Waiting for Dapr Sidecar Readiness

CronJob pods must wait for the Dapr sidecar to start before using Dapr APIs. Use the Dapr health endpoint:

```bash
#!/bin/bash
# wait-for-dapr.sh
until curl -sf http://localhost:3500/v1.0/healthz; do
  echo "Waiting for Dapr sidecar..."
  sleep 1
done
echo "Dapr is ready"
exec "$@"
```

Use it as an entrypoint wrapper in your container image.

## Graceful Sidecar Shutdown

Dapr's sidecar must be shut down cleanly when the job completes. Call the shutdown API explicitly before the process exits:

```javascript
async function shutdownSidecar() {
  await fetch('http://localhost:3500/v1.0/shutdown', { method: 'POST' });
}

// Call explicitly before process.exit() — do not rely on beforeExit,
// as it does not fire when process.exit() is called.
await shutdownSidecar();
process.exit(0);
```

## CronJob with Concurrency Policy

Prevent overlapping job runs for long-running tasks:

```yaml
spec:
  schedule: "*/5 * * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      activeDeadlineSeconds: 240
      template:
        metadata:
          annotations:
            dapr.io/enabled: "true"
            dapr.io/app-id: "cleanup-job"
```

## Monitoring CronJob Execution

Check job history and logs:

```bash
kubectl get cronjobs
kubectl get jobs --sort-by=.metadata.creationTimestamp
kubectl logs job/daily-report-publisher-12345 -c report-publisher
kubectl logs job/daily-report-publisher-12345 -c daprd
```

## Summary

Kubernetes CronJobs work well with Dapr when you account for sidecar startup timing and graceful shutdown. Always wait for the Dapr sidecar health endpoint before making API calls, and explicitly shut down the sidecar via the shutdown API before the job pod exits. This prevents the pod from entering a crash loop due to the sidecar not terminating cleanly.
