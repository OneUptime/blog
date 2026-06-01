# How to Debug a Failed Container Instance Using Log Streaming and Events

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Instances, Debugging, Log Streaming, Troubleshooting, Container, DevOps

Description: A practical guide to debugging failed Azure Container Instances using container logs, event streams, exec commands, and diagnostic techniques.

---

Your container instance just failed. Maybe it is stuck in a restart loop, maybe it never started, or maybe it was running fine and suddenly died. Azure Container Instances provides several debugging tools to help you figure out what went wrong. The trick is knowing which tool to use and in what order.

This post walks through a systematic approach to debugging failed ACI containers, covering logs, events, exec access, and common failure patterns.

## The Debugging Workflow

When a container fails, follow this order:

1. Check the container group state and events
2. Read the container logs
3. Check resource usage (CPU, memory)
4. If the container is still running, exec into it
5. If the container never started, check the image and configuration

Let us go through each step.

## Step 1: Check Container Group State and Events

The first thing to check is the overall state of the container group and the events that have occurred:

```bash
# Get the container group state and container states

az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "{
        groupState: instanceView.state,
        containers: containers[].{
            name: name,
            state: instanceView.currentState.state,
            exitCode: instanceView.currentState.exitCode,
            startTime: instanceView.currentState.startTime,
            finishTime: instanceView.currentState.finishTime,
            restartCount: instanceView.restartCount
        }
    }" \
    --output json
```

The state tells you where things stand:

- **Running** - Container is active
- **Waiting** - Container is waiting to start (could be pulling image)
- **Terminated** - Container has stopped (check the exit code)

## Step 2: Read Container Events

Events provide a timeline of what happened to your container:

```bash
# View all events for a specific container
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "containers[0].instanceView.events[]" \
    --output table
```

Events include things like:

- **Pulling** - Image pull started
- **Pulled** - Image pull completed
- **Created** - Container created
- **Started** - Container started
- **Killing** - Container is being killed
- **BackOff** - Container restart is being delayed (crash loop)

Also check group-level events:

```bash
# View container group-level events
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "instanceView.events[]" \
    --output table
```

## Step 3: Read Container Logs

Container logs capture everything written to stdout and stderr. This is usually where you find the actual error message:

```bash
# View current container logs
az container logs \
    --resource-group my-resource-group \
    --name my-container

# If the container group has multiple containers, specify which one
az container logs \
    --resource-group my-resource-group \
    --name my-container \
    --container-name web-app
```

For crash-looping containers, check the logs as soon as the container exits and also review the container events and `previousState` field from `az container show`. Unlike Kubernetes, `az container logs` for ACI does not provide a `--previous` flag.

## Step 4: Stream Logs in Real Time

For containers that are still running (or crash-looping), live log streaming helps you see what is happening as it happens:

```bash
# Stream logs in real time
az container attach \
    --resource-group my-resource-group \
    --name my-container

# Or use the logs command with follow
az container logs \
    --resource-group my-resource-group \
    --name my-container \
    --follow
```

The `attach` command connects to the container's stdout and stderr streams. You see output as it is produced. Press Ctrl+C to disconnect (this does not stop the container).

## Step 5: Execute Commands Inside the Container

If the container is running (even if it is misbehaving), you can exec into it to investigate:

```bash
# Open an interactive shell in the container
az container exec \
    --resource-group my-resource-group \
    --name my-container \
    --container-name web-app \
    --exec-command /bin/sh

# Then run diagnostic commands inside the shell
cat /var/log/app/error.log
env
nslookup mydb.database.windows.net
df -h
ps aux
```

Note that exec only works if the process you run exists in the container. For interactive troubleshooting, the container needs a shell binary (`/bin/sh` or `/bin/bash`). Some minimal images (like distroless) do not include a shell, which means you cannot open a shell in them. ACI also supports launching a single process with `az container exec`, so run commands with arguments from the interactive shell rather than passing compound shell commands directly to `--exec-command`.

## Common Failure Patterns

### Pattern 1: Image Pull Failure

**Symptoms:** Container stays in "Waiting" state. Events show "Failed to pull image."

**Common causes:**
- Wrong image name or tag
- Missing registry credentials
- Private registry not accessible from Azure
- Rate limiting (Docker Hub)

**How to debug:**

```bash
# Check for pull errors in events
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "containers[0].instanceView.events[?contains(message, 'pull')]" \
    --output table
```

**Fixes:**
- Verify the image name: `az acr repository show-tags --name myregistry --repository myapp`
- Check registry credentials are correct
- If using Docker Hub, authenticate to avoid rate limits

### Pattern 2: Container Crashes on Startup

**Symptoms:** Container enters a crash loop. Restart count keeps increasing. The state alternates between "Running" and "Terminated."

**How to debug:**

```bash
# Check the exit code
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "containers[0].instanceView.currentState.exitCode"

# Read the current logs
az container logs \
    --resource-group my-resource-group \
    --name my-container
```

Common exit codes:

- Exit code **1** - Application error. Check the logs for the error message.
- Exit code **137** - OOM killed. The container ran out of memory.
- Exit code **139** - Segfault. Usually a bug in native code.

**Fixes:**
- For exit code 1: Fix the application error shown in the logs
- For exit code 137: Increase the memory allocation
- For exit code 139: Debug the native code issue

### Pattern 3: Container Starts but Does Not Respond

**Symptoms:** Container state shows "Running" but HTTP requests fail or time out.

**How to debug:**

```bash
# Open a shell first
az container exec \
    --resource-group my-resource-group \
    --name my-container \
    --exec-command /bin/sh

# Then check from inside the container
netstat -tlnp
ss -tlnp
curl -v localhost:8080
```

**Common causes:**
- Application listening on wrong port (e.g., listening on 3000 but port 8080 is exposed)
- Application binding to 127.0.0.1 instead of 0.0.0.0
- Application stuck during initialization (waiting for a dependency)

### Pattern 4: Out of Memory

**Symptoms:** Container exits with code 137. Restart count increasing.

**How to debug:**

```bash
# Check memory metrics
az monitor metrics list \
    --resource "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerInstance/containerGroups/{name}" \
    --metric "MemoryUsage" \
    --interval PT1M \
    --output table
```

Azure Monitor metrics for Azure Container Instances are currently in preview and are only available for Linux containers.

If memory usage climbs steadily until the container is killed, you have a memory leak. If it spikes suddenly, a specific operation is consuming too much memory.

**Fixes:**
- Increase the memory allocation
- Fix the memory leak in your application
- Add memory limits to prevent unbounded growth

### Pattern 5: Dependency Failure

**Symptoms:** Container starts but logs show connection errors to databases, APIs, or other services.

**How to debug:**

```bash
# Open a shell first
az container exec \
    --resource-group my-resource-group \
    --name my-container \
    --exec-command /bin/sh

# Then test from inside the container
nslookup mydb.database.windows.net
nc -zv mydb.database.windows.net 1433
```

**Common causes:**
- Firewall rules blocking the container's IP
- VNet configuration issues (if using VNet deployment)
- Wrong connection string or hostname
- Dependency service is down

## Using Azure Monitor for Deeper Analysis

For ongoing monitoring, set up Azure Monitor alerts on supported metrics such as memory usage:

```bash
# Create an alert for high memory usage
az monitor metrics alert create \
    --resource-group my-resource-group \
    --name "Container Memory Alert" \
    --scopes "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.ContainerInstance/containerGroups/{name}" \
    --condition "avg MemoryUsage > 1073741824" \
    --window-size 15m \
    --evaluation-frequency 5m \
    --action "/subscriptions/{sub}/resourceGroups/{rg}/providers/Microsoft.Insights/actionGroups/{ag}"
```

## Quick Reference Debugging Commands

Here is a cheat sheet of the most useful debugging commands:

```bash
# Overall status
az container show -g $RG -n $NAME --output table

# Container events
az container show -g $RG -n $NAME --query "containers[0].instanceView.events[]" -o table

# Current logs
az container logs -g $RG -n $NAME

# Live log streaming
az container attach -g $RG -n $NAME

# Interactive shell
az container exec -g $RG -n $NAME --exec-command /bin/sh

# Exit code
az container show -g $RG -n $NAME --query "containers[0].instanceView.currentState.exitCode"

# Restart count
az container show -g $RG -n $NAME --query "containers[0].instanceView.restartCount"
```

## Summary

Debugging failed containers in ACI follows a predictable pattern: check the state, read the events, examine the logs, and exec in if needed. Most failures fall into a handful of categories - image pull issues, application crashes, resource exhaustion, or dependency failures. The tools ACI provides are sufficient for most debugging scenarios. The key is starting with the broad picture (group state and events) and narrowing down to the specific failure (logs and exec).
