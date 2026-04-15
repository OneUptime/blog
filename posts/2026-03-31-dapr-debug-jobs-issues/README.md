# How to Debug Dapr Jobs Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Job, Debug, Troubleshooting, Scheduler

Description: Learn how to debug common Dapr Jobs issues including jobs not triggering, scheduler connectivity problems, and handler endpoint errors.

---

Dapr Jobs issues typically fall into three categories: jobs not being created, jobs not triggering, and job handler errors. This guide covers systematic debugging approaches for each scenario.

## Enabling Debug Logging

First, enable verbose logging on the Dapr sidecar to see job-related activity:

```bash
# Self-hosted: add --log-level debug flag
dapr run --app-id my-app --app-port 6001 --log-level debug -- node app.js
```

In Kubernetes, add the log level annotation:

```yaml
annotations:
  dapr.io/log-level: "debug"
  dapr.io/enable-api-logging: "true"
```

## Debugging: Job Not Created

Check if the job creation request is reaching the Dapr sidecar:

```bash
# Test job creation with verbose curl output
curl -v -X POST http://localhost:3500/v1.0-alpha1/jobs/test-job \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 1m",
    "data": "{\"value\":\"test\"}"
  }'
```

Common error responses:

```json
// Scheduler not available
{"errorCode": "DAPR_SCHEDULER_SCHEDULE_JOB", "message": "failed to schedule job"}

// Invalid schedule expression
{"errorCode": "ERR_MALFORMED_REQUEST", "message": "invalid schedule format"}
```

Check Scheduler connectivity:

```bash
# Kubernetes: check scheduler pod status
kubectl get pods -n dapr-system | grep scheduler
kubectl logs -n dapr-system dapr-scheduler-server-0 --tail=30
```

## Debugging: Job Not Triggering

Verify the job was created correctly:

```bash
curl http://localhost:3500/v1.0-alpha1/jobs/test-job
```

Check that the app is running with the correct app-id and port:

```bash
dapr list
```

Verify your handler endpoint is reachable. Dapr calls `POST /job/{job-name}` on your app:

```bash
# Manually test your handler endpoint
curl -X POST http://localhost:6001/job/test-job \
  -H "Content-Type: application/json" \
  -d '{"data": "{\"value\":\"test\"}"}'
```

## Debugging: Handler Returning Non-200 Status

Check the Dapr sidecar logs to see handler call attempts:

```bash
# Kubernetes
kubectl logs <your-pod-name> -c daprd --tail=50

# Self-hosted: check stdout from dapr run
```

Look for entries like:

```text
level=error msg="error invoking app" error="POST http://localhost:6001/job/test-job returned 500"
```

Add comprehensive error handling in your handler:

```javascript
app.post('/job/:jobName', async (req, res) => {
  const jobName = req.params.jobName;
  console.log(`Job triggered: ${jobName}`, JSON.stringify(req.body));

  try {
    await handleJob(jobName, req.body);
    console.log(`Job ${jobName} completed successfully`);
    res.status(200).send('OK');
  } catch (err) {
    // Log full error details
    console.error(`Job ${jobName} failed:`, err.stack);
    // Return 500 to signal failure to Dapr
    res.status(500).json({ error: err.message });
  }
});
```

## Debugging: Scheduler Service Issues

Check etcd health within the Scheduler StatefulSet:

```bash
# Exec into scheduler pod
kubectl exec -it dapr-scheduler-server-0 -n dapr-system -- sh

# Check etcd cluster health (uses embedded etcd)
ps aux | grep etcd
```

Check persistent volume status:

```bash
kubectl get pvc -n dapr-system
kubectl describe pvc dapr-scheduler-data-dir-dapr-scheduler-server-0 -n dapr-system
```

## Using the Dapr Dashboard

The Dapr Dashboard provides a UI for inspecting components and app status:

```bash
dapr dashboard
```

Navigate to `http://localhost:8080` and check the Apps section to verify your service registration.

## Summary

Debugging Dapr Jobs requires checking three layers: job creation (sidecar-to-scheduler connectivity), job triggering (scheduler-to-sidecar communication), and handler execution (sidecar-to-app invocation). Enabling debug logging and testing each layer independently isolates issues quickly.
