# How to Create Azure Workbooks Templates for Reusable Monitoring Reports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure Workbooks, Monitoring Reports, Azure Monitor, KQL, Dashboards, Observability, Templates

Description: Learn how to create Azure Workbooks templates with parameters, dynamic queries, and reusable components for consistent monitoring reports across your organization.

---

Azure Workbooks combine data visualization, KQL queries, metrics, and interactive parameters into rich monitoring reports. Unlike dashboards, which show a static grid of tiles, Workbooks support narratives - you can mix text, charts, tables, and parameters to create reports that tell a story about your infrastructure's health.

The real power comes from templates. When you create a Workbook template, other teams can instantiate it with their own parameters (their subscription, their resource group, their time range). You build the report once, and everyone gets a consistent monitoring view customized to their context.

## Workbooks vs. Dashboards

Both Azure Dashboards and Workbooks display monitoring data, but they serve different purposes:

**Dashboards**: Best for at-a-glance operational views. Tiles show metrics and charts without much explanation. Good for NOC screens and quick status checks.

**Workbooks**: Best for detailed reports and troubleshooting guides. Support interactive parameters, conditional visibility, mixed content types, and a narrative flow. Good for capacity reports, incident investigation guides, and team-specific monitoring views.

## Step 1: Create Your First Workbook

Navigate to Azure Monitor > Workbooks and click "New."

A workbook is built from steps. Each step is one of these types:

- **Text**: Markdown content for explanations and headings
- **Query**: A KQL query visualized as a chart, table, or grid
- **Metrics**: Azure Monitor metrics displayed as charts
- **Parameters**: Interactive controls (dropdowns, time ranges, resource pickers)
- **Links**: Navigation to other Workbooks or Azure resources
- **Groups**: Container for organizing related steps

Start with a parameter step, then add query steps that use those parameters.

## Step 2: Add Parameters for Reusability

Parameters make your Workbook dynamic. Users select values, and all queries update accordingly.

Click "Add parameter" and create:

**Time Range parameter**:
- Name: TimeRange
- Type: Time range picker
- Default: Last 24 hours

**Subscription parameter**:
- Name: Subscription
- Type: Subscription picker

**Resource Group parameter**:
- Name: ResourceGroup
- Type: Resource group picker
- Depends on: Subscription

**Resource parameter**:
- Name: VirtualMachines
- Type: Resource picker
- Resource type: Microsoft.Compute/virtualMachines
- Allow multiple selection: Yes

These parameters appear at the top of the Workbook as interactive controls. Every query can reference them using the `{ParameterName}` syntax.

## Step 3: Add KQL Query Steps

Add a query step that uses the parameters:

```kql
// VM CPU utilization over the selected time range
InsightsMetrics
| where TimeGenerated {TimeRange}
| where Namespace == "Processor" and Name == "UtilizationPercentage"
| where _ResourceId in~ ({VirtualMachines})
| summarize AvgCPU = avg(Val), MaxCPU = max(Val), P95CPU = percentile(Val, 95) by Computer, bin(TimeGenerated, 5m)
| order by TimeGenerated desc
```

Configure the visualization:
- Chart type: Time chart (for trend view) or Grid (for tabular data)
- Size: Medium or Large

Add another query for memory:

```kql
// VM Memory utilization
InsightsMetrics
| where TimeGenerated {TimeRange}
| where Namespace == "Memory" and Name == "AvailableMB"
| where _ResourceId in~ ({VirtualMachines})
| summarize AvgAvailMB = avg(Val), MinAvailMB = min(Val) by Computer, bin(TimeGenerated, 5m)
| order by TimeGenerated desc
```

## Step 4: Add Conditional Content

Workbooks support conditional visibility - show or hide steps based on parameter values or query results.

For example, show a warning message when CPU exceeds a threshold:

1. Add a Query step that checks for high CPU:

```kql
// Check if any VM has high CPU - returns count for conditional logic
InsightsMetrics
| where TimeGenerated {TimeRange}
| where Namespace == "Processor" and Name == "UtilizationPercentage"
| where _ResourceId in~ ({VirtualMachines})
| summarize AvgCPU = avg(Val) by Computer
| where AvgCPU > 80
| count
```

2. Name the step "HighCPUCheck"
3. Add a Text step with the warning message
4. Set the Text step's visibility to: "Make this item conditionally visible" > when "HighCPUCheck" result value > 0

The warning only appears when there are actually VMs with high CPU.

## Step 5: Create a Multi-Tab Layout

For complex Workbooks, organize content into tabs using groups:

1. Add a Group step
2. Set the group style to "Tabs"
3. Add sub-groups for each tab:
   - Tab 1: "Overview" - summary metrics and health status
   - Tab 2: "Compute" - CPU, memory, disk metrics
   - Tab 3: "Network" - bandwidth, packet drops, latency
   - Tab 4: "Alerts" - recent alerts and their status

This keeps the Workbook organized without overwhelming users with too much data at once.

## Step 6: Add Metrics Charts

In addition to KQL queries, you can add native Azure Monitor metrics charts:

1. Add a Metrics step
2. Select the resource type (e.g., Virtual Machines)
3. Use the `{VirtualMachines}` parameter for the resource scope
4. Select the metric (e.g., Percentage CPU)
5. Choose the aggregation (Average, Maximum, etc.)
6. Set the time range to `{TimeRange}`

Metrics charts are lighter weight than KQL queries and render faster for standard Azure metrics.

## Step 7: Build a Template

Once your Workbook is working well, save it as a template for reuse.

1. Click "Save As" in the Workbook editor
2. Choose "Save as template" (in the advanced options)
3. Give it a name and description
4. Set the category (e.g., "Infrastructure")
5. Choose the Gallery - "Workbook Templates"
6. Save to a shared resource group

To export the template as an ARM resource for deployment across subscriptions:

```bash
# Export the Workbook template as JSON
az monitor workbook show \
  --resource-group myRG \
  --name "<workbook-resource-name>" \
  --query "properties.serializedData" \
  -o tsv > workbook-template.json
```

Deploy it to other subscriptions using an ARM template:

```json
{
  "type": "Microsoft.Insights/workbooktemplates",
  "apiVersion": "2020-11-20",
  "name": "[parameters('workbookTemplateName')]",
  "location": "[resourceGroup().location]",
  "properties": {
    "priority": 1,
    "galleries": [
      {
        "name": "VM Performance Report",
        "category": "Infrastructure",
        "type": "workbook",
        "resourceType": "Azure Monitor",
        "order": 100
      }
    ],
    "templateData": "[json(variables('workbookContent'))]"
  }
}
```

## Step 8: Create a Library of Reusable Queries

Define frequently used queries as Workbook functions that can be referenced across steps:

```kql
// Reusable function: Get top resource consumers
let TopConsumers = (metric: string, topN: int) {
    InsightsMetrics
    | where TimeGenerated {TimeRange}
    | where Name == metric
    | where _ResourceId in~ ({VirtualMachines})
    | summarize AvgValue = avg(Val), MaxValue = max(Val) by Computer
    | top topN by AvgValue desc
};
// Use it for different metrics
TopConsumers("UtilizationPercentage", 10)
```

## Practical Template Examples

**Incident Investigation Workbook**:

A template designed for use during incidents. Parameters include a time range centered around the incident, the affected resource group, and severity filter. Tabs show:

- Timeline of events from Activity Log
- Resource health changes
- Alert history
- Performance anomalies
- Dependency map from Service Map

**Monthly Capacity Report**:

A template for monthly capacity planning reviews. Shows:

- Resource utilization trends over 30 days
- Resources approaching capacity limits
- Cost trend correlated with usage
- Recommendations for right-sizing

**Application Health Dashboard**:

A template using Application Insights data:

```kql
// Request success rate and response time
requests
| where timestamp {TimeRange}
| where cloud_RoleName in ({Services})
| summarize
    SuccessRate = round(100.0 * countif(success == true) / count(), 1),
    AvgDuration = avg(duration),
    P95Duration = percentile(duration, 95),
    RequestCount = count()
    by cloud_RoleName, bin(timestamp, 5m)
```

## Step 9: Share and Distribute Templates

Workbooks can be shared at different scopes:

**Private**: Only visible to the creator. Good for experimentation.

**Shared (Resource Group)**: Visible to anyone with access to the resource group.

**Gallery Templates**: Published templates that appear in the Workbook gallery for everyone in the subscription.

For organization-wide distribution, store templates in a central resource group and use Azure Policy or documentation to point teams to the gallery.

## Step 10: Automate Workbook Deployment

Use Terraform or Bicep to deploy Workbooks as part of your infrastructure code:

```hcl
# Terraform resource for deploying a Workbook
resource "azurerm_application_insights_workbook" "vm_report" {
  name                = "vm-performance-report"
  resource_group_name = azurerm_resource_group.monitoring.name
  location            = azurerm_resource_group.monitoring.location
  display_name        = "VM Performance Report"
  category            = "Infrastructure"

  data_json = file("${path.module}/workbook-templates/vm-performance.json")

  tags = {
    Environment = "production"
    ManagedBy   = "Terraform"
  }
}
```

## Tips for Effective Workbooks

1. **Start with parameters**: Always add time range and resource scope parameters first. They make every query dynamic.
2. **Use markdown sections**: Add explanatory text between query steps. Explain what the data means, not just what it shows.
3. **Set reasonable defaults**: Default the time range to the last 24 hours, not the last 30 days. It loads faster and is more relevant.
4. **Test with different data**: Make sure your queries handle empty results gracefully. A Workbook that shows errors when there is no data is frustrating.
5. **Version your templates**: Store Workbook JSON in Git so you can track changes and roll back if needed.

## Summary

Azure Workbooks provide a rich, interactive reporting format that goes beyond simple dashboards. By building templates with parameters, conditional content, and multi-tab layouts, you create reusable monitoring reports that different teams can customize to their context. The combination of KQL queries, metrics charts, and narrative text lets you build reports that not only show data but explain what it means. Save your best Workbooks as templates, distribute them through the gallery, and manage them as code for consistency across your organization.
