# How to Recover Orphaned Stacks in Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Stack, Recovery, Troubleshooting, DevOps

Description: Learn how to recover orphaned Docker stacks in Portainer - containers running outside Portainer's knowledge that need to be brought back under management.

## Introduction

In Portainer, orphaned stacks are stacks that were previously created in Portainer but whose environment is no longer registered. This most commonly happens when a Docker environment is removed and re-added, or when you change the way Portainer connects to the same Docker node. Workloads deployed directly with `docker compose` or `docker stack deploy`, or workloads left behind after Portainer data loss, are different - Portainer treats those as external resources with limited control rather than orphaned stacks. This guide covers the supported orphaned-stack recovery flow.

## Prerequisites

- Portainer installed with a connected Docker environment that points to the same Docker node or Swarm as the original stack
- Portainer administrator access
- Docker CLI access on the host (optional, for verification)

## What Causes Orphaned Stacks

1. **Environment re-addition**: A Docker environment is removed from Portainer and then added again.
2. **Connection method changes**: You switch the same Docker host from one connection method to another (for example, direct socket to socket proxy) and recreate the environment entry.
3. **Environment recreation on the same node**: Portainer still has the stack record, but the original environment entry no longer exists, so the stack must be re-associated.

Direct CLI deployments and Portainer data loss do not create orphaned stack records in Portainer. Those scenarios result in external workloads, which are covered separately below.

## Step 1: Identify Orphaned Stacks

Use Portainer's stack list to identify actual orphaned stacks:

1. In Portainer, open the environment you want to recover stacks into.
2. Navigate to **Stacks**.
3. Open the three-dot menu in the top-right corner and select **Show all orphaned stacks**.
4. Any stacks shown with the **Orphaned** status can be re-associated.

If the stack does not appear after enabling orphaned stacks, it is not an orphaned Portainer stack record. It is more likely an external deployment or a case of Portainer data loss.

## Step 2: Verify the Stack Still Exists on the Same Environment

Orphaned stacks can only be re-associated when the new environment points at the same Docker node or Swarm that still has the stack resources:

```bash
# Compose stack: confirm containers still exist, even if stopped
docker ps -a --filter "label=com.docker.compose.project=myapp"

# Swarm stack: confirm services still exist
docker stack services myapp
```

If the workload is still running, Portainer can re-associate the orphaned stack and show it as active again. If the workload is gone, the stack can still be re-associated, but it will come back as inactive until you redeploy or start it.

## Step 3: Re-Associate the Stack in Portainer

### Method 1: Use the Portainer UI

1. In Portainer, navigate to **Stacks** and enable **Show all orphaned stacks** if needed.
2. Click the orphaned stack you want to recover.
3. Click **Associate** or **Associate to this environment**.
4. Confirm the association.

Portainer re-attaches the existing stack record to the current environment. If the underlying containers or services are still present on that same environment, the stack returns with full control.

### Method 2: Use the Portainer API

```bash
ENDPOINT_ID=1
STACK_ID=12

# List orphaned stacks visible for an environment:
curl --get \
  "${PORTAINER_URL}/api/stacks" \
  -H "X-API-Key: ${PORTAINER_TOKEN}" \
  --data-urlencode "filters={\"EndpointID\":${ENDPOINT_ID},\"IncludeOrphanedStacks\":true}"

# Associate an orphaned standalone stack back to that environment.
# For swarm stacks, add &swarmId=<your swarm id> to the URL.
curl -X PUT \
  "${PORTAINER_URL}/api/stacks/${STACK_ID}/associate?endpointId=${ENDPOINT_ID}&orphanedRunning=true" \
  -H "X-API-Key: ${PORTAINER_TOKEN}"
```

## Step 4: Handle External Stacks (Deployed via CLI)

Stacks deployed directly with `docker compose up` or `docker stack deploy` are not orphaned stacks in Portainer. Portainer marks resources deployed outside Portainer as `external`, and control over them is limited.

1. You may see these workloads in Portainer as external or limited-control resources.
2. The orphaned-stack **Associate** flow does not apply to them.
3. If you want Portainer to manage them fully again, use the original Compose or stack file and redeploy them from Portainer during a maintenance window, or leave them as externally managed workloads.

## Step 5: Prevent Future Orphaning

Strategies to prevent stacks from becoming orphaned:

```bash
# Strategy 1: If you want Portainer to retain full stack control,
# deploy the stack from Portainer instead of creating it directly with the Docker CLI

# Strategy 2: Backup Portainer data volume regularly:
docker run --rm \
  -v portainer_data:/source:ro \
  -v /backup:/backup \
  alpine tar czf /backup/portainer_data_$(date +%Y%m%d).tar.gz -C /source .

# Strategy 3: Use Git-based stacks so the source of truth is in Git
# and Portainer keeps a Git reference for the stack definition

# Strategy 4: Export stack definitions regularly:
# Portainer UI: Stacks → (each stack) → copy Compose YAML → save to version control
```

## Step 6: Recover After Portainer Reinstall

If you reinstalled Portainer and lost all stack records:

```bash
# 1. List all Compose projects that still have containers on the host:
docker ps -a --format '{{.Labels}}' | \
  grep -o 'com.docker.compose.project=[^,]*' | \
  sort -u | sed 's/com.docker.compose.project=//'

# 2. Look for Compose files using current and legacy filenames:
find /opt/stacks /home -type f \( -name 'compose.yaml' -o -name 'compose.yml' -o -name 'docker-compose.yaml' -o -name 'docker-compose.yml' \) 2>/dev/null
```

At that point, Portainer no longer has the original stack records, so those workloads are not recoverable as orphaned stacks. If you have a Portainer backup, restore it to recover the original stack metadata. If you do not have a backup, treat the running workloads as external resources or plan a fresh redeploy from Portainer using the saved Compose or Git source.

## Conclusion

Orphaned stacks in Portainer are stack records whose original environment was removed and later re-added. The supported recovery path is to show orphaned stacks in Portainer and re-associate them with the same environment. Workloads deployed outside Portainer, or workloads left behind after Portainer data loss, are external resources rather than orphaned stacks and require either a Portainer backup restore or a fresh deployment from Portainer if you want full management again.
