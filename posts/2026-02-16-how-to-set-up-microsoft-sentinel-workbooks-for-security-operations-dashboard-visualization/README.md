# How to Set Up Microsoft Sentinel Workbooks for Security Operations Dashboard Visualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Microsoft Sentinel, Workbooks, Security Operations, SIEM, Dashboard, Azure Monitor, SOC

Description: A practical guide to creating and customizing Microsoft Sentinel workbooks that give your security operations team clear visibility into threats and incidents.

---

A security operations team is only as effective as its visibility into the environment. Microsoft Sentinel collects security data from across your infrastructure, but raw log data sitting in tables is not useful during an active incident. Workbooks turn that data into interactive dashboards that your SOC analysts can use to spot trends, investigate alerts, and track metrics that matter.

In this guide, I will walk through setting up Sentinel workbooks from scratch, customizing them for common SOC use cases, and building a dashboard that your team will actually use every day.

## What Are Sentinel Workbooks?

Sentinel workbooks are built on top of Azure Monitor Workbooks. They are interactive reports that combine text, KQL (Kusto Query Language) queries, visualizations, and parameters into a single canvas. You can think of them as configurable dashboards that pull live data from your Sentinel workspace.

Unlike static reports, workbooks support:
- Dynamic time range selectors
- Parameter dropdowns that filter all queries on the page
- Multiple visualization types (tables, charts, grids, tiles, maps)
- Drill-down capabilities where clicking a row in one visualization filters another
- Template galleries with pre-built content from Microsoft and the community

## Step 1: Access the Workbooks Gallery

Navigate to your Microsoft Sentinel workspace in the Azure portal. In the left menu under Threat Management, click **Workbooks**.

You will see two tabs:
- **Templates** - pre-built workbooks provided by Microsoft and data connector providers
- **My workbooks** - workbooks you have saved or customized

Start by exploring the templates. Each data connector you enable in Sentinel comes with recommended workbook templates. For example, if you have the Azure Active Directory connector enabled, you will see templates for sign-in analysis, audit log monitoring, and conditional access insights.

## Step 2: Deploy a Template Workbook

Let us start with a common use case: monitoring security incidents.

1. In the Templates tab, search for "Investigation Insights"
2. Click on the template to see a preview
3. Click **Save** to create your own copy
4. Choose a resource group and location for the workbook
5. Click **View saved workbook** to open it

The template workbook is now your own copy that you can customize freely. Changes you make will not affect the original template.

## Step 3: Create a Custom Workbook from Scratch

Templates are a good starting point, but most SOC teams need custom dashboards tailored to their specific environment. Here is how to build one.

Click **Add workbook** in the Workbooks section. This opens the workbook editor with a blank canvas.

### Adding a Time Range Parameter

Every SOC dashboard needs a time range selector. Click **Add parameters** and configure it.

1. Click **Add Parameter**
2. Set the parameter name to `TimeRange`
3. Set the type to **Time range picker**
4. Set the default value to "Last 24 hours"
5. Click **Save**

This parameter will be available to all queries in the workbook as `{TimeRange}`.

### Adding a Query-Based Visualization

Click **Add query** to add your first data visualization. Here is a KQL query that shows security incidents by severity over time.

```kql
// Count security incidents grouped by severity and time
SecurityIncident
| where TimeGenerated {TimeRange}
| summarize IncidentCount = count() by Severity, bin(TimeGenerated, 1h)
| order by TimeGenerated asc
```

In the visualization settings:
- Set the **Visualization** to "Area chart"
- Set **Series columns** to "Severity"
- Set **Y axis** to "IncidentCount"

This gives you a stacked area chart showing incident volume by severity, which immediately tells your analysts if there is a spike in high-severity incidents.

### Adding an Incident Summary Table

Add another query block with this KQL.

```kql
// Summary table of recent incidents with key details
SecurityIncident
| where TimeGenerated {TimeRange}
| summarize
    TotalAlerts = sum(AdditionalData.alertsCount),
    LastUpdate = max(LastModifiedTime)
    by IncidentNumber, Title, Severity, Status, Owner = AssignedTo
| order by LastUpdate desc
| take 50
```

Set the visualization to **Grid**. This creates a live table of the most recent incidents with their severity, status, and assigned owner.

### Adding Metric Tiles

Tiles are great for showing key numbers at a glance. Add a query block with this KQL.

```kql
// Key metrics for the SOC dashboard header
SecurityIncident
| where TimeGenerated {TimeRange}
| summarize
    TotalIncidents = count(),
    HighSeverity = countif(Severity == "High"),
    OpenIncidents = countif(Status == "New" or Status == "Active"),
    AvgCloseTimeHrs = round(avg(
        datetime_diff('hour', ClosedTime, CreatedTime)
    ), 1)
```

Set the visualization to **Tiles**. Configure each column as a separate tile with appropriate formatting. The result is a row of metric cards at the top of your dashboard showing total incidents, high-severity count, open incidents, and average closure time.

## Step 4: Build an Analyst Efficiency Dashboard

One of the most valuable workbook pages tracks how your SOC team is performing. Here is a query that breaks down incident handling by analyst.

```kql
// Analyst performance metrics - incidents handled and average response time
SecurityIncident
| where TimeGenerated {TimeRange}
| where isnotempty(AssignedTo)
| summarize
    IncidentsHandled = count(),
    AvgResponseMinutes = round(avg(
        datetime_diff('minute', FirstModifiedTime, CreatedTime)
    ), 0),
    ClosedCount = countif(Status == "Closed"),
    HighSevHandled = countif(Severity == "High")
    by Analyst = AssignedTo
| order by IncidentsHandled desc
```

Set this as a Grid visualization. Your SOC manager can use this view to identify workload imbalances, recognize top performers, and spot analysts who might need additional support or training.

## Step 5: Add Threat Intelligence Indicators

If you have threat intelligence connectors enabled, you can show active indicators on your dashboard.

```kql
// Active threat intelligence indicators by type and source
ThreatIntelligenceIndicator
| where TimeGenerated {TimeRange}
| where Active == true
| summarize IndicatorCount = count() by ThreatType, SourceSystem
| order by IndicatorCount desc
```

Visualize this as a bar chart to show which threat types have the most active indicators. This helps analysts understand the current threat landscape at a glance.

## Step 6: Create a Multi-Page Workbook

For complex dashboards, use multiple pages (called "groups" in workbook terminology) to organize content.

Click **Add group** in the editor. Name the first group "Overview" and the second "Incident Details". Move your summary tiles and charts to the Overview group, and put detailed tables and drill-down queries in the Incident Details group.

Users can navigate between pages using tabs at the top of the workbook. This keeps the dashboard clean while still providing depth when analysts need it.

## Step 7: Set Up Auto-Refresh

SOC dashboards should show near-real-time data. In the workbook settings (gear icon), configure auto-refresh:

1. Click the settings icon in the workbook toolbar
2. Enable **Auto refresh**
3. Set the interval to 5 minutes

This ensures that analysts always see current data without manually hitting refresh.

## Step 8: Share the Workbook with Your Team

Workbooks can be shared at different levels:

- **My workbooks** (private) - only you can see it
- **Shared workbooks** - visible to anyone with access to the Sentinel workspace

To share, save the workbook as a shared workbook by selecting the "Shared Reports" option when saving. You can also pin individual visualizations to an Azure Dashboard for quick access.

For teams that use multiple Sentinel workspaces, you can export workbook templates as JSON and import them into other workspaces.

```bash
# Export a workbook template as JSON using Azure CLI
az monitor app-insights workbook show \
  --resource-group myResourceGroup \
  --name "SOC-Overview-Dashboard" \
  --query 'serializedData' > workbook-template.json

# Import the template into another workspace
az monitor app-insights workbook create \
  --resource-group targetResourceGroup \
  --name "SOC-Overview-Dashboard" \
  --serialized-data @workbook-template.json \
  --kind shared \
  --location eastus
```

## Practical Tips for Effective SOC Workbooks

**Keep queries efficient**. Long-running queries make the dashboard feel sluggish. Use `summarize` to aggregate data at query time rather than pulling raw rows. Limit time ranges and use `take` clauses where appropriate.

**Use conditional formatting**. The grid visualization supports conditional formatting rules. Color high-severity incidents red and low-severity ones green. This lets analysts scan the dashboard visually without reading every row.

**Add text blocks for context**. Not everyone on your team will understand every chart. Add markdown text blocks above visualizations to explain what the data shows and what analysts should look for.

**Link to investigation tools**. You can add hyperlinks in grid columns that link directly to the incident investigation page in Sentinel. This turns your dashboard into a launchpad for incident response.

**Version control your workbook JSON**. Export your workbook templates and store them in Git. This lets you track changes, roll back to previous versions, and deploy consistent dashboards across environments.

## Wrapping Up

Microsoft Sentinel workbooks give your security operations team the visibility they need to detect, investigate, and respond to threats effectively. Start with the built-in templates to get a baseline, then customize with queries and visualizations that match your specific security operations workflow. A well-built SOC dashboard pays for itself by reducing the time analysts spend hunting for context and increasing the speed of incident response.
