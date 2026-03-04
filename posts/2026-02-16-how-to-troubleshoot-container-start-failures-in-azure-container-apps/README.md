# How to Troubleshoot Container Start Failures in Azure Container Apps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Apps, Troubleshooting, Debugging, Docker, DevOps, Containers

Description: A practical troubleshooting guide for diagnosing and fixing container start failures in Azure Container Apps with real examples and solutions.

---

Your container works locally but crashes on Azure Container Apps. The revision shows "failed" and there are no obvious error messages in the portal. This is one of the most frustrating experiences in cloud container development, and it happens more often than you might expect. In this post, I will walk through the most common causes of container start failures and how to systematically diagnose and fix them.

## The Symptom

When a container fails to start in Azure Container Apps, you typically see one of these:

- Revision status shows "Failed" or "Degraded"
- The provisioning state is stuck at "Provisioning"
- Your app returns 502 or 503 errors
- Replicas keep restarting in a crash loop

The first step is always the same: look at the logs.

## Step 1: Check System Logs

System logs capture events from the Container Apps platform itself, including image pull results, container lifecycle events, and health probe failures.

```bash
# View system logs for recent container events
az containerapp logs show \
  --name my-app \
  --resource-group my-rg \
  --type system \
  --follow
```

If you do not see anything useful with the CLI, query Log Analytics directly.

```kusto
// Check system logs for container start events
ContainerAppSystemLogs_CL
| where ContainerAppName_s == "my-app"
| where TimeGenerated > ago(1h)
| order by TimeGenerated desc
| project TimeGenerated, EventSource_s, Type_s, Reason_s, Log_s
```

## Step 2: Check Console Logs

Console logs show the stdout and stderr output from your container. This is where your application's error messages appear.

```bash
# View console logs from the container
az containerapp logs show \
  --name my-app \
  --resource-group my-rg \
  --type console \
  --follow
```

Or through Log Analytics.

```kusto
// View application console output
ContainerAppConsoleLogs_CL
| where ContainerAppName_s == "my-app"
| where TimeGenerated > ago(1h)
| order by TimeGenerated desc
| project TimeGenerated, Log_s, RevisionName_s
```

## Common Failure #1: Image Pull Errors

The most common start failure. The platform cannot pull your container image.

**Symptoms in system logs:**
- "ImagePullBackOff"
- "Failed to pull image"
- "unauthorized: authentication required"

**Common causes and fixes:**

The image tag does not exist. Double-check the tag.

```bash
# Verify the image exists in ACR
az acr repository show-tags \
  --name myregistry \
  --repository my-app \
  --output table
```

The registry credentials are wrong or missing. Update them.

```bash
# Update registry credentials on the container app
az containerapp registry set \
  --name my-app \
  --resource-group my-rg \
  --server myregistry.azurecr.io \
  --username myregistry \
  --password "<acr-password>"
```

For a better approach, use managed identity instead of passwords.

```bash
# Configure managed identity for ACR pull
az containerapp registry set \
  --name my-app \
  --resource-group my-rg \
  --server myregistry.azurecr.io \
  --identity system
```

## Common Failure #2: Wrong Target Port

Your container listens on port 3000 but you configured the target port as 8080. The health probe hits port 8080, gets no response, and the container is killed.

**Symptoms:**
- Container starts, runs briefly, then restarts
- Health probe failures in system logs
- "Readiness probe failed" messages

**Fix:** Match the target port to the port your application actually listens on.

```bash
# Check what port is configured
az containerapp show \
  --name my-app \
  --resource-group my-rg \
  --query "properties.configuration.ingress.targetPort"

# Update to the correct port
az containerapp ingress update \
  --name my-app \
  --resource-group my-rg \
  --target-port 3000
```

Also check your Dockerfile to confirm the exposed port.

```dockerfile
# Make sure EXPOSE matches your application's listen port
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000
CMD ["node", "server.js"]
```

## Common Failure #3: Missing Environment Variables

Your app expects an environment variable like `DATABASE_URL` and crashes when it is not set.

**Symptoms:**
- Container starts, throws an unhandled exception, and exits
- Console logs show errors like "DATABASE_URL is not defined" or "missing required configuration"
- Exit code 1

**Fix:** Add the missing environment variables.

```bash
# Add environment variables
az containerapp update \
  --name my-app \
  --resource-group my-rg \
  --set-env-vars "DATABASE_URL=postgresql://user:pass@host:5432/db" "NODE_ENV=production"

# For sensitive values, use secrets
az containerapp update \
  --name my-app \
  --resource-group my-rg \
  --secrets "db-url=postgresql://user:pass@host:5432/db" \
  --set-env-vars "DATABASE_URL=secretref:db-url"
```

## Common Failure #4: Insufficient Resources

Your container needs more CPU or memory than you allocated.

**Symptoms:**
- Container starts, runs for a few seconds, then gets OOM-killed
- System logs show "OutOfMemory" events
- Container restarts in a loop

**Fix:** Increase the resource allocation.

```bash
# Check current resource allocation
az containerapp show \
  --name my-app \
  --resource-group my-rg \
  --query "properties.template.containers[0].resources"

# Increase CPU and memory
az containerapp update \
  --name my-app \
  --resource-group my-rg \
  --cpu 1.0 \
  --memory 2.0Gi
```

Keep in mind the valid CPU and memory combinations in Azure Container Apps:

| CPU | Memory options |
|-----|---------------|
| 0.25 | 0.5Gi |
| 0.5 | 1.0Gi |
| 0.75 | 1.5Gi |
| 1.0 | 2.0Gi |
| 1.25 | 2.5Gi |
| 1.5 | 3.0Gi |
| 1.75 | 3.5Gi |
| 2.0 | 4.0Gi |

## Common Failure #5: Health Probe Misconfiguration

Health probes check if your container is running correctly. If misconfigured, the platform kills healthy containers.

**Symptoms:**
- Container starts successfully, runs for 10-30 seconds, then restarts
- System logs show "Liveness probe failed" or "Readiness probe failed"
- The app works fine when you test locally

**Fix:** Check that the health probe path returns a 200 response and that the initial delay gives your app enough time to start.

```bash
# Disable custom probes temporarily to confirm the app works
az containerapp update \
  --name my-app \
  --resource-group my-rg \
  --yaml probe-config.yaml
```

```yaml
# probe-config.yaml - Configure probes with generous timeouts
properties:
  template:
    containers:
      - name: my-app
        probes:
          - type: liveness
            httpGet:
              path: /health
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 5
          - type: readiness
            httpGet:
              path: /ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
```

## Common Failure #6: Platform Architecture Mismatch

You built your container image on a Mac with Apple Silicon (ARM64) and deployed it to Azure Container Apps, which runs on AMD64.

**Symptoms:**
- "exec format error" in console logs
- Container immediately exits

**Fix:** Build for the correct architecture.

```bash
# Build for AMD64 architecture explicitly
docker buildx build --platform linux/amd64 -t myregistry.azurecr.io/my-app:v1 .
docker push myregistry.azurecr.io/my-app:v1
```

## Debugging Flowchart

Use this flowchart to systematically diagnose start failures.

```mermaid
graph TD
    A[Container Failed to Start] --> B{Image Pull Error?}
    B -->|Yes| C[Check registry credentials and image tag]
    B -->|No| D{Console logs show errors?}
    D -->|Yes| E{Missing env vars?}
    D -->|No| F{Health probe failing?}
    E -->|Yes| G[Add missing environment variables]
    E -->|No| H{OOM killed?}
    H -->|Yes| I[Increase memory allocation]
    H -->|No| J[Check application code and dependencies]
    F -->|Yes| K[Fix probe path, port, or increase initial delay]
    F -->|No| L[Check architecture mismatch - ARM vs AMD64]
```

## Step 3: Test Locally with the Same Configuration

Before deploying, test your container with the same environment variables and resource constraints you plan to use in Azure.

```bash
# Run the container locally with the same constraints
docker run \
  --memory=1g \
  --cpus=0.5 \
  -p 3000:3000 \
  -e DATABASE_URL="your-connection-string" \
  -e NODE_ENV="production" \
  myregistry.azurecr.io/my-app:v1
```

If it works locally with these constraints but not on Azure, the issue is likely related to networking (cannot reach the database), secrets (different values), or platform-specific behavior.

## Summary

Container start failures in Azure Container Apps usually fall into a handful of categories: image pull errors, port mismatches, missing environment variables, insufficient resources, probe misconfigurations, or architecture mismatches. The diagnostic process is always the same - check system logs for platform events, check console logs for application errors, and work through the possibilities systematically. Most issues can be fixed with a configuration change and a redeployment, without touching your application code.
