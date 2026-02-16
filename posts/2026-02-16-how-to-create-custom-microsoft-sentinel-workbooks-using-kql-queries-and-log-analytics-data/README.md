# How to Create Custom Microsoft Sentinel Workbooks Using KQL Queries and Log Analytics Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Microsoft Sentinel, Workbooks, KQL, Log Analytics, Security Dashboards, SIEM

Description: A hands-on guide to building custom Microsoft Sentinel workbooks with KQL queries, interactive parameters, and visualizations for security monitoring dashboards.

---

Microsoft Sentinel comes with dozens of built-in workbooks for common scenarios, but real-world security operations always need custom dashboards. Maybe you want a view that shows failed sign-ins alongside firewall blocks, or a compliance dashboard that tracks specific metrics your auditors care about. Custom workbooks built on KQL (Kusto Query Language) let you create exactly the dashboards you need.

In this post, I will walk through building a custom workbook from scratch, covering interactive parameters, different visualization types, and practical KQL patterns for security data.

## What Are Sentinel Workbooks?

Workbooks are interactive data visualization documents in Microsoft Sentinel (and Azure Monitor more broadly). They combine:

- **KQL queries** that pull data from Log Analytics
- **Visualizations** like charts, tables, maps, and tiles
- **Parameters** that let users filter and interact with the data
- **Text blocks** for context and documentation
- **Groups** for organizing related content

Workbooks are stored as Azure resources and can be shared with your team, exported as templates, or deployed through ARM/Bicep.

## Prerequisites

- Microsoft Sentinel workspace with data flowing in (sign-in logs, security events, etc.)
- Microsoft Sentinel Reader role or higher
- Familiarity with basic KQL syntax

## Step 1: Create a New Workbook

In the Sentinel portal, go to Workbooks. Click "Add workbook." You will get an empty workbook with the visual editor open.

The editor has a toolbar where you can add different element types:

- **Add query:** A KQL query with a visualization
- **Add parameters:** Interactive filters
- **Add text:** Markdown text blocks
- **Add metric:** Azure resource metrics (outside of Log Analytics)
- **Add group:** A collapsible section

## Step 2: Add a Time Range Parameter

Almost every workbook needs a time range filter. Click "Add parameters" and then "Add Parameter."

Configure it:

- **Parameter name:** TimeRange
- **Parameter type:** Time range picker
- **Required:** Yes
- **Default value:** Last 24 hours
- **Available time ranges:** Last hour, Last 4 hours, Last 24 hours, Last 7 days, Last 30 days, Custom

Click "Save" to close the parameter editor. You now have a time picker at the top of your workbook.

## Step 3: Add a Summary Tile Row

Tiles provide at-a-glance numbers. Let us add tiles showing total sign-ins, failed sign-ins, and security alerts in the selected time range.

Click "Add query" and enter this KQL:

```
// Total sign-ins in the selected time range
// Uses the TimeRange parameter from the workbook
SigninLogs
| where TimeGenerated {TimeRange}
| summarize TotalSignIns = count()
```

Under visualization, select "Tiles." Configure the tile:

- **Tile ID:** total-signins
- **Title:** Total Sign-Ins
- **Value:** TotalSignIns

Now add a second query element for failed sign-ins:

```
// Failed sign-ins with percentage calculation
SigninLogs
| where TimeGenerated {TimeRange}
| summarize
    TotalSignIns = count(),
    FailedSignIns = countif(ResultType != "0")
| extend FailureRate = round(todouble(FailedSignIns) / todouble(TotalSignIns) * 100, 1)
| project FailedSignIns, FailureRate
```

Set this to "Tiles" visualization with the value column as FailedSignIns and a subtitle showing the FailureRate.

And a third for security alerts:

```
// Active security alerts in the time range
SecurityAlert
| where TimeGenerated {TimeRange}
| where AlertSeverity in ("High", "Medium")
| summarize AlertCount = count()
```

## Step 4: Add an Interactive Sign-In Chart

Add a time series chart showing sign-in trends. Click "Add query":

```
// Sign-in trend over time, split by success and failure
// bin() creates time buckets for the chart
SigninLogs
| where TimeGenerated {TimeRange}
| summarize
    SuccessCount = countif(ResultType == "0"),
    FailureCount = countif(ResultType != "0")
    by bin(TimeGenerated, {TimeRange:grain})
| order by TimeGenerated asc
```

Set the visualization to "Line chart" or "Area chart." Configure:

- **X axis:** TimeGenerated
- **Y axis:** SuccessCount, FailureCount
- **Chart title:** Sign-In Trends

The `{TimeRange:grain}` syntax automatically adjusts the time bucket size based on the selected time range (1 minute for last hour, 1 hour for last day, etc.).

## Step 5: Add a User Filter Parameter

Make the workbook interactive by adding a user filter. Add a new parameter:

- **Parameter name:** SelectedUser
- **Parameter type:** Drop down
- **Required:** No
- **Get data from:** Query

Use this query to populate the dropdown:

```
// Get list of users with sign-in activity for the dropdown filter
SigninLogs
| where TimeGenerated {TimeRange}
| summarize SignInCount = count() by UserPrincipalName
| order by SignInCount desc
| take 100
| project label = UserPrincipalName, value = UserPrincipalName
```

Set "Allow multiple selections" to No and add an "All" option.

Now modify your existing queries to use this parameter:

```
// Sign-in details filtered by selected user
SigninLogs
| where TimeGenerated {TimeRange}
| where "{SelectedUser}" == "All" or UserPrincipalName == "{SelectedUser}"
| summarize
    TotalSignIns = count(),
    FailedSignIns = countif(ResultType != "0"),
    UniqueApps = dcount(AppDisplayName),
    UniqueLocations = dcount(LocationDetails.city)
    by UserPrincipalName
| order by FailedSignIns desc
| take 25
```

## Step 6: Add a Geographic Map

Maps are effective for showing where sign-in attempts are coming from. Add a query:

```
// Sign-in locations for geographic map visualization
SigninLogs
| where TimeGenerated {TimeRange}
| where isnotempty(LocationDetails.geoCoordinates.latitude)
| extend
    Latitude = todouble(LocationDetails.geoCoordinates.latitude),
    Longitude = todouble(LocationDetails.geoCoordinates.longitude),
    City = tostring(LocationDetails.city),
    Country = tostring(LocationDetails.countryOrRegion)
| summarize
    SignInCount = count(),
    FailedCount = countif(ResultType != "0"),
    UniqueUsers = dcount(UserPrincipalName)
    by Country, City, Latitude, Longitude
| order by SignInCount desc
```

Set the visualization to "Map." Configure:

- **Location:** Latitude/Longitude columns
- **Size:** SignInCount
- **Color:** FailedCount (red for high failure counts)

## Step 7: Add a Security Alerts Table

Add a detailed table for security alerts with conditional formatting:

```
// Security alerts with severity and status
// Color-coded by severity in the workbook visualization settings
SecurityAlert
| where TimeGenerated {TimeRange}
| summarize
    arg_max(TimeGenerated, *) by SystemAlertId
| project
    TimeGenerated,
    AlertName,
    AlertSeverity,
    Status,
    ProductName,
    Tactics,
    // Extract entity information for investigation
    Entities = tostring(parse_json(Entities))
| order by TimeGenerated desc
| take 100
```

Set the visualization to "Grid" (table). Configure conditional formatting:

- AlertSeverity column: Red background for "High," Orange for "Medium," Yellow for "Low"
- Status column: Green for "Resolved," Red for "New"

## Step 8: Add Cross-Resource Queries

Workbooks can query data across multiple Log Analytics workspaces. This is useful if you have data in different workspaces for different environments:

```
// Cross-workspace query for sign-in failures
// Queries both production and staging workspaces
union
    (workspace("production-workspace").SigninLogs
    | where TimeGenerated {TimeRange}
    | where ResultType != "0"
    | extend Environment = "Production"),
    (workspace("staging-workspace").SigninLogs
    | where TimeGenerated {TimeRange}
    | where ResultType != "0"
    | extend Environment = "Staging")
| summarize FailedSignIns = count() by Environment, bin(TimeGenerated, {TimeRange:grain})
```

## Step 9: Add a Group for Organization

Groups let you organize related visualizations into collapsible sections. This keeps large workbooks manageable.

Click "Add group" and give it a title like "Identity Analytics." Then move your sign-in related queries and charts into this group. Create another group called "Network Security" for firewall and NSG-related panels.

## Step 10: Save and Share

Click "Save" and give your workbook a descriptive name. Choose the resource group and location.

To share the workbook with your team, you have several options:

- **Shared workbooks:** Save to a resource group that your team has Reader access to
- **Templates:** Export the workbook as a Gallery Template that others can instantiate
- **ARM template:** Export as JSON for deployment through CI/CD

To export as an ARM template:

```bash
# Export a workbook as an ARM template
az monitor workbook show \
  --name "your-workbook-id" \
  --resource-group myResourceGroup \
  --output json > workbook-template.json
```

## Advanced KQL Patterns for Security Workbooks

Here are some KQL patterns that are particularly useful in security workbooks:

**Anomaly detection with time series:**

```
// Detect sign-in volume anomalies using time series analysis
SigninLogs
| where TimeGenerated > ago(30d)
| make-series SignInCount = count() on TimeGenerated step 1h
| extend (anomalies, score, baseline) = series_decompose_anomalies(SignInCount, 1.5)
| mv-expand TimeGenerated, SignInCount, anomalies, score, baseline
| where anomalies != 0
| project todatetime(TimeGenerated), tolong(SignInCount), toint(anomalies), todouble(score)
```

**Top risky users:**

```
// Identify users with the highest risk indicators
SigninLogs
| where TimeGenerated {TimeRange}
| summarize
    FailedAttempts = countif(ResultType != "0"),
    SuccessAfterFailure = countif(ResultType == "0" and prev(ResultType) != "0"),
    UniqueIPs = dcount(IPAddress),
    UniqueCountries = dcount(LocationDetails.countryOrRegion),
    RiskySignIns = countif(RiskLevelDuringSignIn in ("high", "medium"))
    by UserPrincipalName
// Simple risk score based on multiple factors
| extend RiskScore = FailedAttempts * 2 + UniqueCountries * 3 + RiskySignIns * 5
| order by RiskScore desc
| take 20
```

## Best Practices

- Start with a clear purpose. Define what questions the workbook should answer before building it.
- Use parameters liberally. A workbook without filters forces users to edit queries, which they should not have to do.
- Keep queries efficient. Workbooks run queries every time they load. A slow query makes the entire workbook painful to use.
- Use the `{TimeRange:grain}` syntax for time buckets. It automatically adjusts granularity.
- Add text blocks to explain what each section shows and why it matters. Not everyone reading the workbook will understand KQL.
- Test with different time ranges. A query that works for 24 hours might time out for 30 days.

## Summary

Custom Sentinel workbooks turn raw log data into actionable security dashboards. Start with parameters for time range and user filtering, add summary tiles for key metrics, build time series charts for trend analysis, and include detailed tables for investigation. The combination of KQL's analytical power and workbooks' visualization options lets you build exactly the monitoring view your security operations team needs.
