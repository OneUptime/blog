# How to Pause and Resume Atlas Clusters

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Cluster, Cost Saving, Automation

Description: Pause and resume MongoDB Atlas clusters on a schedule to save costs on non-production environments using the Atlas CLI, Admin API, and GitHub Actions.

---

## Overview

MongoDB Atlas allows M10+ dedicated clusters to be paused when not in use. A paused cluster stops charging for compute while retaining all data and configuration. Pausing development and staging clusters outside working hours can reduce costs by 60% or more.

## Limitations

```text
- Pausing is available on M10+ dedicated tiers only (not M0/Flex/Serverless/NVMe)
- Pausing a cluster with Atlas Search nodes deletes Search Node data; it is rebuilt automatically on resume
- Auto-pausing after inactivity (M0) differs from manual pausing
- Clusters paused for more than 30 days are automatically resumed by Atlas
```

## Pausing a Cluster with the Atlas CLI

```bash
# Pause a cluster
atlas clusters pause dev-cluster --projectId <PROJECT_ID>

# Resume a cluster
atlas clusters start dev-cluster --projectId <PROJECT_ID>

# Check current state
atlas clusters describe dev-cluster --projectId <PROJECT_ID> | grep stateName
```

## Pausing via the Admin API

```bash
PUBLIC_KEY="your-public-key"
PRIVATE_KEY="your-private-key"
PROJECT_ID="your-project-id"

# Pause
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Content-Type: application/json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/clusters/dev-cluster" \
  --data '{"paused": true}'

# Resume
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Content-Type: application/json" \
  --request PATCH \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/clusters/dev-cluster" \
  --data '{"paused": false}'
```

## Automating Pause/Resume with GitHub Actions

```yaml
name: Atlas Dev Cluster Schedule

on:
  schedule:
    - cron: '0 8 * * 1-5'   # Resume at 8 AM weekdays (UTC)
    - cron: '0 20 * * 1-5'  # Pause at 8 PM weekdays (UTC)
  workflow_dispatch:
    inputs:
      action:
        description: 'pause or resume'
        required: true
        type: choice
        options: [pause, resume]

jobs:
  manage-cluster:
    runs-on: ubuntu-latest
    steps:
      - name: Determine action
        id: action
        run: |
          # Use input if manual trigger, otherwise derive from cron schedule
          if [ -n "${{ github.event.inputs.action }}" ]; then
            echo "action=${{ github.event.inputs.action }}" >> $GITHUB_OUTPUT
          else
            HOUR=$(date -u +%H)
            if [ "$HOUR" = "08" ]; then
              echo "action=resume" >> $GITHUB_OUTPUT
            else
              echo "action=pause" >> $GITHUB_OUTPUT
            fi
          fi

      - name: Pause or resume cluster
        env:
          ATLAS_PUBLIC_KEY: ${{ secrets.ATLAS_PUBLIC_KEY }}
          ATLAS_PRIVATE_KEY: ${{ secrets.ATLAS_PRIVATE_KEY }}
          PROJECT_ID: ${{ secrets.ATLAS_PROJECT_ID }}
        run: |
          ACTION=${{ steps.action.outputs.action }}
          PAUSED=$( [ "$ACTION" = "pause" ] && echo "true" || echo "false" )

          curl -s -u "${ATLAS_PUBLIC_KEY}:${ATLAS_PRIVATE_KEY}" --digest \
            --header "Content-Type: application/json" \
            --request PATCH \
            "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/clusters/dev-cluster" \
            --data "{\"paused\": ${PAUSED}}"

          echo "Cluster ${ACTION}d successfully"
```

## Waiting for the Cluster to Resume

A resumed cluster enters `REPAIRING` state before becoming `IDLE`. Wait before running database operations.

```bash
#!/usr/bin/env bash
PROJECT_ID="your-project-id"
CLUSTER_NAME="dev-cluster"

# Resume the cluster
atlas clusters start ${CLUSTER_NAME} --projectId ${PROJECT_ID}

# Wait until the cluster is ready
echo "Waiting for cluster to resume..."
while true; do
  STATE=$(atlas clusters describe ${CLUSTER_NAME} \
    --projectId ${PROJECT_ID} --output json | jq -r '.stateName')
  echo "State: ${STATE}"
  [ "${STATE}" = "IDLE" ] && break
  sleep 30
done

echo "Cluster is ready"
```

## Summary

Pausing Atlas clusters during off-hours is the most straightforward cost-saving measure for non-production environments. Use the Atlas CLI for ad-hoc operations and GitHub Actions scheduled workflows to automate pause at end-of-day and resume at start-of-day. Always wait for the cluster to reach `IDLE` state before running application workloads after resuming.
