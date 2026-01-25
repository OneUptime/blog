# How to Use Library Panels in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Library Panels, Dashboards, Monitoring, Observability, Reusability

Description: Learn how to create, manage, and share reusable library panels in Grafana to maintain consistency across dashboards and reduce duplication in your monitoring setup.

---

## What Are Library Panels?

Library panels solve a common problem in Grafana: you have a useful panel that belongs on multiple dashboards, but copying it means maintaining separate versions. When you need to update the query or visualization, you end up hunting through dozens of dashboards making the same change.

Library panels are reusable panel definitions stored centrally. Link a library panel to any dashboard, and updates to the source propagate everywhere automatically. This is particularly valuable for:

- Standard metrics like CPU, memory, or latency that appear across service dashboards
- Organization-wide SLI/SLO visualizations
- Team-specific panels that multiple engineers reference

## Creating Your First Library Panel

You can create a library panel from scratch or convert an existing panel. Let's start by converting a panel you already have.

### Converting an Existing Panel

Open any dashboard containing a panel you want to reuse. Click the panel title, then select "More" from the dropdown menu.

```
Panel Menu > More > Create library panel
```

A dialog appears asking for:

- **Library panel name**: Choose something descriptive like "Service Latency P99" rather than "Latency Panel 1"
- **Folder**: Select where to store the library panel for organization

After saving, the panel icon changes to indicate it is now linked to a library panel.

### Creating a New Library Panel

Navigate to the Dashboards section in Grafana's left sidebar, then click "Library panels." Here you can manage all library panels in your instance.

Click "New library panel" to open the panel editor. Configure your panel as you would any regular panel:

```yaml
# Example: Service Health Panel Configuration
Panel Type: Stat
Data Source: Prometheus

Query A:
  expr: up{job="api-server"}
  legend: API Server

Query B:
  expr: up{job="database"}
  legend: Database

Display:
  - Graph mode: None
  - Color mode: Background
  - Orientation: Horizontal
```

Once satisfied, save it to your chosen folder.

## Using Library Panels in Dashboards

Adding a library panel to a dashboard takes just a few clicks.

### Adding via Dashboard Editor

Open your dashboard in edit mode. In the panel list on the left, you will see a "Library panels" tab. Browse or search for the panel you need, then drag it onto your dashboard.

```
Dashboard Edit Mode > Add panel > Library panels tab > Drag to dashboard
```

The panel appears with a special icon indicating it is linked.

### Adding via JSON Model

If you manage dashboards as code, reference library panels by their UID:

```json
{
  "libraryPanel": {
    "uid": "abc123xyz",
    "name": "Service Latency P99"
  },
  "gridPos": {
    "h": 8,
    "w": 12,
    "x": 0,
    "y": 0
  }
}
```

When Grafana loads this dashboard, it fetches the current library panel definition and renders it.

## Updating Library Panels

The real power of library panels shows when you need to make changes.

### Editing the Source Panel

Navigate to Dashboards > Library panels and find your panel. Click to open it in the editor.

```python
# Conceptual flow of library panel updates
def update_library_panel(panel_id, new_config):
    # Update the central definition
    library_panel = get_panel(panel_id)
    library_panel.config = new_config
    library_panel.save()

    # All linked dashboards now show the updated panel
    # No additional action required
```

After saving, every dashboard using this library panel reflects your changes immediately.

### Viewing Linked Dashboards

Before making breaking changes, check which dashboards use the panel. In the library panel editor, look for the "Linked dashboards" section. This shows every dashboard referencing this panel, helping you assess the impact of your changes.

## Organizing Library Panels

As your library grows, organization becomes critical.

### Folder Structure

Create folders that mirror your organizational structure:

```
Library Panels/
├── Infrastructure/
│   ├── CPU Usage
│   ├── Memory Usage
│   └── Disk IOPS
├── Application/
│   ├── Request Rate
│   ├── Error Rate
│   └── Latency P99
└── Business/
    ├── Active Users
    ├── Transaction Volume
    └── Revenue Metrics
```

### Naming Conventions

Adopt consistent naming to make panels discoverable:

```
[Team/Domain] - [Metric] - [Aggregation/Detail]

Examples:
- Platform - Node CPU - Per Instance
- Payments - Transaction Success Rate - Hourly
- API - Latency - P50/P95/P99
```

## Working with Variables

Library panels support dashboard variables, making them flexible across contexts.

### Defining Variable-Aware Queries

When building a library panel, use variable syntax in your queries:

```promql
# This query adapts to whatever $service value the dashboard provides
rate(http_requests_total{service="$service"}[5m])
```

The panel works on any dashboard that defines a `$service` variable.

### Variable Scope Considerations

Library panels inherit variables from the dashboard where they are placed. If a library panel references `$environment` but the dashboard does not define it, you will see template errors.

Document which variables your library panels expect:

```markdown
## Service Latency P99

**Required Variables:**
- $service: The service name to filter on
- $environment: prod, staging, or dev

**Optional Variables:**
- $instance: Specific instance filter (defaults to all)
```

## Permissions and Access Control

Library panels follow Grafana's folder-based permissions.

### Setting Permissions

Permissions on a library panel folder determine who can:

- **View**: Use the panel on dashboards they can edit
- **Edit**: Modify the panel definition
- **Admin**: Manage permissions and delete panels

```
Library Panel Folder Permissions:
├── Platform Team: Admin
├── Dev Teams: Edit
└── Everyone: View
```

### Best Practices for Permissions

Keep critical panels (SLO indicators, executive dashboards) in folders with restricted edit access. Create a "Shared" folder with broader edit permissions for panels that teams should be able to customize.

## Migrating Existing Dashboards

If you have many dashboards with duplicated panels, here is a migration strategy.

### Identify Candidates

Look for panels with identical or nearly identical configurations across dashboards:

```bash
# Pseudocode for finding duplicate panels
panels = extract_panels_from_all_dashboards()
duplicates = find_similar_panels(panels, similarity_threshold=0.9)
print(f"Found {len(duplicates)} potential library panel candidates")
```

### Gradual Migration

1. Create the library panel from the best version of the duplicated panel
2. Update dashboards one at a time, replacing the local panel with the library version
3. Test each dashboard after migration
4. Delete the old local panel once the library version is confirmed working

## Integration with Dashboard Provisioning

If you use provisioning to manage dashboards as code, library panels fit naturally.

### Provisioning Library Panels

Create a provisioning file for library panels:

```yaml
# provisioning/library-panels/panels.yaml
apiVersion: 1

panels:
  - name: Service Latency P99
    uid: service-latency-p99
    folder: Application
    model:
      type: timeseries
      datasource:
        type: prometheus
        uid: prometheus-main
      targets:
        - expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))
          legendFormat: "{{service}}"
      fieldConfig:
        defaults:
          unit: s
```

### Referencing in Provisioned Dashboards

Your provisioned dashboards can then reference these panels:

```yaml
# provisioning/dashboards/service-overview.yaml
panels:
  - libraryPanel:
      uid: service-latency-p99
    gridPos:
      h: 8
      w: 12
      x: 0
      y: 0
```

## Troubleshooting Common Issues

### Panel Shows "Library panel not found"

This occurs when the library panel was deleted or moved. Check:
- The library panel still exists
- You have view permissions on its folder
- The UID has not changed

### Variables Not Resolving

Ensure the host dashboard defines all variables the library panel expects. Check for typos in variable names.

### Changes Not Propagating

Clear your browser cache and refresh. Grafana caches panel definitions, which can delay update visibility.

## Conclusion

Library panels transform dashboard maintenance from a tedious, error-prone process into something manageable. Start by converting your most-used panels, establish naming conventions early, and use folder permissions to balance flexibility with governance. As your Grafana deployment scales, library panels keep your monitoring consistent and maintainable.
