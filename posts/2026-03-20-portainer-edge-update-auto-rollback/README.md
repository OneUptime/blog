# How to Update Edge Agents with Automatic Rollback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Edge Agent, Update, Rollback, Business Edition

Description: Use Portainer Business Edition's edge update schedules with automatic rollback to safely update edge agents across remote environments.

## Introduction

Updating edge agents across dozens or hundreds of remote devices requires a safe, automated process. Portainer Business Edition provides Update & Rollback schedules for Edge Agents, letting you schedule agent updates and, if needed, schedule a rollback to a previous version.

This feature is currently in beta and is only available for Edge Agents running on Docker Standalone environments.

## Prerequisites

- Portainer Business Edition
- Edge Agent deployments running on Docker Standalone environments
- Edge environments configured and connected
- Portainer snapshots available for the environments you plan to update or roll back
- A current backup of your Portainer configuration

## Creating an Update Schedule

### Via Web UI

1. Go to **Environment-related** → **Update & Rollback**
2. Click **Schedule update or rollback**
3. Configure:

```text
Name:                Quarterly Agent Update
Tab:                 Update
Edge Groups:         Branch Offices
Version:             Match your Portainer Server version (for example, 2.39.1)
Schedule date/time:  2026-05-15 02:00 UTC
Registry:            Docker Hub (or your custom registry)
Agent Image:         portainer/agent:2.39.1
Updater Image:       portainer/portainer-updater:2.39.1
```

To schedule a rollback instead, select the **Rollback** tab and choose a previously available version.

### Via API

```bash
TOKEN=$(curl -s -X POST \
  https://portainer.example.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"adminpassword"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['jwt'])")

CURRENT_VERSION=2.39.1

# Create update schedule
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/edge_update_schedules \
  -d "{
    \"Name\": \"Q2-2026-Agent-Update\",
    \"Type\": 1,
    \"ScheduledTime\": \"2026-05-15T02:00:00Z\",
    \"GroupIDs\": [1, 2],
    \"AgentImage\": \"portainer/agent:${CURRENT_VERSION}\",
    \"UpdaterImage\": \"portainer/portainer-updater:${CURRENT_VERSION}\"
  }"
```

Use `Type: 2` to create a rollback schedule instead.

## Monitoring Update Progress

```bash
# List all schedules and their current status
curl -s \
  -H "Authorization: Bearer $TOKEN" \
  https://portainer.example.com/api/edge_update_schedules \
  | python3 -c "
import sys, json
status_map = {0: 'pending', 1: 'error', 2: 'success', 3: 'sent', 4: 'in progress'}
type_map = {1: 'update', 2: 'rollback'}

for s in json.load(sys.stdin):
    print(f\"{s['id']}: {s['name']} [{type_map.get(s.get('type'), s.get('type'))}] status={status_map.get(s.get('status'), s.get('status'))}\")
    if s.get('statusMessage'):
        print(f\"   message={s['statusMessage']}\")
"

# Inspect one schedule
SCHEDULE_ID=1

curl -s \
  -H "Authorization: Bearer $TOKEN" \
  "https://portainer.example.com/api/edge_update_schedules/${SCHEDULE_ID}" \
  | python3 -m json.tool
```

## How Rollback Works

1. Before you can schedule an update or rollback, Portainer must have a snapshot of the target environments
2. Create an update schedule for the Edge Group or groups you want to update
3. At the scheduled time, Portainer deploys the specified `portainer/agent` and `portainer/portainer-updater` images
4. Monitor the schedule status in **Update & Rollback** or via the `edge_update_schedules` API
5. If you need to revert, create a separate rollback schedule from the **Rollback** tab or by using API `Type: 2`
6. Portainer applies the rollback schedule to the selected Edge Groups

## Staged Rollout

For large fleets, deploy updates in stages by using separate Edge Groups:

```bash
CURRENT_VERSION=2.39.1

# Stage 1: Update a canary Edge Group
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  https://portainer.example.com/api/edge_update_schedules \
  -d "{
    \"Name\": \"Canary-Update\",
    \"Type\": 1,
    \"ScheduledTime\": \"2026-05-15T02:00:00Z\",
    \"GroupIDs\": [1],
    \"AgentImage\": \"portainer/agent:${CURRENT_VERSION}\",
    \"UpdaterImage\": \"portainer/portainer-updater:${CURRENT_VERSION}\"
  }"

# After validating the canary group, create a second schedule for the remaining Edge Groups
```

## Conclusion

Update & Rollback schedules reduce the risk of large-scale agent updates on remote Docker Standalone environments. Because rollback is a separate scheduled action, you should monitor the update results and keep previous versions available if you need to revert. For large fleets, staged rollouts let you validate updates on a small set before full deployment.
