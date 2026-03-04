# How to Set Up Container Restart Policies in Azure Container Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Container Instances, Restart Policies, Containers, Reliability, DevOps, Cloud Computing

Description: How to configure restart policies in Azure Container Instances to control container behavior on exit, including Always, OnFailure, and Never options.

---

When a container in Azure Container Instances stops, what should happen next? Should it restart automatically? Should it only restart if it crashed? Or should it stay stopped? The answer depends on your workload, and ACI gives you three restart policies to handle different scenarios.

This post explains each restart policy, when to use them, and how they interact with container exit codes, billing, and multi-container groups.

## The Three Restart Policies

ACI offers three restart policies at the container group level (all containers in the group share the same policy):

### Always

The container restarts no matter why it stopped - whether it exited successfully (exit code 0), crashed (non-zero exit code), or was killed (OOM). This is the default policy.

**Use for:** Long-running services like web servers, APIs, message queue consumers, and any process that should always be running.

### OnFailure

The container restarts only if it exits with a non-zero exit code (indicating an error). If it exits with code 0 (success), it stays stopped.

**Use for:** Batch jobs that might fail and should be retried, but should stop when they complete successfully.

### Never

The container does not restart regardless of how it exits. Once it stops, it stays stopped.

**Use for:** One-shot tasks like database migrations, data exports, or test runs that should execute exactly once.

## Setting the Restart Policy

### Using Azure CLI

```bash
# Deploy with Always restart policy (long-running service)
az container create \
    --resource-group my-resource-group \
    --name web-server \
    --image nginx:latest \
    --cpu 1 \
    --memory 1.5 \
    --restart-policy Always \
    --ports 80 \
    --ip-address Public

# Deploy with OnFailure restart policy (batch job with retry)
az container create \
    --resource-group my-resource-group \
    --name data-processor \
    --image myregistry.azurecr.io/processor:latest \
    --cpu 2 \
    --memory 4 \
    --restart-policy OnFailure

# Deploy with Never restart policy (one-shot task)
az container create \
    --resource-group my-resource-group \
    --name migration-task \
    --image myregistry.azurecr.io/migrate:latest \
    --cpu 1 \
    --memory 2 \
    --restart-policy Never
```

### Using YAML

```yaml
# restart-policy.yaml - Container with explicit restart policy
apiVersion: '2021-09-01'
location: eastus
name: my-service
properties:
  containers:
    - name: app
      properties:
        image: myregistry.azurecr.io/app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        ports:
          - port: 8080
            protocol: TCP
  osType: Linux
  # Set the restart policy for the entire container group
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
      - port: 8080
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

## How Restart Policies Affect Billing

This is important to understand because ACI charges per second of running containers:

- **Always** - Containers are always running, so you are always being billed. Even when the container restarts, the group is considered active.
- **OnFailure** - You are billed while the container is running and during restarts. Once the container exits successfully (code 0), the group stops and billing stops.
- **Never** - You are billed while the container is running. Once it exits (for any reason), billing stops.

The container group continues to exist after the containers stop (for OnFailure and Never policies), but you are not billed for a stopped group. You are only billed for the time the containers are actually running.

```bash
# Check the current state and billing status
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "{state:instanceView.state, containers:containers[].instanceView.currentState}" \
    --output json
```

## Exit Codes and Their Meaning

Understanding exit codes helps you choose the right restart policy and debug issues:

- **0** - Success. The container completed its task normally.
- **1** - General error. The application encountered an error.
- **137** - Killed (SIGKILL). Usually means the container was OOM-killed or forcefully terminated.
- **139** - Segmentation fault (SIGSEGV). The application crashed due to a memory access violation.
- **143** - Terminated (SIGTERM). The container received a graceful shutdown signal.

Check the exit code of a container:

```bash
# View the container's current state and exit code
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "containers[0].instanceView.currentState" \
    --output json

# Example output:
# {
#   "detailStatus": "",
#   "exitCode": 137,
#   "finishTime": "2026-02-16T10:30:00Z",
#   "startTime": "2026-02-16T10:00:00Z",
#   "state": "Terminated"
# }
```

## Practical Examples

### Long-Running Web Server

For a web server that should always be available:

```yaml
# web-server.yaml - Always restart on any exit
apiVersion: '2021-09-01'
location: eastus
name: web-server
properties:
  containers:
    - name: nginx
      properties:
        image: nginx:latest
        resources:
          requests:
            cpu: 0.5
            memoryInGb: 1.0
        ports:
          - port: 80
            protocol: TCP
  osType: Linux
  restartPolicy: Always
  ipAddress:
    type: Public
    ports:
      - port: 80
        protocol: TCP
type: Microsoft.ContainerInstance/containerGroups
```

If Nginx crashes for any reason, ACI immediately restarts it. Users might see a brief interruption, but the service comes back automatically.

### Batch Job with Retry

For a data processing job that should retry on failure:

```yaml
# batch-job.yaml - Retry on failure, stop on success
apiVersion: '2021-09-01'
location: eastus
name: data-processor
properties:
  containers:
    - name: processor
      properties:
        image: myregistry.azurecr.io/data-processor:latest
        resources:
          requests:
            cpu: 2.0
            memoryInGb: 4.0
        environmentVariables:
          - name: INPUT_BLOB
            value: 'https://storage.blob.core.windows.net/data/input.csv'
          - name: OUTPUT_BLOB
            value: 'https://storage.blob.core.windows.net/data/output.csv'
        # Custom command that exits 0 on success, non-zero on failure
        command:
          - python3
          - process_data.py
  osType: Linux
  restartPolicy: OnFailure
type: Microsoft.ContainerInstance/containerGroups
```

If the job fails (maybe the storage account is temporarily unreachable), it restarts and tries again. When it completes successfully, it stops.

### Database Migration

For a one-time migration that should run exactly once:

```yaml
# migration.yaml - Run once and stop
apiVersion: '2021-09-01'
location: eastus
name: db-migration
properties:
  containers:
    - name: migrate
      properties:
        image: myregistry.azurecr.io/migrate:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
        environmentVariables:
          - name: DB_CONNECTION
            secureValue: 'Server=mydb.database.windows.net;Database=prod;...'
        command:
          - dotnet
          - ef
          - database
          - update
  osType: Linux
  restartPolicy: Never
type: Microsoft.ContainerInstance/containerGroups
```

The migration runs once. Whether it succeeds or fails, it stays stopped so you can check the logs and take appropriate action.

## Restart Behavior in Multi-Container Groups

The restart policy applies to the entire container group, not individual containers. This means:

- All containers in the group follow the same restart policy
- If one container exits and the policy is Always, only that container restarts (not the others)
- The group's state is determined by the combined state of all containers

This can create interesting situations:

```yaml
# multi-container-restart.yaml
apiVersion: '2021-09-01'
location: eastus
name: app-with-sidecar
properties:
  containers:
    # Main app that might crash
    - name: app
      properties:
        image: myregistry.azurecr.io/app:latest
        resources:
          requests:
            cpu: 1.0
            memoryInGb: 2.0
    # Sidecar that should always run
    - name: sidecar
      properties:
        image: myregistry.azurecr.io/sidecar:latest
        resources:
          requests:
            cpu: 0.25
            memoryInGb: 0.5
  osType: Linux
  restartPolicy: Always
type: Microsoft.ContainerInstance/containerGroups
```

If the main app crashes, it restarts while the sidecar continues running. If the sidecar crashes, it restarts independently. Both containers are managed under the same restart policy.

## Monitoring Restart Events

Track how often your containers restart:

```bash
# View all events for the container, including restarts
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "containers[0].instanceView.events[]" \
    --output table

# View the restart count
az container show \
    --resource-group my-resource-group \
    --name my-container \
    --query "containers[0].instanceView.restartCount" \
    --output tsv
```

If you see a high restart count, investigate the container logs to find out why it keeps crashing:

```bash
# View container logs (including previous instance logs if available)
az container logs \
    --resource-group my-resource-group \
    --name my-container \
    --container-name app
```

## Backoff Behavior

When a container keeps restarting (crash loop), ACI applies an exponential backoff. The first restart is immediate, but subsequent restarts are delayed with increasing wait times. This prevents a broken container from consuming resources in a tight restart loop.

The maximum backoff is around 5 minutes. If your container consistently crashes after starting, you will see it waiting longer between restart attempts.

## Cleaning Up Stopped Containers

Remember that stopped container groups still exist and count against your subscription quotas, even though they are not billed. Clean up completed jobs:

```bash
# List all container groups and their states
az container list \
    --resource-group my-resource-group \
    --query "[].{name:name, state:instanceView.state}" \
    --output table

# Delete completed container groups
az container delete \
    --resource-group my-resource-group \
    --name completed-job \
    --yes
```

## Summary

Restart policies in ACI are simple but important. Use `Always` for services that should never be down, `OnFailure` for batch jobs that should retry on errors, and `Never` for one-shot tasks. Remember that the policy applies to the entire container group, affects billing, and includes exponential backoff to prevent crash loops. Choose the right policy for your workload and monitor restart counts to catch recurring issues.
