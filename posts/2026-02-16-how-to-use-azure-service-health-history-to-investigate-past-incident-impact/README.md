# How to Use Azure Service Health History to Investigate Past Incident Impact

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Service Health, Incident Management, Post-Mortem, Root Cause Analysis, Monitoring, Troubleshooting

Description: Learn how to use Azure Service Health history to dig into past incidents, correlate them with your application issues, and build better post-mortems.

---

When your application had an outage last Tuesday and you need to figure out whether Azure was part of the problem, Azure Service Health history is where you start. It gives you a detailed record of past incidents, maintenance events, and health advisories that affected the services and regions tied to your subscriptions. In this post, I will walk through how to use Service Health history effectively for incident investigation, how to correlate Azure incidents with your own monitoring data, and how to turn that information into useful post-mortems.

## Accessing Service Health History

### Through the Azure Portal

Open the Azure portal and search for "Service Health." In the left navigation, click "Health history." This view shows past events going back 90 days by default. You can filter by:

- **Time range** - adjust the start and end dates
- **Event type** - service issues, planned maintenance, health advisories, security advisories
- **Subscription** - if you have multiple subscriptions
- **Services** - filter to specific Azure services
- **Regions** - filter to specific regions

Each event in the list shows a title, the affected services and regions, start and end times, and the current status (resolved, active, etc.). Click on any event to see the full details including the root cause analysis (RCA) if one has been published.

### Through the REST API

For programmatic access, use the Resource Health Events API:

```bash
# Query health history events for the past 30 days
# The filter uses OData syntax to narrow down results
az rest --method get \
  --url "https://management.azure.com/subscriptions/<sub-id>/providers/Microsoft.ResourceHealth/events?api-version=2022-10-01&\$filter=eventType eq 'ServiceIssue' and properties.impactStartTime ge 2026-01-17" \
  --query "value[].{title:properties.title, status:properties.status, start:properties.impactStartTime, end:properties.impactMitigationTime, services:properties.impact[].impactedService}"
```

### Through Azure Monitor Activity Log

Service Health events also live in the Activity Log. This is useful because you can query them alongside your own application's activity log events:

```bash
# List Service Health events from the Activity Log
# This gives you the events in the same timeline as your resource operations
az monitor activity-log list \
  --offset 30d \
  --query "[?category.value=='ServiceHealth'].{title:properties.title, type:properties.incidentType, status:properties.stage, start:properties.impactStartTime, end:properties.impactMitigationTime}" \
  --output table
```

## Reading a Service Health Incident Report

When you click into a specific incident, you will see several sections that are valuable for investigation.

### Summary

The summary gives you a high-level description of what happened. It typically includes the symptoms customers experienced, like "customers may have experienced intermittent connectivity failures to Azure SQL Database in East US 2."

### Impact

This section lists exactly which services and regions were affected. Cross-reference this with your own deployment topology. If the incident affected "Virtual Machines - East US" and you have VMs in East US, this is a strong signal.

### Timeline Updates

Service Health provides a running timeline of communications during the incident. These updates show when the issue was detected, what mitigation steps were taken, when service was restored, and preliminary root cause information. The timestamps here are critical for correlating with your monitoring data.

### Root Cause Analysis (RCA)

For major incidents, Microsoft publishes a detailed RCA within a few days. This document explains what went wrong at a technical level, what Microsoft is doing to prevent recurrence, and often includes specific timestamps for different phases of the incident. RCAs are invaluable for post-mortems.

## Correlating Azure Incidents with Your Application Issues

The real power of Service Health history comes when you combine it with your own monitoring data. Here is a systematic approach.

### Step 1: Establish the Timeline

When investigating an application issue, the first thing you need is a clear timeline. Pull the start and end times from your monitoring tool (Azure Monitor, OneUptime, Datadog, etc.) and note when your users started reporting problems and when things recovered.

### Step 2: Check Service Health History

Go to Service Health history and look for any events that overlap with your incident timeline. Filter by the services and regions your application uses. Even if the timing does not perfectly overlap, check events that started shortly before your incident - cascading failures can take time to manifest.

### Step 3: Compare Symptoms

Read the incident description carefully. Does it match what your application experienced? If the Azure incident says "intermittent DNS resolution failures" and your logs show DNS timeout errors, you have a strong correlation. If the Azure incident says "elevated latency for storage operations" and your issue was a complete outage, the Azure incident might be a contributing factor but not the sole cause.

### Step 4: Check Resource Health for Specific Resources

Beyond service-level incidents, check Resource Health for the specific resources that were impacted. Navigate to each resource and look at its health history. Resource Health tracks events like:

- VM reboot due to host maintenance
- Unavailable status detected by the platform
- Health state transitions

```bash
# Check resource health events for a specific VM
az rest --method get \
  --url "https://management.azure.com/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Compute/virtualMachines/<vm-name>/providers/Microsoft.ResourceHealth/availabilityStatuses?api-version=2023-07-01-preview&\$expand=recommendedactions" \
  --query "value[].{status:properties.availabilityState, summary:properties.summary, time:properties.occuredTime}"
```

### Step 5: Cross-Reference with Azure Monitor Metrics

Azure Monitor metrics give you the quantitative data to confirm the correlation. Pull metrics for the affected resources during the incident window:

```bash
# Get CPU and availability metrics for a VM during the incident window
# Replace the timestamps with your actual incident window
az monitor metrics list \
  --resource "/subscriptions/<sub-id>/resourceGroups/<rg>/providers/Microsoft.Compute/virtualMachines/<vm-name>" \
  --metric "Percentage CPU" \
  --start-time 2026-01-20T14:00:00Z \
  --end-time 2026-01-20T16:00:00Z \
  --interval PT1M \
  --output table
```

## Building a Post-Mortem with Service Health Data

Once you have correlated the data, it is time to put together a post-mortem. Here is a template that incorporates Azure Service Health information effectively.

### Incident Summary

Start with what happened from your users' perspective. "Between 14:15 and 15:42 UTC on January 20th, approximately 30% of API requests returned 503 errors."

### Contributing Factors

This is where Azure Service Health data goes. "During this window, Azure Service Health reported an active incident (Tracking ID: ABC-123) affecting Azure SQL Database in East US 2. The incident description states that customers experienced intermittent connectivity failures."

### Timeline

Build a merged timeline that includes both your application events and the Azure incident communications:

| Time (UTC) | Source | Event |
|---|---|---|
| 14:00 | Azure Service Health | Issue first reported by Microsoft |
| 14:15 | Application Monitoring | Error rate exceeds 5% threshold, alert fires |
| 14:22 | On-call Engineer | Begins investigation |
| 14:30 | Azure Service Health | Update: Microsoft confirms impact to SQL Database |
| 14:45 | On-call Engineer | Identifies database connectivity as root cause, correlates with Azure incident |
| 15:30 | Azure Service Health | Update: Mitigation applied, monitoring for recovery |
| 15:42 | Application Monitoring | Error rate returns to baseline |
| 16:00 | Azure Service Health | Incident resolved |

### What Went Well

Note the things that worked during the incident. Did your alerts fire quickly? Did the team correlate with Azure Service Health promptly?

### What Could Be Improved

This is the action item section. Common findings include:
- "We need automated correlation between our alerts and Azure Service Health events"
- "Our application should gracefully handle transient database failures with retry logic"
- "We should deploy database replicas in a secondary region for read failover"

## Automating Incident Correlation

For teams that want to automate the correlation between Azure incidents and their own monitoring, here is an approach using Azure Logic Apps:

1. Create a Service Health alert that fires for service issues
2. Route the alert to a Logic App via action group
3. The Logic App queries your monitoring tool's API to check if there are any open incidents in the same time window
4. If a match is found, the Logic App adds the Azure Service Health information as a comment on your existing incident

This saves your on-call engineers from having to manually check Service Health during every incident.

## Exporting Health History for Compliance

Some compliance frameworks require you to maintain records of infrastructure incidents. You can export Service Health history data for long-term storage:

```bash
# Export service health events to a JSON file for archival
# This captures all events for the past 90 days
az rest --method get \
  --url "https://management.azure.com/subscriptions/<sub-id>/providers/Microsoft.ResourceHealth/events?api-version=2022-10-01" \
  --output json > service-health-history-$(date +%Y%m%d).json
```

Set this up as a scheduled job to regularly export and archive the data to Azure Blob Storage or your compliance documentation system.

## Wrapping Up

Azure Service Health history is an underused tool in most organizations' incident response toolkit. It provides the Azure-side context you need to answer the question "was it us or was it Azure?" and to build complete post-mortems that account for infrastructure-level contributing factors. Make it a standard step in your incident investigation process: every time your application has an issue, check Service Health history for overlapping events. Over time, this discipline will help you distinguish between issues you can fix and issues that need architectural resilience against platform-level problems.
