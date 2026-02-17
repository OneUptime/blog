# How to Use Parameters and Dynamic Content in Azure Workbooks for Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Workbooks, Parameters, Dynamic Content, Filtering, Log Analytics, Azure Monitor

Description: Learn how to use parameters and dynamic content in Azure Workbooks to create interactive filtering experiences for monitoring dashboards and reports.

---

The real power of Azure Workbooks lies in their parameter system. Parameters turn static dashboards into interactive tools where users can filter, drill down, and explore their data without editing a single query. Done well, a parametrized Workbook can replace custom web applications that would take weeks to build.

In this post, I will cover every parameter type available in Azure Workbooks, show you how to chain parameters together for cascading filters, and demonstrate advanced techniques like query-based parameters and conditional sections.

## Parameter Types Overview

Azure Workbooks supports several parameter types:

1. **Text** - Free-form text input
2. **Drop down** - Single or multi-select dropdown
3. **Time range** - Date/time range picker
4. **Resource picker** - Azure resource selector
5. **Subscription picker** - Subscription selector
6. **Resource type picker** - Selects resource types
7. **Resource group picker** - Selects resource groups
8. **Multi-value** - Allows selecting multiple values

Each type serves a different purpose, and you can combine them to create sophisticated filtering experiences.

## Setting Up Basic Parameters

### Time Range Parameter

Every monitoring Workbook should start with a time range parameter. Click "Add parameter" in your Workbook and configure:

- **Parameter name:** TimeRange
- **Display name:** Time Range
- **Parameter type:** Time range picker
- **Required:** Yes
- **Available ranges:** Last 1 hour, Last 4 hours, Last 12 hours, Last 24 hours, Last 7 days, Last 30 days
- **Default value:** Last 24 hours

Reference it in queries as `{TimeRange}` for the full time range clause, or use `{TimeRange:start}` and `{TimeRange:end}` for individual boundaries.

### Subscription Parameter

```
Parameter name: Subscription
Parameter type: Subscription picker
Allow multiple selection: Yes
Default value: All subscriptions
```

### Resource Group Parameter

```
Parameter name: ResourceGroup
Parameter type: Resource group picker
Subscriptions: {Subscription}
Allow multiple selection: Yes
```

Notice how the resource group picker references the Subscription parameter. This creates a cascading filter where the resource group dropdown only shows groups from the selected subscriptions.

## Query-Based Parameters

The most powerful parameter type is the dropdown populated by a KQL query. This lets you create dynamic dropdowns that reflect your actual data.

### Computer Name Dropdown

Add a parameter with these settings:
- **Parameter type:** Drop down
- **Get data from:** Query
- **Data source:** Logs
- **Log Analytics workspace:** Your workspace

Query:

```kusto
// Populate dropdown with all computers that have sent heartbeats
Heartbeat
| where TimeGenerated > ago(7d)
| distinct Computer
| sort by Computer asc
```

Column settings:
- **Value column:** Computer
- **Label column:** Computer

Now users see a dropdown of all active computers and can filter the Workbook to a specific machine.

### Dynamic Severity Filter

```kusto
// Populate dropdown with event severity levels that actually exist in the data
Event
| where TimeGenerated {TimeRange}
| distinct EventLevelName
| sort by EventLevelName asc
```

### Application-Specific Dropdown

```kusto
// Populate with applications that have logged data
AppRequests
| where TimeGenerated {TimeRange}
| distinct AppRoleName
| where isnotempty(AppRoleName)
| sort by AppRoleName asc
```

## Using Parameters in Queries

Once parameters are defined, reference them in your query blocks using curly braces.

### Simple Reference

```kusto
// Filter events by selected computer
Event
| where TimeGenerated {TimeRange}
| where Computer == "{Computer}"
| summarize count() by EventLevelName, bin(TimeGenerated, 1h)
| render timechart
```

### Multi-Value Reference

When a parameter allows multiple selections, use the `in` operator:

```kusto
// Filter by multiple selected computers
Event
| where TimeGenerated {TimeRange}
| where Computer in ({Computer})
| summarize count() by Computer, bin(TimeGenerated, 1h)
| render timechart
```

For multi-value parameters, the `{Computer}` token expands to a comma-separated quoted list like `'Server1','Server2','Server3'`.

### Conditional Filtering

Sometimes you want a filter to apply only when a value is selected. Use the "All" option in your dropdown and handle it in the query:

```kusto
// Apply filter only when a specific computer is selected
Event
| where TimeGenerated {TimeRange}
| where "{Computer}" == "All" or Computer == "{Computer}"
| summarize count() by EventLevelName
```

## Cascading Parameters

Cascading parameters create a hierarchy where selecting a value in one parameter narrows the options in the next. This is essential for large environments.

### Example: Subscription > Resource Group > VM

**Parameter 1: Subscription** (Subscription picker)

**Parameter 2: ResourceGroup** (Query-based dropdown)

```kusto
// Resource groups in the selected subscription
resourcecontainers
| where type == "microsoft.resources/subscriptions/resourcegroups"
| where subscriptionId == "{Subscription}"
| project name
| sort by name asc
```

**Parameter 3: VMName** (Query-based dropdown)

```kusto
// VMs in the selected resource group
resources
| where type == "microsoft.compute/virtualmachines"
| where subscriptionId == "{Subscription}"
| where resourceGroup == "{ResourceGroup}"
| project name
| sort by name asc
```

Now when the user selects a subscription, only the resource groups in that subscription appear. When they select a resource group, only the VMs in that group appear.

## Dynamic Conditional Sections

You can show or hide entire sections of a Workbook based on parameter values.

### Show Details Only When a Resource Is Selected

Create a parameter group at the top. Then add a query section that is conditionally visible:

1. Add your detail query section
2. In the section settings, enable "Make this item conditionally visible"
3. Set the condition: Parameter `VMName` is not equal to empty string

The section only appears after the user selects a VM from the dropdown.

### Show Error Analysis Only When Errors Exist

```kusto
// Check if there are any errors (used for conditional visibility)
Event
| where TimeGenerated {TimeRange}
| where Computer == "{Computer}"
| where EventLevelName == "Error"
| summarize ErrorCount = count()
```

Export the `ErrorCount` value as a parameter. Then make the error analysis section visible only when `ErrorCount > 0`.

## Advanced Parameter Techniques

### Default Values from Queries

You can set a parameter's default value based on a query:

```kusto
// Default to the server with the most errors
Event
| where TimeGenerated > ago(24h)
| where EventLevelName == "Error"
| summarize ErrorCount = count() by Computer
| top 1 by ErrorCount desc
| project Computer
```

### JSON-Formatted Parameters

For complex scenarios, parameters can carry JSON data:

```kusto
// Return structured data for the parameter
Heartbeat
| where TimeGenerated > ago(1h)
| summarize
    LastHeartbeat = max(TimeGenerated),
    OSType = any(OSType)
    by Computer
| extend label = strcat(Computer, " (", OSType, ")")
| project value = Computer, label
```

Set the value column to "value" and the label column to "label." Users see the friendly label (e.g., "Server1 (Windows)") but the query receives the clean value ("Server1").

### Tab Parameters

You can create tab navigation in Workbooks using a parameter with radio button style:

- **Parameter name:** Tab
- **Parameter type:** Drop down
- **Style:** Radio buttons
- **Values:** Overview, Performance, Errors, Security

Then create sections that are conditionally visible based on the Tab parameter value. This creates a tabbed interface within a single Workbook.

## Cross-Workbook Parameters

Parameters can be passed between Workbooks through links. When you add a link to another Workbook, you can specify which parameters to pass:

1. In the source Workbook, add a link action to a grid or button
2. In the link configuration, select "Workbook" as the link type
3. Map parameters from the source to the target Workbook

This enables multi-page Workbook experiences where a summary page links to detailed pages.

## Performance Tips for Parameterized Workbooks

**Use time range parameters in every query.** This prevents queries from scanning more data than needed.

**Limit dropdown query results.** If your Computer dropdown could return 10,000 entries, add a `| take 100` or filter to a specific scope. Huge dropdowns are unusable anyway.

**Cache parameter queries.** Set the "Cache duration" on parameter queries that do not change frequently, like lists of resource groups.

**Use "lazy" parameter evaluation.** In the parameter settings, set "Run query when" to "Parameter changes" instead of "Always." This prevents unnecessary queries when other parameters change.

## Real-World Example: Incident Investigation Workbook

Here is a parameter structure for an incident investigation tool:

1. **TimeRange** - When did the incident occur?
2. **Subscription** - Which subscription?
3. **ResourceGroup** - Which resource group?
4. **ResourceType** - VM, Storage, Network?
5. **ResourceName** - Which specific resource?

Each parameter cascades from the one above. The body of the Workbook shows:
- Activity Log entries for the selected resource
- Metrics for the selected resource
- Change Analysis for the selected resource
- Related alerts

All filtered by the parameters at the top, creating a focused investigation experience.

## Summary

Parameters transform Azure Workbooks from static reports into interactive investigation and monitoring tools. By combining time range pickers, query-based dropdowns, cascading filters, and conditional visibility, you can build sophisticated dashboards that adapt to what the user needs to see. The key principles are: start with broad filters and cascade to specific ones, use conditional visibility to keep the interface clean, and always test with different parameter combinations to make sure your queries handle all cases gracefully.
