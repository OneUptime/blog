# How to Configure Per-Team Resource Quotas in Portainer - Teams

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, Resource Quota, Multi-Tenant, Team, Resource Management

Description: Set CPU, memory, and container count limits per team in Portainer to prevent resource starvation between tenants sharing the same Docker infrastructure.

## Introduction

When multiple teams share a Docker host, resource limits prevent one team from consuming all available CPU and memory, starving other teams' workloads. In Docker and Swarm environments, CPU and memory enforcement comes from Docker or the Linux host; Portainer Business Edition adds team access control, security policies, and custom templates that help standardize how those limits are applied. This guide covers configuring resource limits at both the infrastructure and Portainer policy levels.

## Step 1: Set Container Resource Limits in Team Stacks

```yaml
# Team Alpha's docker-compose.yml with enforced resource limits

services:
  api:
    image: alpha/api:latest
    labels:
      - "tenant=alpha"
    deploy:
      resources:
        limits:
          cpus: "1.0"      # Max 1 CPU
          memory: 512M     # Max 512MB RAM
        reservations:
          cpus: "0.25"     # Guaranteed 0.25 CPU
          memory: 128M     # Guaranteed 128MB RAM
    mem_limit: 512m         # For non-Swarm deployments
    mem_reservation: 128m
    cpus: 1.0

  database:
    image: postgres:15-alpine
    labels:
      - "tenant=alpha"
    deploy:
      resources:
        limits:
          cpus: "2.0"
          memory: 2G
    mem_limit: 2g
    environment:
      POSTGRES_PASSWORD: "change-me"
    command: ["postgres", "-c", "shared_buffers=512MB"]  # Keep below memory limit

  worker:
    image: alpha/worker:latest
    labels:
      - "tenant=alpha"
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
    mem_limit: 256m
```

## Step 2: Portainer Security Settings to Reduce Bypass Options

```bash
PORTAINER_URL="https://portainer.example.com"
ADMIN_API_KEY="admin_api_key"
ENV_ID=1  # The environment team uses

# Configure security settings that reduce risky deployment options
curl -s -X PUT \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/endpoints/$ENV_ID/settings" \
  -d '{
    "securitySettings": {
      "allowBindMountsForRegularUsers": false,
      "allowPrivilegedModeForRegularUsers": false,
      "allowHostNamespaceForRegularUsers": false,
      "allowDeviceMappingForRegularUsers": false,
      "allowSysctlSettingForRegularUsers": false,
      "allowContainerCapabilitiesForRegularUsers": false,
      "enableHostManagementFeatures": false
    }
  }'

# With these settings, team users CANNOT:
# - Run privileged containers
# - Mount host filesystem paths
# - Map host devices into containers
# - Modify kernel parameters
#
# These settings do not validate that every stack has CPU or memory limits.
# Use templates, RBAC, and review workflows for that policy.
```

## Step 3: cgroups-Based Host-Level Quotas

For strict enforcement at the OS level, use cgroups:

```bash
# Create cgroup hierarchy for tenant isolation
# Linux cgroups v2
# Requires root privileges and available cpu/memory controllers.

# Enable controllers for child cgroups
echo "+cpu +memory" | sudo tee /sys/fs/cgroup/cgroup.subtree_control >/dev/null

# Create cgroup for Team Alpha
sudo mkdir -p /sys/fs/cgroup/team-alpha

# Set CPU quota (50% of one CPU)
echo "50000 100000" | sudo tee /sys/fs/cgroup/team-alpha/cpu.max >/dev/null
# Format: quota_microseconds period_microseconds
# 50000/100000 = 50% of one CPU

# Set memory limit (4GB)
echo "4294967296" | sudo tee /sys/fs/cgroup/team-alpha/memory.max >/dev/null  # 4GB in bytes

# Set swap limit (no swap)
echo "0" | sudo tee /sys/fs/cgroup/team-alpha/memory.swap.max >/dev/null

# Docker can place containers in specific cgroups
docker run -d \
  --cgroup-parent /team-alpha \
  --name alpha-api \
  alpha/api:latest
```

## Step 4: Monitor Resource Usage Per Team

```bash
#!/bin/bash
# team-resource-report.sh - Show resource usage by team label

echo "=== Team Resource Usage Report ==="
echo "Date: $(date)"
echo ""

print_team_stats() {
  local team_name="$1"
  local tenant="$2"
  local containers=()

  mapfile -t containers < <(docker ps --filter "label=tenant=$tenant" -q)

  echo "--- $team_name ---"
  if [ "${#containers[@]}" -eq 0 ]; then
    echo "No running containers"
    return
  fi

  docker stats --no-stream \
    --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" \
    "${containers[@]}"
}

team_cpu_total() {
  local tenant="$1"
  local containers=()

  mapfile -t containers < <(docker ps --filter "label=tenant=$tenant" -q)
  if [ "${#containers[@]}" -eq 0 ]; then
    echo "0.0%"
    return
  fi

  docker stats --no-stream \
    --format "{{.CPUPerc}}" \
    "${containers[@]}" | \
    awk '{gsub(/%/, "", $1); sum += $1} END {printf "%.1f%%", sum}'
}

# Get stats for each team's containers
print_team_stats "Team Alpha" "alpha"

echo ""
print_team_stats "Team Beta" "beta"

# Aggregate totals
echo ""
echo "--- Resource Totals ---"

# Sum CPU usage for each team
ALPHA_CPU=$(team_cpu_total "alpha")
BETA_CPU=$(team_cpu_total "beta")

echo "Team Alpha CPU: $ALPHA_CPU"
echo "Team Beta CPU: $BETA_CPU"
```

## Step 5: Alert on Resource Quota Violations

```bash
#!/bin/bash
# quota-alert.sh - Alert when team containers exceed limits

MAX_MEMORY_MB=512   # Alert if any container uses more than 512MB
MAX_CPU_PERCENT=80  # Alert if any container uses more than 80% CPU

parse_mib() {
  local value="$1"

  case "$value" in
    *GiB) awk -v v="${value%GiB}" 'BEGIN {printf "%d", v * 1024}' ;;
    *MiB) awk -v v="${value%MiB}" 'BEGIN {printf "%d", v}' ;;
    *KiB) awk -v v="${value%KiB}" 'BEGIN {printf "%d", v / 1024}' ;;
    *B) awk -v v="${value%B}" 'BEGIN {printf "%d", v / 1024 / 1024}' ;;
    *) echo 0 ;;
  esac
}

docker stats --no-stream --format "{{.Name}}|{{.MemUsage}}|{{.CPUPerc}}" | \
while IFS='|' read -r name mem_usage cpu_perc; do
  # Extract memory in MB
  mem_used="${mem_usage%% / *}"
  mem_mb=$(parse_mib "$mem_used")
  cpu_num=$(echo "$cpu_perc" | tr -d '%' | awk '{print int($1)}')

  if [ "$mem_mb" -gt "$MAX_MEMORY_MB" ] 2>/dev/null; then
    echo "ALERT: $name is using ${mem_mb}MB (limit: ${MAX_MEMORY_MB}MB)"
    # Send alert to Slack/PagerDuty
  fi

  if [ "$cpu_num" -gt "$MAX_CPU_PERCENT" ] 2>/dev/null; then
    echo "ALERT: $name CPU at ${cpu_num}% (threshold: ${MAX_CPU_PERCENT}%)"
  fi
done
```

## Step 6: Enforce Limits via Portainer Custom Templates

```yaml
# Create a custom stack template that includes fixed limits
# Teams deploy from this template, ensuring the generated stack includes limits

# portainer-template-api.yml
services:
  app:
    image: "{{ APP_IMAGE }}"
    environment:
      - NODE_ENV=production
    deploy:
      resources:
        limits:
          cpus: "0.5"
          memory: 256M
    mem_limit: 256M
    restart: unless-stopped
    labels:
      - "tenant={{ TEAM_NAME }}"
```

```bash
# Create the custom template in Portainer
STACK_FILE="$(cat portainer-template-api.yml)"

curl -s -X POST \
  -H "X-API-Key: $ADMIN_API_KEY" \
  -H "Content-Type: application/json" \
  "$PORTAINER_URL/api/custom_templates/create/string" \
  -d "$(jq -n --arg file "$STACK_FILE" '{
    Title: "Application Stack with Resource Limits",
    Description: "Deploy an application with fixed CPU and memory limits",
    Type: 2,
    Platform: 1,
    FileContent: $file,
    Variables: [
      {"name": "TEAM_NAME", "label": "Team Name", "defaultValue": ""},
      {"name": "APP_IMAGE", "label": "Docker Image", "defaultValue": ""}
    ]
  }')"
```

## Conclusion

Resource isolation in a shared Portainer Docker environment requires enforcement at multiple levels: Docker Compose `mem_limit`, `cpus`, and `deploy.resources` settings for individual containers or services, Portainer security policies to reduce risky deployment options, and optional OS-level cgroup quotas for hard enforcement. Monitoring scripts that track resource usage by team label provide visibility into consumption patterns. Custom templates with fixed resource values help new deployments include limits, but they are not a hard security boundary unless manual deployment paths are restricted.
