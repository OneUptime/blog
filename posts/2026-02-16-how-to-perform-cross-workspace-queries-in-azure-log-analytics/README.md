# How to Perform Cross-Workspace Queries in Azure Log Analytics

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Log Analytics, Cross-Workspace Queries, KQL, Azure Monitor, Log Management, Multi-Workspace

Description: Learn how to write cross-workspace queries in Azure Log Analytics to correlate data across multiple workspaces for centralized analysis and troubleshooting.

---

Most organizations end up with more than one Log Analytics workspace. Maybe you have one per environment (dev, staging, prod), one per team, one per region, or one per compliance boundary. That is fine for data isolation, but it creates a problem: how do you query across workspaces when you need to correlate data from different sources?

Cross-workspace queries in Azure Log Analytics let you run a single KQL query that pulls data from multiple workspaces. This post covers the syntax, use cases, performance considerations, and limitations you need to know about.

## Why Multiple Workspaces?

Before jumping into the how, it helps to understand why organizations end up with multiple workspaces in the first place.

**Data sovereignty**: Some regulations require that data stay in specific geographic regions. A European workspace and a US workspace keep data within their respective boundaries.

**Access control**: Different teams need access to different data. Separate workspaces make RBAC simpler than table-level or row-level access control within a single workspace.

**Cost separation**: Different departments want separate billing for their monitoring data.

**Retention requirements**: Different data types have different retention needs. Separate workspaces let you set different retention policies.

**Volume and performance**: Extremely high-volume log sources can benefit from dedicated workspaces to avoid affecting query performance for other users.

The trade-off is that correlation becomes harder. Cross-workspace queries bridge that gap.

## Basic Cross-Workspace Query Syntax

The `workspace()` function lets you reference a table in another workspace from within your query. The most reliable ways to reference a workspace are by workspace ID or full Azure resource ID:

```text
// By workspace name or resource name (allowed, but not recommended because it can be ambiguous and less efficient)
workspace("law-production").SecurityEvent
| where TimeGenerated > ago(1h)
| take 10

// By workspace ID (globally unique, works across subscriptions)
workspace("12345678-abcd-1234-abcd-123456789012").SecurityEvent
| where TimeGenerated > ago(1h)
| take 10

// By full resource ID (explicit and efficient)
workspace("/subscriptions/<sub-id>/resourcegroups/rg-monitoring/providers/microsoft.operationalinsights/workspaces/law-production").SecurityEvent
| where TimeGenerated > ago(1h)
| take 10
```

The function returns a reference to the specified workspace, and you append the table name with dot notation. From there, the query works just like a local table.

## Joining Data Across Workspaces

The most common use case is joining data from different workspaces to correlate events. For example, correlating security events from a security workspace with application logs from an application workspace.

```text
// Join security sign-in events with application errors
// to identify if failed logins correlate with application issues
let signIns = workspace("law-security").SigninLogs
| where TimeGenerated > ago(4h)
| where ResultType != "0" // Failed sign-ins
| summarize FailedLogins = count() by bin(TimeGenerated, 15m), UserPrincipalName;
let appErrors = workspace("law-application").AppExceptions
| where TimeGenerated > ago(4h)
| summarize Exceptions = count() by bin(TimeGenerated, 15m);
signIns
| join kind=inner appErrors on TimeGenerated
| project TimeGenerated, UserPrincipalName, FailedLogins, Exceptions
```

## Union Across Workspaces

Sometimes you want to query the same table across multiple workspaces and combine the results. The `union` operator handles this.

```text
// Combine heartbeat data from all environment workspaces
// to get a unified view of all servers
union
    workspace("law-production").Heartbeat,
    workspace("law-staging").Heartbeat,
    workspace("law-development").Heartbeat
| where TimeGenerated > ago(1h)
| summarize LastHeartbeat = max(TimeGenerated) by Computer, _WorkspaceId = TenantId
| where LastHeartbeat < ago(10m)
| order by LastHeartbeat asc
```

The `TenantId` column (also accessible as `_WorkspaceId` in some contexts) tells you which workspace each record came from.

## Cross-Workspace Queries for Multi-Region Monitoring

If you have workspaces in different regions for data sovereignty, cross-workspace queries let you build a global view.

```text
// CPU utilization across all regional workspaces
union
    workspace("law-us-east").Perf,
    workspace("law-eu-west").Perf,
    workspace("law-asia-southeast").Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor" and CounterName == "% Processor Time" and InstanceName == "_Total"
| summarize AvgCPU = avg(CounterValue), MaxCPU = max(CounterValue) by Computer
| where AvgCPU > 80
| order by AvgCPU desc
```

## Cross-Resource Queries with Application Insights

You can also query across Application Insights resources using the `app()` function, similar to `workspace()`.

```text
// Correlate server-side errors with client-side page views
let serverErrors = workspace("law-backend").AppExceptions
| where TimeGenerated > ago(1h)
| summarize ServerErrors = count() by TimeBucket = bin(TimeGenerated, 5m), OperationName;
let clientMetrics = app("ai-frontend").pageViews
| where timestamp > ago(1h)
| summarize PageViews = count(), AvgDuration = avg(duration) by TimeBucket = bin(timestamp, 5m), OperationName = operation_Name;
serverErrors
| join kind=leftouter clientMetrics on OperationName, TimeBucket
| project TimeBucket, OperationName, ServerErrors, PageViews, AvgDuration
```

## Performance Considerations

Cross-workspace queries are powerful, but they are not free. Here are some things to keep in mind.

**Query latency**: Cross-workspace queries are slower than single-workspace queries because the query engine needs to fan out to multiple clusters, execute the query in parallel, and merge the results. For two workspaces in the same region, the overhead is usually small (a few hundred milliseconds). For workspaces in different regions, latency is higher due to network round trips.

**Data volume**: The amount of data returned and the time range queried across workspaces count toward Azure Monitor query limits. For example, Azure Monitor service limits include data returned per workspace and query-hour limits, and the Logs Query API has default and maximum timeouts. If you are querying large tables across many workspaces, you may hit these limits.

**Filter early**: Always push `where` clauses as close to the data source as possible. Instead of pulling all data from remote workspaces and then filtering, filter within the `workspace()` reference.

```text
// Good: filter happens at the remote workspace
let remoteData = workspace("law-production").SecurityEvent
| where TimeGenerated > ago(1h)
| where EventID == 4625;

// Bad: pulls all SecurityEvent data and then filters
let remoteData = workspace("law-production").SecurityEvent;
remoteData
| where TimeGenerated > ago(1h)
| where EventID == 4625
```

The query optimizer handles most of these cases, but being explicit helps.

**Use summarize to reduce data**: If you are joining data from a remote workspace, summarize it before the join to reduce the amount of data transferred across the network.

```text
// Summarize remote data before joining
let remoteMetrics = workspace("law-production").Perf
| where TimeGenerated > ago(1h)
| where ObjectName == "Processor"
| summarize AvgCPU = avg(CounterValue) by Computer, bin(TimeGenerated, 5m);
// Now join with local data
Heartbeat
| where TimeGenerated > ago(1h)
| join kind=inner remoteMetrics on Computer
```

## Access Control

To run a cross-workspace query, you need at least Reader access on the remote workspace. If you try to query a workspace you do not have access to, you get an error. This is by design - cross-workspace queries do not bypass RBAC.

For service accounts or automation, you can use a service principal with Reader access on all relevant workspaces. For interactive use in the portal, the query runs under the signed-in user's permissions.

## Limitations

**Maximum workspaces**: A single cross-workspace query can reference up to 100 workspaces. If you have more than 100, you will need to break the query into multiple parts.

**No cross-tenant by default**: Querying workspaces in different Azure AD tenants requires Azure Lighthouse or cross-tenant access configuration.

**Alert rule limitations**: Log search alert rules support cross-workspace queries, but there are some caveats. Cross-resource queries in log search alerts require the current `scheduledQueryRules` API rather than the legacy Log Analytics Alerts API. Evaluation may be slower due to the cross-workspace fan-out.

**Workbook queries**: Azure Workbooks fully support cross-workspace queries. You can build dashboards that aggregate data from all your workspaces.

## Building a Central Monitoring View

A common pattern is to create a "central monitoring" workbook that queries across all your workspaces. Here is the general approach:

1. Create a parameter in the workbook for workspace selection (or hardcode the list).
2. Use `union` with `workspace()` calls to pull data from all workspaces.
3. Add a computed column for the workspace name or region.
4. Build visualizations that let you filter by workspace.

This gives you a single pane of glass without consolidating all data into one workspace.

## Wrapping Up

Cross-workspace queries solve the correlation problem that comes with multi-workspace architectures. Use `workspace()` for querying specific workspaces, `union` for combining the same table across multiple workspaces, and `app()` for querying Application Insights resources. Keep performance in mind by filtering early, summarizing before joins, and staying within the 100-workspace limit. With these techniques, you get the benefits of data isolation without sacrificing the ability to see the big picture.
