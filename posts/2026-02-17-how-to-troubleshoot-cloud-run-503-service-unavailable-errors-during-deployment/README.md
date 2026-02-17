# How to Troubleshoot Cloud Run 503 Service Unavailable Errors During Deployment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Run, Troubleshooting, 503 Errors, Deployment, Google Cloud

Description: Learn how to diagnose and fix Cloud Run 503 Service Unavailable errors that occur during deployment, including common causes and step-by-step solutions.

---

You deploy a new revision to Cloud Run, and instead of your application responding, you get 503 Service Unavailable errors. The old version was working fine. The new one refuses to start, or starts but immediately becomes unhealthy. This is one of the most common Cloud Run issues, and it can be deeply frustrating because the error message tells you almost nothing about the root cause.

This guide covers the systematic approach to diagnosing 503 errors during deployment, the most common causes, and how to fix each one.

## What a 503 Means on Cloud Run

A 503 from Cloud Run means the platform cannot route your request to a healthy container instance. This happens when:

1. The new revision's container fails to start
2. The container starts but does not begin listening on the expected port in time
3. The container crashes immediately after starting
4. All instances are overloaded and cannot accept new requests
5. The container's health probes are failing

During deployment, causes 1-3 are the most common. The new revision cannot start properly, so Cloud Run has no healthy instances to send traffic to.

## Step 1: Check the Revision Status

Start by looking at the revision that is failing:

```bash
# List recent revisions and their status
gcloud run revisions list --service=my-service \
  --region=us-central1 \
  --format="table(name, status.conditions[0].type, status.conditions[0].status, status.conditions[0].message)" \
  --limit=5
```

If the revision shows `Ready: False`, the condition message will give you a clue. Common messages include:

- "Revision failed to become ready" - Generic failure, need to dig deeper into logs
- "Container failed to start" - The container could not initialize
- "Resource limits exceeded" - Out of memory during startup

## Step 2: Check the Logs

The logs are where the real information is. Check both system logs and application logs:

```bash
# Get the failing revision name
FAILING_REV=$(gcloud run revisions list --service=my-service \
  --region=us-central1 \
  --format="value(name)" \
  --limit=1)

# Check system logs for the failing revision
gcloud logging read "
  resource.type=\"cloud_run_revision\"
  AND resource.labels.service_name=\"my-service\"
  AND resource.labels.revision_name=\"${FAILING_REV}\"
  AND severity>=WARNING
" --limit=20 --format="table(timestamp, severity, textPayload)"
```

```bash
# Check application stdout/stderr logs
gcloud logging read "
  resource.type=\"cloud_run_revision\"
  AND resource.labels.service_name=\"my-service\"
  AND resource.labels.revision_name=\"${FAILING_REV}\"
  AND (logName:\"stdout\" OR logName:\"stderr\")
" --limit=30 --format="table(timestamp, textPayload)"
```

## Common Cause 1: Container Not Listening on the Right Port

This is the number one cause of 503 errors during deployment. Cloud Run expects your container to listen on the port specified by the `PORT` environment variable (default 8080).

**Symptoms:**
- Log message: "Container failed to start. Failed to start and then listen on the port defined by the PORT environment variable."
- The container starts but Cloud Run never sees it as ready

**Fix:**

Make sure your application reads the PORT environment variable:

```python
# Python - read PORT from environment
import os
port = int(os.environ.get("PORT", 8080))
app.run(host="0.0.0.0", port=port)
```

```javascript
// Node.js - read PORT from environment
const port = process.env.PORT || 8080;
app.listen(port, "0.0.0.0");
```

```go
// Go - read PORT from environment
port := os.Getenv("PORT")
if port == "" {
    port = "8080"
}
http.ListenAndServe(":"+port, nil)
```

Common mistakes:
- Listening on `localhost` or `127.0.0.1` instead of `0.0.0.0`
- Hardcoding a port that differs from what Cloud Run expects
- Starting a background process that does not listen on any port

## Common Cause 2: Container Crashes During Startup

The container starts but the application crashes before it can listen for requests.

**Symptoms:**
- Log messages showing exceptions, panics, or errors
- "Container called exit(1)" or similar exit code messages

**Fix:**

Check the application logs for the specific error:

```bash
# Look for crash logs
gcloud logging read "
  resource.type=\"cloud_run_revision\"
  AND resource.labels.service_name=\"my-service\"
  AND resource.labels.revision_name=\"${FAILING_REV}\"
  AND severity>=ERROR
" --limit=20 --format="json"
```

Common crash causes:
- Missing environment variables that the app requires at startup
- Database connection failures (wrong credentials, network issues)
- Missing files or directories that the app expects
- Dependency version conflicts

To test locally with the same environment:

```bash
# Run the container locally with the same environment
docker run -p 8080:8080 \
  -e PORT=8080 \
  -e DATABASE_URL="your-connection-string" \
  -e API_KEY="your-key" \
  us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-app:latest
```

## Common Cause 3: Out of Memory (OOM)

The container exceeds its memory limit during startup and gets killed.

**Symptoms:**
- Container exit code 137
- Log messages mentioning "killed" or "OOM"
- Service works locally but fails on Cloud Run

**Fix:**

Increase the memory limit:

```bash
# Increase memory allocation
gcloud run services update my-service \
  --region=us-central1 \
  --memory=1Gi
```

Check your application's memory usage during startup. Applications that load large ML models, precompute caches, or initialize large data structures can easily exceed 512 MiB during startup.

## Common Cause 4: Startup Timeout

The container takes too long to start listening on the port. The default startup timeout is 300 seconds.

**Symptoms:**
- Container starts but never becomes ready
- No error in application logs - it is just slow to initialize

**Fix:**

Either optimize your startup time or increase the startup timeout:

```bash
# Enable startup CPU boost for faster initialization
gcloud run services update my-service \
  --region=us-central1 \
  --startup-cpu-boost

# Or increase the startup probe timeout
gcloud run deploy my-service \
  --image=us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-app:latest \
  --region=us-central1 \
  --startup-probe-path=/health \
  --startup-probe-initial-delay=10 \
  --startup-probe-period=5 \
  --startup-probe-failure-threshold=30
```

With the above probe settings, the container has up to 160 seconds (10 + 30*5) to start.

## Common Cause 5: Wrong Architecture

If you built the image on an ARM machine (like an Apple Silicon Mac) without specifying the target platform, the image will not run on Cloud Run (which uses amd64).

**Symptoms:**
- "exec format error" in logs
- Container immediately exits

**Fix:**

Build for the correct architecture:

```bash
# Build for linux/amd64 (Cloud Run's architecture)
docker build --platform linux/amd64 -t my-app .

# Or use Cloud Build which builds on amd64 by default
gcloud builds submit --tag us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-app:latest
```

## Common Cause 6: Health Probe Failures

If you have a startup or liveness probe configured and it fails, Cloud Run marks the instance as unhealthy.

**Symptoms:**
- Container starts and logs show normal initialization
- But requests still get 503
- Probe-related log messages

**Fix:**

Check that the probe endpoint actually works:

```bash
# Test the health endpoint locally
docker run -p 8080:8080 my-app
curl http://localhost:8080/health
```

Make sure the probe path matches what you configured and that the endpoint responds within the timeout.

## Step 3: Rollback While Debugging

While you figure out the issue, rollback to the previous working revision:

```bash
# List revisions to find the last working one
gcloud run revisions list --service=my-service \
  --region=us-central1 \
  --format="table(name, status.conditions[0].status)" \
  --limit=5

# Route traffic back to the working revision
gcloud run services update-traffic my-service \
  --region=us-central1 \
  --to-revisions=my-service-00005-abc=100
```

This immediately stops the 503 errors for your users while you debug the new revision.

## Step 4: Test the New Revision with a Tag

Once you think you have fixed the issue, deploy with a tag so you can test without affecting production:

```bash
# Deploy the fixed version with a tag and no production traffic
gcloud run deploy my-service \
  --image=us-central1-docker.pkg.dev/MY_PROJECT/my-repo/my-app:fixed \
  --region=us-central1 \
  --tag=test \
  --no-traffic
```

Test the tagged URL:

```bash
# Test the new revision via the tagged URL
curl https://test---my-service-xxxxx-uc.a.run.app/health
```

If it works, promote it to production:

```bash
# Route all traffic to the fixed revision
gcloud run services update-traffic my-service \
  --region=us-central1 \
  --to-tags=test=100
```

## Debugging Checklist

When you encounter a 503 during deployment, work through this checklist:

1. Check revision status: Is the revision ready or failed?
2. Check system logs: What does Cloud Run say about the failure?
3. Check application logs: Is the app logging any errors during startup?
4. Verify port binding: Is the app listening on 0.0.0.0:$PORT?
5. Check memory: Is the container running out of memory?
6. Check architecture: Was the image built for linux/amd64?
7. Test locally: Does the container work with `docker run` locally?
8. Check environment: Are all required environment variables and secrets set?
9. Check dependencies: Are all required VPC connections, Cloud SQL proxies, or APIs available?
10. Rollback: Route traffic to the last working revision while debugging

```bash
# Quick diagnostic script - run all checks at once
echo "=== Revision Status ==="
gcloud run revisions list --service=my-service --region=us-central1 --limit=3

echo "=== Error Logs ==="
gcloud logging read "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"my-service\" AND severity>=ERROR" --limit=10 --format="table(timestamp, textPayload)"

echo "=== Service Config ==="
gcloud run services describe my-service --region=us-central1 --format="yaml(spec.template.spec.containers[0].resources, spec.template.spec.containers[0].ports)"
```

## Prevention

To avoid 503 errors during deployment:

- Always test containers locally before deploying
- Use staging environments or revision tags for pre-production testing
- Set up startup probes with generous timeouts
- Monitor deployment success rates
- Use Cloud Build for consistent image builds (avoids architecture mismatches)
- Set appropriate memory and CPU limits based on actual usage

## Summary

503 errors during Cloud Run deployment almost always come down to the container failing to start properly. The fix depends on the root cause: wrong port, crashed application, insufficient memory, slow startup, or wrong architecture. The systematic approach is to check the revision status, read the logs, identify the specific failure, and test the fix with a revision tag before routing production traffic. Always have a rollback plan - routing traffic back to the previous revision takes seconds and immediately restores service for your users.
