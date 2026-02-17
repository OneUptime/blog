# How to Configure Dashboard Variables for Dynamic Filtering on Google Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Dashboards, MQL, Observability

Description: Learn how to configure dashboard variables in Google Cloud Monitoring to create interactive dashboards with dynamic filtering by service, environment, region, and more.

---

Static dashboards become unwieldy fast. When you have 20 services across three environments in four regions, you do not want 240 individual dashboards. Dashboard variables in Google Cloud Monitoring let you add dropdown filters to a single dashboard, so the same charts can show data for any combination of service, environment, and region that you select.

This turns a rigid dashboard into an interactive tool that adapts to what you need to see right now.

## How Dashboard Variables Work

A dashboard variable is a named parameter that appears as a dropdown at the top of your dashboard. When you select a value, all charts that reference that variable update to show data matching the selection. Variables can be:

- **Label-based:** Populated from metric labels or resource labels
- **Custom:** A predefined list of values you specify
- **Query-based:** Populated dynamically from a metric query

## Creating Variables via the API

Here is how to create a dashboard with variables using the Cloud Monitoring API:

```python
# create_dashboard_with_variables.py
from google.cloud import monitoring_dashboard_v1
from google.protobuf import struct_pb2

def create_dashboard_with_variables(project_id):
    """Create a dashboard with interactive filter variables."""
    client = monitoring_dashboard_v1.DashboardsServiceClient()

    dashboard_json = {
        "displayName": "Service Dashboard",
        "dashboardFilters": [
            {
                "labelKey": "resource.label.service_name",
                "templateVariable": "service_name",
                "stringValue": "",
                "filterType": "RESOURCE_LABEL",
            },
            {
                "labelKey": "resource.label.location",
                "templateVariable": "region",
                "stringValue": "",
                "filterType": "RESOURCE_LABEL",
            },
            {
                "labelKey": "metric.label.response_code_class",
                "templateVariable": "status_class",
                "stringValue": "",
                "filterType": "METRIC_LABEL",
            },
        ],
        "mosaicLayout": {
            "columns": 48,
            "tiles": [
                {
                    "xPos": 0,
                    "yPos": 0,
                    "width": 24,
                    "height": 16,
                    "widget": {
                        "title": "Request Rate - ${service_name}",
                        "xyChart": {
                            "dataSets": [
                                {
                                    "timeSeriesQuery": {
                                        "timeSeriesQueryLanguage": (
                                            "fetch cloud_run_revision"
                                            "| metric 'run.googleapis.com/request_count'"
                                            "| align rate(1m)"
                                            "| group_by [resource.service_name],"
                                            "    [rps: aggregate(val())]"
                                        ),
                                    },
                                    "plotType": "LINE",
                                }
                            ],
                        },
                    },
                },
            ],
        },
    }

    parent = f"projects/{project_id}"
    result = client.create_dashboard(
        parent=parent,
        dashboard=monitoring_dashboard_v1.Dashboard(dashboard_json),
    )
    print(f"Dashboard created: {result.name}")

create_dashboard_with_variables('my-project')
```

## Setting Up Common Variable Patterns

### Service Name Variable

The most common variable filters by service name:

```json
{
  "labelKey": "resource.label.service_name",
  "templateVariable": "service_name",
  "filterType": "RESOURCE_LABEL"
}
```

When this variable is configured, a dropdown appears at the top of the dashboard populated with all service names found in the metric data. Selecting a value filters every chart that uses the matching resource label.

### Environment Variable

If you tag your resources with an environment label:

```json
{
  "labelKey": "metric.label.environment",
  "templateVariable": "env",
  "filterType": "METRIC_LABEL"
}
```

### Region Variable

Filter by GCP region:

```json
{
  "labelKey": "resource.label.location",
  "templateVariable": "region",
  "filterType": "RESOURCE_LABEL"
}
```

### GKE Namespace Variable

For Kubernetes workloads, filter by namespace:

```json
{
  "labelKey": "resource.label.namespace_name",
  "templateVariable": "namespace",
  "filterType": "RESOURCE_LABEL"
}
```

## Using Variables in MQL Queries

Dashboard variables automatically filter charts that use matching labels. But you can also reference variables explicitly in MQL queries for more control:

```
# Request rate filtered by the service_name variable
fetch cloud_run_revision
| metric 'run.googleapis.com/request_count'
| filter resource.service_name == '${service_name}'
| align rate(1m)
| group_by [resource.service_name], [rps: aggregate(val())]
```

```
# Latency filtered by multiple variables
fetch cloud_run_revision
| metric 'run.googleapis.com/request_latencies'
| filter resource.service_name == '${service_name}'
   && resource.location == '${region}'
| align delta(5m)
| group_by [], [p50: percentile(val(), 50), p99: percentile(val(), 99)]
```

## Building a Complete Variable-Driven Dashboard

Here is a Terraform configuration that creates a full dashboard with variables:

```hcl
# terraform/dashboard.tf
resource "google_monitoring_dashboard" "service_dashboard" {
  dashboard_json = jsonencode({
    displayName = "Service Explorer"

    dashboardFilters = [
      {
        labelKey         = "resource.label.service_name"
        templateVariable = "service"
        filterType       = "RESOURCE_LABEL"
      },
      {
        labelKey         = "resource.label.location"
        templateVariable = "region"
        filterType       = "RESOURCE_LABEL"
      },
    ]

    mosaicLayout = {
      columns = 48
      tiles = [
        # Request Rate Chart
        {
          xPos   = 0
          yPos   = 0
          width  = 24
          height = 16
          widget = {
            title = "Request Rate"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesQueryLanguage = <<-MQL
                    fetch cloud_run_revision
                    | metric 'run.googleapis.com/request_count'
                    | align rate(1m)
                    | group_by [resource.service_name],
                        [rps: aggregate(val())]
                  MQL
                }
                plotType = "LINE"
              }]
            }
          }
        },
        # Error Rate Chart
        {
          xPos   = 24
          yPos   = 0
          width  = 24
          height = 16
          widget = {
            title = "Error Rate (%)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesQueryLanguage = <<-MQL
                    fetch cloud_run_revision
                    | metric 'run.googleapis.com/request_count'
                    | align rate(5m)
                    | group_by [resource.service_name, metric.response_code_class],
                        [val: aggregate(val())]
                    | filter metric.response_code_class = '5xx'
                    | group_by [resource.service_name], [errors: aggregate(val)]
                  MQL
                }
                plotType = "LINE"
              }]
            }
          }
        },
        # P99 Latency Chart
        {
          xPos   = 0
          yPos   = 16
          width  = 24
          height = 16
          widget = {
            title = "P99 Latency (ms)"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesQueryLanguage = <<-MQL
                    fetch cloud_run_revision
                    | metric 'run.googleapis.com/request_latencies'
                    | align delta(5m)
                    | group_by [resource.service_name],
                        [p99: percentile(val(), 99)]
                  MQL
                }
                plotType = "LINE"
              }]
            }
          }
        },
        # Instance Count
        {
          xPos   = 24
          yPos   = 16
          width  = 24
          height = 16
          widget = {
            title = "Active Instances"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesQueryLanguage = <<-MQL
                    fetch cloud_run_revision
                    | metric 'run.googleapis.com/container/instance_count'
                    | align mean(1m)
                    | group_by [resource.service_name],
                        [instances: mean(val())]
                  MQL
                }
                plotType = "STACKED_AREA"
              }]
            }
          }
        },
        # Memory Usage
        {
          xPos   = 0
          yPos   = 32
          width  = 48
          height = 16
          widget = {
            title = "Memory Utilization"
            xyChart = {
              dataSets = [{
                timeSeriesQuery = {
                  timeSeriesQueryLanguage = <<-MQL
                    fetch cloud_run_revision
                    | metric 'run.googleapis.com/container/memory/utilizations'
                    | align mean(1m)
                    | group_by [resource.service_name],
                        [mem_util: mean(val())]
                  MQL
                }
                plotType = "LINE"
              }]
            }
          }
        },
      ]
    }
  })
}
```

## Default Variable Values

You can set default values for variables so the dashboard shows meaningful data when first loaded:

```json
{
  "labelKey": "resource.label.service_name",
  "templateVariable": "service",
  "stringValue": "api-gateway",
  "filterType": "RESOURCE_LABEL"
}
```

The `stringValue` field sets the default selection. Users can change it from the dropdown, but the dashboard loads with this initial filter.

## Multi-Select Variables

Variables support selecting multiple values at once. This is useful when you want to compare a few services side by side without seeing all of them:

```json
{
  "labelKey": "resource.label.service_name",
  "templateVariable": "service",
  "filterType": "RESOURCE_LABEL",
  "stringValue": "api-gateway,payment-service,order-service"
}
```

## Variable Chaining

You can create variables that depend on each other. For example, first select a project, then the region dropdown only shows regions where that project has resources:

```json
{
  "dashboardFilters": [
    {
      "labelKey": "resource.label.project_id",
      "templateVariable": "project",
      "filterType": "RESOURCE_LABEL"
    },
    {
      "labelKey": "resource.label.location",
      "templateVariable": "region",
      "filterType": "RESOURCE_LABEL"
    }
  ]
}
```

When you select a project, Cloud Monitoring automatically narrows the region dropdown to only show regions relevant to that project's data.

## Practical Tips

After building several dashboards with variables, here are some things I have learned:

1. **Keep the number of variables under five.** Too many dropdowns make the dashboard confusing. Stick to the most important dimensions: service, environment, and region.

2. **Use meaningful default values.** Set the default to your most critical service or production environment so the dashboard is immediately useful.

3. **Name variables clearly.** Use `service_name` instead of `var1`. The variable name shows up in chart titles when you reference it.

4. **Test with all values.** Make sure your charts work when "All" is selected for a variable, not just when a specific value is chosen.

5. **Document the dashboard.** Add a text widget at the top explaining what each variable filters and which services are included.

Dashboard variables transform a static monitoring dashboard into an interactive exploration tool. Combined with MQL queries and alerting from tools like OneUptime, you get a monitoring setup that scales with your infrastructure without requiring a new dashboard for every new service.
