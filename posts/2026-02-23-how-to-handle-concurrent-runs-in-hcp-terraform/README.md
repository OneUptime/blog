# How to Handle Concurrent Runs in HCP Terraform

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Terraform, HCP Terraform, Concurrent Runs, Performance, CI/CD

Description: Learn how concurrent runs work in HCP Terraform, how to manage run queues, and strategies to avoid bottlenecks in your workflows.

---

When multiple team members push changes at the same time, or when CI/CD pipelines trigger plans across many workspaces simultaneously, you hit the concurrent run limit. Understanding how HCP Terraform handles concurrency is essential for keeping your infrastructure workflows moving. This guide covers how concurrent runs work, what happens when you hit the limit, and strategies for managing the bottleneck.

## How Concurrent Runs Work

HCP Terraform processes runs (plans and applies) using worker infrastructure. Your plan tier determines how many runs can execute simultaneously:

- **Free tier:** 1 concurrent run
- **Standard tier:** Varies by contract
- **Plus tier:** Higher concurrency limits
- **Enterprise:** Configurable based on your deployment

A "concurrent run" means an active plan or apply operation. Runs in other states (pending, queued, waiting for confirmation) do not count toward the limit.

```text
# Visualization of run concurrency
Worker 1: [Planning workspace-A]  [Applying workspace-A]  [idle]
Worker 2: [Planning workspace-B]  [idle]                   [Planning workspace-C]
Worker 3: [Applying workspace-D]  [Planning workspace-E]   [idle]
Queue:     workspace-F, workspace-G, workspace-H (waiting)
```

## What Happens When You Hit the Limit

When all concurrent run slots are occupied, additional runs enter a queue. They sit in "pending" status until a slot frees up. The queue is processed in order - first in, first out.

```bash
# Check the current run queue for a workspace
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/workspaces/$WORKSPACE_ID/runs?filter%5Bstatus%5D=pending" | \
  jq '.data[] | {id: .id, status: .attributes.status, created: .attributes["created-at"]}'
```

On the free tier with one concurrent run, this means every workspace waits its turn. If workspace A is running a 10-minute apply, workspace B's plan waits the full 10 minutes before starting.

## Strategies for the Free Tier

With one concurrent run, you need to be deliberate about when and how runs execute.

### Batch Your Changes

Instead of pushing small changes frequently, batch related changes together:

```bash
# Instead of three separate commits and three queued runs:
# git commit -m "update instance type"
# git commit -m "add tag"
# git commit -m "change security group"

# Make one commit with all changes:
git add main.tf security.tf
git commit -m "update instance configuration and security group"
git push
```

### Use CLI-Driven Workflow for Active Development

During active development on a single workspace, use the CLI workflow. This is faster than VCS-driven runs because you skip the webhook processing:

```bash
# Direct CLI runs do not compete with VCS-driven queues
terraform plan
# Review the plan
terraform apply
```

### Schedule Non-Urgent Runs

If you have maintenance runs that are not time-sensitive, schedule them for off-hours:

```bash
# Trigger a run with a delay using the API
# Create the run but do not auto-apply
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "data": {
      "type": "runs",
      "attributes": {
        "auto-apply": false,
        "message": "Scheduled maintenance run"
      },
      "relationships": {
        "workspace": {
          "data": {
            "type": "workspaces",
            "id": "ws-abc123"
          }
        }
      }
    }
  }' \
  "https://app.terraform.io/api/v2/runs"
```

## Strategies for Paid Tiers

With multiple concurrent runs, the game changes. Now you want to maximize utilization of your run slots.

### Parallel CI/CD Pipelines

Structure your CI/CD to trigger runs in parallel across workspaces:

```yaml
# GitHub Actions - run plans in parallel
name: Terraform Plan
on: [pull_request]

jobs:
  plan-networking:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd workspaces/networking
          terraform init
          terraform plan

  plan-compute:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd workspaces/compute
          terraform init
          terraform plan

  plan-database:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: |
          cd workspaces/database
          terraform init
          terraform plan
```

Each of these runs in a separate workspace and can execute concurrently if you have enough run slots.

### Monitor Queue Depth

Keep an eye on how deep your run queue gets:

```bash
#!/bin/bash
# monitor-run-queue.sh
# Check pending runs across all workspaces

ORG="my-company"

# Get all pending runs
PENDING=$(curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/$ORG/runs?filter%5Bstatus%5D=pending&page%5Bsize%5D=100" | \
  jq '.meta.pagination["total-count"]')

echo "Pending runs: $PENDING"

# Alert if queue is building up
if [ "$PENDING" -gt 10 ]; then
  echo "WARNING: Run queue depth is $PENDING"
fi
```

### Optimize Run Duration

Shorter runs mean faster queue throughput. Reduce run time by:

```hcl
# Split large workspaces into smaller ones
# Instead of one workspace with 200 resources,
# use four workspaces with 50 resources each

# Use targeted plans when you know what changed
# terraform plan -target=aws_instance.app
# (Only available in CLI-driven mode)
```

## Workspace-Level Run Queuing

Within a single workspace, runs queue automatically. Only one run can be active per workspace at a time, regardless of your organization-level concurrency limit.

```text
# Within workspace "app-prod":
# Run 1: [Active - Planning]
# Run 2: [Queued - waiting for Run 1]
# Run 3: [Queued - waiting for Run 2]

# If Run 2 becomes irrelevant, you can discard it
```

You can cancel queued runs that are no longer needed:

```bash
# Cancel a queued run
curl -s \
  --request POST \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  --data '{
    "comment": "Superseded by newer changes"
  }' \
  "https://app.terraform.io/api/v2/runs/run-abc123/actions/cancel"
```

## Run Priorities

HCP Terraform does not have built-in run priority levels, but you can implement soft priorities:

```bash
# Strategy: Use separate workspaces for different priorities
# Production workspaces get triggered first in CI/CD
# Staging workspaces trigger after production plans complete

# In your CI pipeline:
# 1. Trigger production workspace plans first
# 2. Wait for completion
# 3. Then trigger staging workspace plans
```

## Speculative Plans and Concurrency

Speculative plans (triggered by pull requests) also consume concurrent run slots. If your team opens many PRs simultaneously, speculative plans can clog the queue:

```bash
# Check how many speculative plans are running
curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/my-org/runs?filter%5Bstatus%5D=planning&page%5Bsize%5D=100" | \
  jq '[.data[] | select(.attributes["is-speculative"] == true)] | length'
```

To manage this, configure your VCS integration to only trigger speculative plans on specific file changes:

```hcl
# In workspace settings, set a trigger path
# Only run speculative plans when .tf files change
# Ignore changes to docs, tests, etc.
```

## Monitoring Concurrency Metrics

Track your concurrency usage over time:

```bash
#!/bin/bash
# concurrency-report.sh
# Generate a report of run concurrency

ORG="my-company"

# Get runs from the last 24 hours
SINCE=$(date -u -d "-24 hours" +%Y-%m-%dT%H:%M:%SZ)

curl -s \
  --header "Authorization: Bearer $TF_TOKEN" \
  --header "Content-Type: application/vnd.api+json" \
  "https://app.terraform.io/api/v2/organizations/$ORG/runs?filter%5Bfrom%5D=$SINCE&page%5Bsize%5D=100" | \
  jq '{
    total_runs: (.meta.pagination["total-count"]),
    by_status: ([.data[].attributes.status] | group_by(.) | map({(.[0]): length}) | add)
  }'
```

## Summary

Concurrent runs are a capacity constraint you need to plan around. On the free tier, batch changes and use CLI-driven workflows to minimize queue wait times. On paid tiers, parallelize your CI/CD pipelines and monitor queue depth to ensure your concurrency limit matches your team's velocity. The key insight is that concurrency is an organization-level resource shared across all workspaces, so coordination across teams is essential for smooth operations.
