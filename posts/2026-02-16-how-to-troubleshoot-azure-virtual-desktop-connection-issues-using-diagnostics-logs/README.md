# How to Troubleshoot Azure Virtual Desktop Connection Issues Using Diagnostics Logs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Virtual Desktop, Diagnostics, Troubleshooting, Log Analytics, AVD, Monitoring, Connection Issues

Description: A practical guide to troubleshooting Azure Virtual Desktop connection failures and performance issues using diagnostics logs and Log Analytics queries.

---

Azure Virtual Desktop connection issues are frustrating for both end users and IT admins. A user reports that they cannot connect, or their session keeps dropping, or it takes forever to load. Without proper diagnostics, you are left guessing. The good news is that AVD generates detailed diagnostics data that you can route to a Log Analytics workspace and query for answers. This guide shows you how to set up diagnostics collection and use it to resolve the most common connection problems.

## Setting Up Diagnostics Collection

Before you can troubleshoot anything, you need diagnostics data flowing into Log Analytics. If you have not already configured this, here is how to do it.

### Step 1: Create a Log Analytics Workspace

If you do not already have a workspace, create one:

```bash
# Create a Log Analytics workspace using Azure CLI
az monitor log-analytics workspace create \
    --resource-group rg-avd-production \
    --workspace-name law-avd-diagnostics \
    --location eastus \
    --retention-time 90
```

### Step 2: Enable Diagnostics on the Host Pool

Each AVD host pool needs a diagnostic setting that sends logs to your workspace. You can configure this in the portal or via CLI:

```bash
# Get the host pool resource ID
HOST_POOL_ID=$(az desktopvirtualization hostpool show \
    --name hp-production \
    --resource-group rg-avd-production \
    --query id -o tsv)

# Get the workspace resource ID
WORKSPACE_ID=$(az monitor log-analytics workspace show \
    --workspace-name law-avd-diagnostics \
    --resource-group rg-avd-production \
    --query id -o tsv)

# Create the diagnostic setting
# This sends all AVD log categories to Log Analytics
az monitor diagnostic-settings create \
    --name avd-diagnostics \
    --resource "$HOST_POOL_ID" \
    --workspace "$WORKSPACE_ID" \
    --logs '[
        {"category": "Checkpoint", "enabled": true},
        {"category": "Error", "enabled": true},
        {"category": "Management", "enabled": true},
        {"category": "Connection", "enabled": true},
        {"category": "HostRegistration", "enabled": true},
        {"category": "AgentHealthStatus", "enabled": true},
        {"category": "NetworkData", "enabled": true},
        {"category": "ConnectionGraphicsData", "enabled": true}
    ]'
```

It takes about 15 to 30 minutes for data to start appearing after you enable diagnostics. Do not panic if you query immediately and see nothing.

## Understanding the Log Tables

AVD diagnostics data lands in several tables within Log Analytics:

- **WVDConnections** - Records for every connection attempt, including successes and failures
- **WVDErrors** - Detailed error information linked to connection activities
- **WVDCheckpoints** - Granular event checkpoints during the connection lifecycle
- **WVDAgentHealthStatus** - Health status of the AVD agent running on session hosts
- **WVDConnectionNetworkData** - Network performance metrics for active connections
- **WVDConnectionGraphicsData** - Graphics rendering performance data

The most useful table for troubleshooting connection failures is WVDConnections joined with WVDErrors. Let me walk through the common scenarios.

## Scenario 1: Finding Failed Connections

When users report they cannot connect, start by looking at recent connection failures:

```kusto
// Find all failed connections in the last 24 hours
// Join with errors to get the failure reason
WVDConnections
| where TimeGenerated > ago(24h)
| where State == "Failed" or State == "Broken"
| join kind=leftouter (
    WVDErrors
    | where TimeGenerated > ago(24h)
) on CorrelationId
| project TimeGenerated, UserName, SessionHostName, State,
    ErrorCode = CodeSymbolic, ErrorMessage = Message,
    ClientOS, ClientType, ClientVersion
| order by TimeGenerated desc
```

This query gives you a clear picture: who failed, when, what session host they were targeting, and what error occurred. The ErrorCode is particularly useful for looking up Microsoft documentation.

## Scenario 2: Diagnosing Slow Connections

Users often complain about slow connections rather than outright failures. The connection process has multiple phases, and you can measure the time spent in each:

```kusto
// Measure connection duration by phase
// This helps identify which step is causing delays
WVDCheckpoints
| where TimeGenerated > ago(7d)
| where Name in ("LoadBalancedNewConnection", "SessionHostFound",
    "SessionCreated", "ConnectionSucceeded")
| summarize Timestamp = min(TimeGenerated) by CorrelationId, Name
| evaluate pivot(Name, min(Timestamp))
| extend LoadBalancingDuration = datetime_diff('second',
    SessionHostFound, LoadBalancedNewConnection)
| extend SessionCreationDuration = datetime_diff('second',
    SessionCreated, SessionHostFound)
| extend TotalConnectionTime = datetime_diff('second',
    ConnectionSucceeded, LoadBalancedNewConnection)
| where TotalConnectionTime > 30
| order by TotalConnectionTime desc
```

If the load balancing duration is high, you might have too few available session hosts. If session creation takes long, the session hosts might be overloaded or the user profile is taking too long to load (common with FSLogix profile containers on slow storage).

## Scenario 3: Session Drops and Disconnects

Unexpected disconnections are often network-related. The NetworkData table has round-trip time and bandwidth metrics:

```kusto
// Find sessions with poor network quality
// High RTT or packet loss often explains disconnects
WVDConnectionNetworkData
| where TimeGenerated > ago(7d)
| summarize
    AvgRTT = avg(EstRoundTripTimeInMs),
    MaxRTT = max(EstRoundTripTimeInMs),
    AvgBandwidth = avg(EstAvailableBandwidthKBps)
    by CorrelationId
| where AvgRTT > 150 or MaxRTT > 300
| join kind=inner (
    WVDConnections
    | where TimeGenerated > ago(7d)
    | project CorrelationId, UserName, SessionHostName, ClientOS
) on CorrelationId
| order by AvgRTT desc
```

When you see consistently high round-trip times for a particular user, the issue is typically on the client side - their home network, VPN configuration, or distance from the Azure region hosting the session hosts.

## Scenario 4: Session Host Health Issues

Sometimes the problem is not the connection itself but the session host being unhealthy:

```kusto
// Check session host health over the last 24 hours
// Look for hosts that are not reporting healthy status
WVDAgentHealthStatus
| where TimeGenerated > ago(24h)
| summarize arg_max(TimeGenerated, *) by SessionHostName
| where HealthStatus != "Healthy"
| project SessionHostName, HealthStatus, LastHeartBeat,
    UpgradeState = AgentVersion, ActiveSessions
| order by LastHeartBeat asc
```

Unhealthy session hosts can show up as "Unavailable," "NeedsAssistance," or "Shutdown." Each status has different remediation steps. Unavailable usually means the VM is stopped or the agent has crashed. NeedsAssistance often indicates a domain join issue or expired SAS token.

## Scenario 5: Specific User Troubleshooting

When a specific user reports problems, you want their full connection history:

```kusto
// Full connection history for a specific user
// Replace the UPN with the actual user
let targetUser = "john.doe@contoso.com";
WVDConnections
| where TimeGenerated > ago(7d)
| where UserName == targetUser
| join kind=leftouter (
    WVDErrors
    | where TimeGenerated > ago(7d)
) on CorrelationId
| project TimeGenerated, State, SessionHostName,
    ClientOS, ClientType, ClientVersion,
    ErrorCode = CodeSymbolic, ErrorMessage = Message
| order by TimeGenerated desc
```

This query is my go-to when someone opens a support ticket. It quickly shows whether the user has a pattern of failures, what clients they are using, and whether the problem is consistent across session hosts.

## Building an Alerting Dashboard

Beyond ad-hoc troubleshooting, you should set up proactive alerts. Here is a query that catches connection failure spikes:

```kusto
// Alert when failure rate exceeds 10% in a 15-minute window
WVDConnections
| where TimeGenerated > ago(15m)
| summarize
    TotalConnections = count(),
    FailedConnections = countif(State == "Failed")
| extend FailureRate = round(todouble(FailedConnections) /
    todouble(TotalConnections) * 100, 2)
| where FailureRate > 10
```

Create an Azure Monitor alert rule with this query, set it to run every 15 minutes, and configure an action group to notify your team via email or Teams. This way you know about widespread connection issues before users start calling the help desk.

## Common Error Codes and Fixes

Here are the error codes I see most frequently in AVD diagnostics:

**ConnectionFailedNoHealthyRdshAvailable** - No healthy session hosts are available. Check that your session hosts are running and the AVD agent is healthy. This often happens after a maintenance window where VMs were deallocated and not started again.

**ConnectionFailedClientDisconnect** - The client disconnected during the connection process. This is usually a network blip on the user's end. If it happens repeatedly for the same user, investigate their network path.

**ConnectionFailedUserUnauthorized** - The user does not have the necessary RBAC role assignment to access the application group. Verify that the user or their group is assigned the "Desktop Virtualization User" role on the application group.

**ConnectionFailedVMNotFound** - The session host VM was not found. This can happen if the VM was deleted but the session host registration was not cleaned up.

## Retention and Cost Considerations

Diagnostics logs in Log Analytics are not free. AVD generates a moderate amount of data - roughly 1 to 5 GB per month for a 100-user environment, depending on which categories you enable. Set your retention to match your compliance requirements (30, 60, or 90 days are common choices) and consider archiving older data to a storage account if you need long-term retention for audit purposes.

## Summary

Effective troubleshooting of Azure Virtual Desktop connection issues starts with having diagnostics data in Log Analytics. Once the data is flowing, Kusto queries let you quickly identify failed connections, slow session creation, network problems, and unhealthy session hosts. Set up proactive alerting to catch issues before they become widespread, and keep a library of the queries in this guide for when you need to dig into specific problems. The few minutes spent configuring diagnostics will save you hours of guesswork when things go wrong.
