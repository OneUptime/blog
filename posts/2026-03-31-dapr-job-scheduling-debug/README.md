# How to Debug Dapr Job Scheduling Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Scheduler, Job, Debugging, Kubernetes

Description: Debug Dapr job scheduling issues including incorrect cron expressions, missed triggers, failed callbacks, and jobs stuck in pending state using logs and API tools.

---

## Common Job Scheduling Problems

Job scheduling issues in Dapr typically fall into these categories:

1. Jobs not being accepted (creation fails)
2. Jobs created but never triggering
3. Jobs triggering but callbacks failing
4. Jobs triggering at wrong times

## Debugging Job Creation Failures

If a job creation request returns an error, check the response body and sidecar logs:

```bash
# Create a job with verbose output
curl -v -X POST http://localhost:3500/v1.0-alpha1/jobs/debug-job \
  -H "Content-Type: application/json" \
  -d '{
    "schedule": "@every 5m",
    "data": {
      "message": "test"
    }
  }'

# Check sidecar logs for errors
kubectl logs <pod-name> -c daprd | grep -i "job\|scheduler\|error" | tail -30
```

## Validating Cron Expressions

Dapr supports both cron expressions and duration formats. Invalid expressions cause silent failures:

```bash
# Valid formats:
# "@every 5m"              - every 5 minutes
# "0 0 */2 * * *"         - every 2 hours (6-field cron: seconds minutes hours day month weekday)
# "@daily"                 - once per day
# Use "dueTime" field with "2026-03-31T15:00:00Z" for one-time scheduling

# Dapr uses 6-field cron (with seconds): seconds minutes hours day-of-month month day-of-week
# Test cron expression validity online or with:
python3 -c "from croniter import croniter; print(croniter.is_valid('0 */2 * * * *'))"
```

## Checking Job Status via API

```bash
# Get job details
curl http://localhost:3500/v1.0-alpha1/jobs/my-job | python3 -m json.tool
```

Response includes schedule, repeats, and data payload.

## Tracing Job Trigger Events

Enable Dapr distributed tracing to trace job trigger paths:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: tracing-config
spec:
  tracing:
    samplingRate: "1"
    zipkin:
      endpointAddress: http://zipkin:9411/api/v2/spans
```

Then filter traces by operation name `JobTrigger` in your tracing backend.

## Debugging Callback Handler Issues

If jobs trigger but your app returns errors, check the handler:

```javascript
app.post('/job/my-job', express.json(), async (req, res) => {
  try {
    console.log('Job payload:', JSON.stringify(req.body));
    await doWork(req.body);
    res.sendStatus(200); // Must return 200 for success
  } catch (err) {
    console.error('Job handler error:', err);
    res.sendStatus(500); // Dapr will retry on non-200
  }
});
```

## Checking for Clock Skew

Jobs may trigger late if there is significant clock skew between the Scheduler and app pods:

```bash
# Check time on scheduler pods
kubectl exec -n dapr-system dapr-scheduler-server-0 -- date

# Check time on app pod
kubectl exec -n default <app-pod> -- date
```

## Summary

Debug Dapr job scheduling issues by validating cron expressions, checking sidecar logs for creation errors, inspecting job status via the API, and tracing trigger paths. Ensure callback handlers return HTTP 200 on success and check for clock skew between the Scheduler pod and application pods when jobs trigger at unexpected times.
