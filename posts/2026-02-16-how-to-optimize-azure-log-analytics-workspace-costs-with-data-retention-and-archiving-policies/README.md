# How to Optimize Azure Log Analytics Workspace Costs with Data Retention and Archiving Policies

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Log Analytics, Cost Optimization, Data Retention, Archiving, Log Management, Azure Monitor

Description: Learn how to reduce Azure Log Analytics costs by configuring data retention policies, table-level archiving, and other cost optimization strategies.

---

Log Analytics costs sneak up on you. You start by enabling a few diagnostic settings, add some VM monitoring, connect Application Insights, and before you know it, you are ingesting 50 GB per day at $2.76 per GB. That is over $4,000 a month, and a lot of that data might be sitting there untouched after the first week. Retention and archiving policies are the primary levers you have to control these costs without losing access to data you might need later.

This post covers how to configure retention and archiving at the workspace and table level, how to estimate your savings, and how to build a cost-optimized data management strategy.

## Understanding the Cost Structure

Log Analytics costs come from two main components:

**Data ingestion**: You pay for every GB of data written to the workspace. This is the biggest cost for most organizations. The pay-as-you-go rate is around $2.76 per GB (varies by region). Commitment tiers offer discounts: 100 GB/day starts at about $1.96 per GB effective.

**Data retention**: The first 31 days of retention are free (included in the ingestion cost). After that, you pay approximately $0.10 per GB per month for interactive retention. Archived data costs about $0.02 per GB per month.

The key insight is that you pay a premium for data that is immediately queryable (interactive retention) but much less for data that is archived (searchable but with slower query performance).

## Workspace-Level Retention

The workspace-level retention setting applies to all tables by default. You can set it between 30 and 730 days.

```bash
# Set workspace-level retention to 90 days
az monitor log-analytics workspace update \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --retention-time 90
```

Data older than 90 days (in this example) is permanently deleted unless you have table-level overrides or archiving configured.

## Table-Level Retention

Not all data has the same value over time. Security audit logs might need 2 years of retention for compliance, while performance counters lose their value after 30 days. Table-level retention lets you set different policies per table.

```bash
# Set SecurityEvent table retention to 365 days
az monitor log-analytics workspace table update \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --name SecurityEvent \
  --retention-time 365

# Set Perf table retention to 30 days (minimum)
az monitor log-analytics workspace table update \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --name Perf \
  --retention-time 30

# Set ContainerLog retention to 60 days
az monitor log-analytics workspace table update \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --name ContainerLog \
  --retention-time 60
```

Table-level retention overrides the workspace-level setting. If the workspace is set to 90 days and a table is set to 365 days, that table keeps data for 365 days.

## Archiving Data

This is where the real savings come in. Archiving moves data from the interactive analytics store to a lower-cost archive store. Archived data can still be queried, but with some limitations:

- You use a special `search` job or `restore` operation to query archived data.
- Queries against archived data are slower and run asynchronously.
- There is a per-GB charge for searching archived data.

The benefit is that the storage cost drops from about $0.10/GB/month (interactive) to about $0.02/GB/month (archive). That is an 80% reduction.

To configure archiving, you set a total retention period that extends beyond the interactive retention period. The difference between the two is the archive period.

```bash
# Set SecurityEvent to 90 days interactive + archive up to 730 days total
az monitor log-analytics workspace table update \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --name SecurityEvent \
  --retention-time 90 \
  --total-retention-time 730
```

In this example, SecurityEvent data is interactively queryable for 90 days. After 90 days, it moves to the archive tier where it stays until day 730, then it is deleted.

## Querying Archived Data

Archived data cannot be queried with normal KQL queries. You have two options:

### Search Jobs

A search job runs a KQL query against archived data and places the results in a new table that you can then query interactively.

```bash
# Create a search job to find specific security events in archived data
az monitor log-analytics workspace table search-job create \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --name "SecuritySearch_SRCH" \
  --search-query "SecurityEvent | where EventID == 4625" \
  --start-search-time "2025-06-01T00:00:00Z" \
  --end-search-time "2025-07-01T00:00:00Z" \
  --limit 10000
```

Search jobs are billed per GB of data scanned. The results land in a table with the `_SRCH` suffix.

### Restore

A restore operation makes a specific time range of archived data available for interactive queries in a temporary table.

```bash
# Restore SecurityEvent data from a specific time range
az monitor log-analytics workspace table restore create \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --name "SecurityEvent_RST" \
  --start-restore-time "2025-06-15T00:00:00Z" \
  --end-restore-time "2025-06-16T00:00:00Z" \
  --table "SecurityEvent"
```

Restore operations are also billed per GB. They are best for situations where you need full interactive query capabilities on a specific time range of archived data.

## Estimating Cost Savings

Let us work through an example. Suppose you ingest 100 GB per day across these tables:

| Table | Daily Volume | Current Retention | Needed Retention |
|-------|-------------|-------------------|-----------------|
| Perf | 30 GB | 90 days | 30 days |
| ContainerLog | 25 GB | 90 days | 45 days |
| SecurityEvent | 20 GB | 90 days | 365 days (archive after 90) |
| AzureDiagnostics | 15 GB | 90 days | 30 days |
| Other | 10 GB | 90 days | 90 days |

With a flat 90-day retention on everything, you are storing about 9,000 GB at the interactive rate (100 GB x 90 days). The retention cost beyond the free 31 days is roughly 100 GB x 59 days x $0.10/30 = about $19,667 per month.

By adjusting retention:

- Perf: Drop from 90 to 30 days. Saves 30 GB x 60 days = 1,800 GB of storage.
- ContainerLog: Drop from 90 to 45 days. Saves 25 GB x 45 days = 1,125 GB.
- AzureDiagnostics: Drop from 90 to 30 days. Saves 15 GB x 60 days = 900 GB.
- SecurityEvent: Keep 90 days interactive, archive 275 more days. Archive cost for 20 GB x 275 days at $0.02/GB/month is much lower than interactive.

The total savings from reducing interactive retention alone could be 40-60% of your retention costs.

## Finding Your Biggest Data Consumers

Before optimizing, identify which tables are consuming the most space.

```
// Top tables by data volume over the past 30 days
Usage
| where TimeGenerated > ago(30d)
| summarize TotalGB = sum(Quantity) / 1024 by DataType
| order by TotalGB desc
| take 20
```

Focus your optimization efforts on the top 3-5 tables, as they typically account for 80% or more of the total volume.

## Reducing Ingestion Volume

Retention is only half the equation. Reducing what you ingest in the first place saves both ingestion and retention costs.

**Use ingestion-time transformations**: Data Collection Rules support KQL transformations that can filter, parse, and drop fields before data is stored. Drop columns you never query and filter out noisy log entries.

```
// Example transformation in a DCR that drops DEBUG logs and removes a verbose field
source
| where SeverityLevel != "DEBUG"
| project-away VerboseStackTrace
```

**Adjust sampling**: For Application Insights, configure sampling to reduce the volume of requests and dependency telemetry.

**Review diagnostic settings**: Do you really need all log categories enabled on every resource? Disable categories you are not actively using.

**Deduplicate**: Some data sources send redundant information. Use transformations to deduplicate before ingestion.

## Commitment Tiers

If your workspace consistently ingests more than 100 GB per day, commitment tiers offer significant per-GB discounts.

| Tier | Per-GB Cost | Savings vs Pay-as-you-go |
|------|-------------|--------------------------|
| Pay-as-you-go | ~$2.76 | Baseline |
| 100 GB/day | ~$1.96 | ~29% |
| 200 GB/day | ~$1.86 | ~33% |
| 300 GB/day | ~$1.76 | ~36% |
| 500 GB/day | ~$1.66 | ~40% |

```bash
# Change to a commitment tier
az monitor log-analytics workspace update \
  --resource-group rg-monitoring \
  --workspace-name law-central \
  --sku CapacityReservation \
  --capacity-reservation-level 100
```

Commitment tiers require a 31-day minimum commitment. If your daily volume fluctuates, size the tier for your average, not your peak - you pay per-GB at the pay-as-you-go rate for any overage above the commitment.

## Monitoring Your Costs

Set up alerts and dashboards to track ingestion trends.

```
// Daily ingestion trend for the past 30 days
Usage
| where TimeGenerated > ago(30d)
| where IsBillable == true
| summarize DailyGB = sum(Quantity) / 1024 by bin(TimeGenerated, 1d)
| render timechart
```

Create an alert if daily ingestion exceeds your expected threshold. Unexpected spikes usually indicate a misconfigured diagnostic setting, a noisy application, or a change in workload.

## Wrapping Up

Cost optimization for Log Analytics is a continuous process, not a one-time exercise. Start by identifying your biggest data consumers with the Usage table, then set table-level retention policies based on actual needs. Use archiving for data that needs long-term storage but not frequent access. Reduce ingestion volume with DCR transformations, sampling, and selective diagnostic settings. And if your consistent daily volume exceeds 100 GB, switch to a commitment tier. These combined strategies can typically reduce your Log Analytics spending by 40-70% without any meaningful loss in monitoring capability.
