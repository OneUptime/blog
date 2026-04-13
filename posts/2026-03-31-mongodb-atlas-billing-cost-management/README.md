# How to Use Atlas Billing and Cost Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MongoDB, Atlas, Billing, Cost Management, FinOps

Description: Understand MongoDB Atlas billing components, set up cost alerts, query invoices via the API, and apply cost-saving strategies for your clusters.

---

## Overview

MongoDB Atlas bills hourly for compute, storage, data transfer, and additional services such as Atlas Search and online archive. Understanding the billing model and using Atlas cost management tools helps prevent budget surprises and supports FinOps practices.

## Billing Components

```text
Compute:         Charged per cluster tier (M10, M30, M50, etc.) per hour
Storage:         Charged per GB/month for data and indexes
Backup:          Charged per GB for continuous cloud backup
Data Transfer:   Charges for data leaving the cloud region
Additional:
  - Atlas Search (M10+ clusters with dedicated search nodes)
  - Atlas Data Federation query execution
  - Atlas App Services (function invocations, sync)
  - Database Auditing (M10+ only)
```

## Viewing Invoices via the Admin API

```bash
PUBLIC_KEY="your-public-key"
PRIVATE_KEY="your-private-key"
ORG_ID="your-org-id"

# List all invoices for the organization
curl -s -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  "https://cloud.mongodb.com/api/atlas/v2/orgs/${ORG_ID}/invoices" \
  | jq '.results[] | {id: .id, startDate: .startDate, endDate: .endDate, amountBilledCents: .amountBilledCents}'
```

```bash
# Get line items for a specific invoice
INVOICE_ID="your-invoice-id"
curl -s -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  "https://cloud.mongodb.com/api/atlas/v2/orgs/${ORG_ID}/invoices/${INVOICE_ID}" \
  | jq '.lineItems[] | {service: .sku, totalPriceCents: .totalPriceCents, projectId: .groupId}'
```

## Setting Up Cost Alerts

Atlas can alert you when spending exceeds a threshold.

```bash
curl -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  --header "Content-Type: application/json" \
  --request POST \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/alertConfigs" \
  --data '{
    "eventTypeName": "PENDING_INVOICE_OVER_THRESHOLD",
    "enabled": true,
    "threshold": {
      "operator": "GREATER_THAN",
      "threshold": 500,
      "units": "RAW"
    },
    "notifications": [
      {
        "typeName": "EMAIL",
        "emailAddress": "platform-team@example.com",
        "intervalMin": 60
      }
    ]
  }'
```

## Cost-Saving Strategies

**Pause development clusters overnight.**

```bash
# Pause a non-production cluster (M10+ dedicated clusters only, not M0/Flex)
atlas clusters pause dev-cluster --projectId <PROJECT_ID>
```

Automate this with a scheduled GitHub Action.

```yaml
name: Pause Dev Cluster
on:
  schedule:
    - cron: '0 20 * * 1-5'  # 8 PM weekdays
jobs:
  pause:
    runs-on: ubuntu-latest
    steps:
      - run: atlas clusters pause dev-cluster --projectId ${{ secrets.PROJECT_ID }}
        env:
          MONGODB_ATLAS_PUBLIC_KEY: ${{ secrets.ATLAS_PUBLIC_KEY }}
          MONGODB_ATLAS_PRIVATE_KEY: ${{ secrets.ATLAS_PRIVATE_KEY }}
```

**Right-size clusters using the Performance Advisor.**

```bash
# List processes to find the process ID (hostname:port) for your cluster
curl -s -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/processes" \
  | jq '.results[] | {id: .id, userAlias: .userAlias}'

# Get process metrics to assess right-sizing
PROCESS_ID="your-hostname:27017"
curl -s -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  "https://cloud.mongodb.com/api/atlas/v2/groups/${PROJECT_ID}/processes/${PROCESS_ID}/measurements?granularity=P1D&period=P7D&m=PROCESS_CPU_USER&m=SYSTEM_MEMORY_USED" \
  | jq '.measurements[] | {name: .name, dataPoints: [.dataPoints[-3:][].value]}'
```

**Use Online Archive to tier cold data off hot clusters.**

Moving data older than 90 days to online archive reduces storage costs on the primary cluster significantly.

## Reading Cost Breakdown by Project

```bash
curl -s -u "${PUBLIC_KEY}:${PRIVATE_KEY}" --digest \
  "https://cloud.mongodb.com/api/atlas/v2/orgs/${ORG_ID}/invoices/pending" \
  | jq '[.lineItems | group_by(.groupId)[] | {project: .[0].groupId, totalCents: map(.totalPriceCents) | add}]'
```

## Summary

Atlas billing covers compute, storage, backup, and data transfer charged hourly. Use the Admin API to retrieve invoices and break down costs by project, set spending alerts to catch overruns early, pause non-production clusters during off-hours, and use the Performance Advisor to right-size clusters that are over-provisioned. Online Archive is the most effective way to reduce storage costs for time-series or archival workloads.
