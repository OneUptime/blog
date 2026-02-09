# How to Implement Docker Container Resource Quotas per Team

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Resource Management, Quotas, Multi-Team, Production, DevOps, Governance

Description: Enforce per-team resource quotas for Docker containers using cgroups, scripts, and monitoring to prevent resource contention.

---

When multiple teams share Docker hosts, one team's runaway container can starve everyone else of CPU, memory, or disk. Resource quotas solve this by giving each team a defined allocation. This guide shows how to implement and enforce per-team resource quotas for Docker containers on shared infrastructure.

## The Problem

Without quotas, resources are first-come, first-served. The team that deploys the most containers or the team with a memory leak gets the most resources. This leads to noisy neighbor problems, unpredictable performance, and finger-pointing between teams.

## Designing the Quota System

Define quotas based on your server resources and team needs. A quota plan specifies the maximum CPU, memory, and storage each team can consume.

Create a quota configuration file:

```json
{
  "host_resources": {
    "total_cpus": 16,
    "total_memory_gb": 64,
    "total_storage_gb": 500
  },
  "team_quotas": {
    "backend": {
      "max_cpus": 6,
      "max_memory_gb": 24,
      "max_storage_gb": 150,
      "max_containers": 20
    },
    "frontend": {
      "max_cpus": 4,
      "max_memory_gb": 16,
      "max_storage_gb": 100,
      "max_containers": 15
    },
    "data": {
      "max_cpus": 4,
      "max_memory_gb": 16,
      "max_storage_gb": 200,
      "max_containers": 10
    },
    "reserved": {
      "max_cpus": 2,
      "max_memory_gb": 8,
      "max_storage_gb": 50,
      "max_containers": 5
    }
  }
}
```

Keep 2 CPUs and 8GB of memory reserved for the system and monitoring tools.

## Implementing Quotas with Docker Labels

Use Docker labels to identify which team owns each container. This makes it easy to track and enforce quotas.

When starting a container, always apply the team label:

```bash
# Start a container with team ownership label
docker run -d \
  --name backend-api \
  --label team=backend \
  --label service=api \
  --memory="2g" \
  --cpus="1.0" \
  --storage-opt size=10G \
  backend-api:latest
```

For Docker Compose, include labels in the service definition:

```yaml
# docker-compose.yml for the backend team
version: "3.9"

services:
  api:
    image: backend-api:latest
    labels:
      team: backend
      service: api
    deploy:
      resources:
        limits:
          cpus: "1.0"
          memory: 2G
        reservations:
          cpus: "0.5"
          memory: 1G

  worker:
    image: backend-worker:latest
    labels:
      team: backend
      service: worker
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 4G
```

## Quota Enforcement Script

This script checks current resource usage per team against the defined quotas and blocks new containers that would exceed limits:

```bash
#!/bin/bash
# quota-check.sh - Check and enforce team resource quotas
# Usage: ./quota-check.sh <team> <requested_cpus> <requested_memory_gb>
# Exit 0 if quota allows, exit 1 if quota exceeded

TEAM=$1
REQUESTED_CPUS=$2
REQUESTED_MEMORY_GB=$3
QUOTA_FILE="/etc/docker-quotas/quotas.json"

if [ -z "$TEAM" ] || [ -z "$REQUESTED_CPUS" ] || [ -z "$REQUESTED_MEMORY_GB" ]; then
    echo "Usage: $0 <team> <requested_cpus> <requested_memory_gb>"
    exit 2
fi

# Read team quota limits from the config file
MAX_CPUS=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(d['team_quotas']['$TEAM']['max_cpus'])")
MAX_MEMORY_GB=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(d['team_quotas']['$TEAM']['max_memory_gb'])")
MAX_CONTAINERS=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(d['team_quotas']['$TEAM']['max_containers'])")

# Calculate current usage for this team
CURRENT_CONTAINERS=$(docker ps --filter "label=team=$TEAM" --format "{{.Names}}" | wc -l)

# Sum CPU limits of running containers for this team
CURRENT_CPUS=$(docker ps --filter "label=team=$TEAM" --format "{{.ID}}" | \
  xargs -I{} docker inspect --format='{{.HostConfig.NanoCpus}}' {} | \
  awk '{sum += $1/1000000000} END {print sum}')

# Sum memory limits (in bytes, convert to GB)
CURRENT_MEMORY_BYTES=$(docker ps --filter "label=team=$TEAM" --format "{{.ID}}" | \
  xargs -I{} docker inspect --format='{{.HostConfig.Memory}}' {} | \
  awk '{sum += $1} END {print sum}')
CURRENT_MEMORY_GB=$(echo "scale=2; $CURRENT_MEMORY_BYTES / 1073741824" | bc)

echo "Team: $TEAM"
echo "Current usage: ${CURRENT_CPUS} CPUs, ${CURRENT_MEMORY_GB}GB memory, $CURRENT_CONTAINERS containers"
echo "Quota limits:  ${MAX_CPUS} CPUs, ${MAX_MEMORY_GB}GB memory, $MAX_CONTAINERS containers"
echo "Requested:     ${REQUESTED_CPUS} CPUs, ${REQUESTED_MEMORY_GB}GB memory"

# Check container count
NEW_CONTAINER_COUNT=$((CURRENT_CONTAINERS + 1))
if [ "$NEW_CONTAINER_COUNT" -gt "$MAX_CONTAINERS" ]; then
    echo "DENIED: Container count would exceed quota ($NEW_CONTAINER_COUNT > $MAX_CONTAINERS)"
    exit 1
fi

# Check CPU quota
NEW_CPUS=$(echo "$CURRENT_CPUS + $REQUESTED_CPUS" | bc)
if [ "$(echo "$NEW_CPUS > $MAX_CPUS" | bc)" -eq 1 ]; then
    echo "DENIED: CPU usage would exceed quota ($NEW_CPUS > $MAX_CPUS)"
    exit 1
fi

# Check memory quota
NEW_MEMORY=$(echo "$CURRENT_MEMORY_GB + $REQUESTED_MEMORY_GB" | bc)
if [ "$(echo "$NEW_MEMORY > $MAX_MEMORY_GB" | bc)" -eq 1 ]; then
    echo "DENIED: Memory usage would exceed quota ($NEW_MEMORY > $MAX_MEMORY_GB)"
    exit 1
fi

echo "APPROVED: Request is within quota limits"
exit 0
```

## Wrapping Docker Run with Quota Checks

Create a wrapper script that teams use instead of raw `docker run`:

```bash
#!/bin/bash
# docker-run-quota.sh - Docker run wrapper with quota enforcement
# Usage: docker-run-quota.sh --team=backend --cpus=1.0 --memory=2g [docker run args...]

# Parse our custom arguments
TEAM=""
CPUS=""
MEMORY=""
DOCKER_ARGS=""

for arg in "$@"; do
    case $arg in
        --team=*)
            TEAM="${arg#*=}"
            ;;
        --cpus=*)
            CPUS="${arg#*=}"
            ;;
        --memory=*)
            MEMORY="${arg#*=}"
            ;;
        *)
            DOCKER_ARGS="$DOCKER_ARGS $arg"
            ;;
    esac
done

# Validate required arguments
if [ -z "$TEAM" ]; then
    echo "ERROR: --team is required"
    exit 1
fi
if [ -z "$CPUS" ]; then
    echo "ERROR: --cpus is required for quota enforcement"
    exit 1
fi
if [ -z "$MEMORY" ]; then
    echo "ERROR: --memory is required for quota enforcement"
    exit 1
fi

# Convert memory string to GB for quota check
MEMORY_GB=$(echo "$MEMORY" | sed 's/[gG]$//')

# Check quota
if ! /usr/local/bin/quota-check.sh "$TEAM" "$CPUS" "$MEMORY_GB"; then
    echo "Container creation blocked by resource quota."
    exit 1
fi

# Run the container with team label and resource limits
docker run \
  --label "team=$TEAM" \
  --cpus="$CPUS" \
  --memory="$MEMORY" \
  $DOCKER_ARGS
```

## Using Docker Authorization Plugins

For stronger enforcement, use a Docker authorization plugin that intercepts all Docker API calls. This prevents teams from bypassing the quota wrapper.

Create an authorization policy using the Open Policy Agent (OPA):

```rego
# policy.rego - OPA policy for Docker resource quotas
package docker.authz

import future.keywords.in

# Default deny all requests
default allow = false

# Allow requests that pass quota checks
allow {
    input.Method == "POST"
    input.Path == "/containers/create"
    team := input.Body.Labels.team
    team != ""
    within_quota(team, input.Body)
}

# Allow non-container-creation requests
allow {
    input.Method != "POST"
}
allow {
    not startswith(input.Path, "/containers/create")
}

# Check if the request is within the team's quota
within_quota(team, body) {
    quota := data.quotas[team]
    requested_memory := body.HostConfig.Memory
    requested_memory <= quota.max_memory_bytes
}
```

## Monitoring Quota Usage

Build a dashboard script that shows current usage per team:

```bash
#!/bin/bash
# quota-dashboard.sh - Display resource usage per team
# Run this periodically or as a monitoring check

QUOTA_FILE="/etc/docker-quotas/quotas.json"
TEAMS=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(' '.join(d['team_quotas'].keys()))")

printf "%-12s %8s %8s %8s %8s %10s %10s\n" \
  "TEAM" "CPU_USED" "CPU_MAX" "MEM_USED" "MEM_MAX" "CONTAINERS" "CONT_MAX"
printf "%s\n" "$(printf '%.0s-' {1..78})"

for TEAM in $TEAMS; do
    # Get quota limits
    MAX_CPUS=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(d['team_quotas']['$TEAM']['max_cpus'])")
    MAX_MEM=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(d['team_quotas']['$TEAM']['max_memory_gb'])")
    MAX_CONT=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(d['team_quotas']['$TEAM']['max_containers'])")

    # Get current usage
    CONT_COUNT=$(docker ps --filter "label=team=$TEAM" --format "{{.Names}}" | wc -l)

    CPU_USED=$(docker ps --filter "label=team=$TEAM" --format "{{.ID}}" | \
      xargs -I{} docker inspect --format='{{.HostConfig.NanoCpus}}' {} 2>/dev/null | \
      awk '{sum += $1/1000000000} END {printf "%.1f", sum}')

    MEM_USED=$(docker ps --filter "label=team=$TEAM" --format "{{.ID}}" | \
      xargs -I{} docker inspect --format='{{.HostConfig.Memory}}' {} 2>/dev/null | \
      awk '{sum += $1/1073741824} END {printf "%.1f", sum}')

    printf "%-12s %8s %8s %7sG %7sG %10s %10s\n" \
      "$TEAM" "${CPU_USED:-0}" "$MAX_CPUS" "${MEM_USED:-0}" "$MAX_MEM" "${CONT_COUNT:-0}" "$MAX_CONT"
done
```

Run the dashboard:

```bash
# Show current quota usage across all teams
chmod +x /usr/local/bin/quota-dashboard.sh
/usr/local/bin/quota-dashboard.sh
```

Sample output:

```
TEAM         CPU_USED  CPU_MAX MEM_USED  MEM_MAX CONTAINERS   CONT_MAX
------------------------------------------------------------------------------
backend           4.0        6    12.0G      24G          8         20
frontend          2.5        4     8.0G      16G          6         15
data              3.0        4    14.0G      16G          4         10
reserved          0.5        2     2.0G       8G          2          5
```

## Alerting on Quota Usage

Send alerts when teams approach their limits:

```bash
#!/bin/bash
# quota-alert.sh - Alert when teams are near their quota limits
# Run via cron: */10 * * * * /usr/local/bin/quota-alert.sh

THRESHOLD=80  # Alert at 80% usage
WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"

TEAMS=("backend" "frontend" "data")
QUOTA_FILE="/etc/docker-quotas/quotas.json"

for TEAM in "${TEAMS[@]}"; do
    MAX_MEM=$(python3 -c "import json; d=json.load(open('$QUOTA_FILE')); print(d['team_quotas']['$TEAM']['max_memory_gb'])")

    MEM_USED=$(docker ps --filter "label=team=$TEAM" --format "{{.ID}}" | \
      xargs -I{} docker inspect --format='{{.HostConfig.Memory}}' {} 2>/dev/null | \
      awk '{sum += $1/1073741824} END {printf "%.1f", sum}')

    MEM_PCT=$(echo "scale=0; ($MEM_USED / $MAX_MEM) * 100" | bc)

    if [ "$MEM_PCT" -ge "$THRESHOLD" ]; then
        MSG="Team '$TEAM' is at ${MEM_PCT}% of memory quota (${MEM_USED}GB / ${MAX_MEM}GB)"
        curl -s -X POST "$WEBHOOK" \
          -H "Content-Type: application/json" \
          -d "{\"text\": \"$MSG\"}" > /dev/null
    fi
done
```

## Best Practices for Team Quotas

Several things to keep in mind when implementing quotas:

1. **Require resource limits on every container.** If a container has no `--memory` or `--cpus` flag, it can consume unlimited resources and bypass the quota system. Enforce this through the wrapper script or an authorization plugin.

2. **Set quotas with headroom.** Do not allocate 100% of server resources. Leave 10-15% unallocated as buffer for system processes and unexpected spikes.

3. **Review quotas monthly.** Team needs change. A quarterly review of actual usage versus allocated quotas prevents both waste and contention.

4. **Make the dashboard visible.** Display quota usage on a shared team dashboard. Transparency reduces conflicts and encourages teams to clean up unused containers.

5. **Handle quota increases through a process.** When a team needs more resources, make them justify it. This prevents gradual quota creep that leaves no room for growth.

Resource quotas bring predictability to shared Docker infrastructure. Each team knows exactly what they have available, and no single team can monopolize shared resources. The investment in setting up quota enforcement pays off quickly in reduced outages and happier teams.
