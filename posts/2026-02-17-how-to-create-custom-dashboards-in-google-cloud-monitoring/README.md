# How to Create Custom Dashboards in Google Cloud Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Monitoring, Dashboards, Observability, DevOps

Description: Build custom dashboards in Google Cloud Monitoring to visualize metrics, track application health, and monitor infrastructure performance in real time.

---

Default dashboards are a starting point, but they rarely show you exactly what you need. Google Cloud Monitoring lets you build custom dashboards that display the specific metrics, time ranges, and visualizations relevant to your applications and infrastructure. A well-designed dashboard gives your team instant visibility into system health without digging through logs or running queries.

This guide covers creating custom dashboards both through the Console and programmatically.

## Dashboard Basics

A Cloud Monitoring dashboard is a collection of widgets arranged in a grid layout. Each widget displays one or more metrics using different visualization types - line charts, bar charts, gauges, scorecards, text, and more. Dashboards update in real time and can be shared across your team.

## Creating a Dashboard in the Console

The fastest way to get started is through the Google Cloud Console.

1. Navigate to Monitoring in the sidebar
2. Click Dashboards, then Create Dashboard
3. Give your dashboard a name
4. Start adding widgets from the widget library

For each widget, you select a metric, configure filters, and choose a visualization type. The console provides a point-and-click interface that is great for exploration.

## Creating a Dashboard with the API

For repeatable, version-controlled dashboards, use the API. Cloud Monitoring dashboards can be defined as JSON and created programmatically.

Here is a complete dashboard definition that monitors a GKE application.

```json
{
  "displayName": "Application Health Dashboard",
  "gridLayout": {
    "columns": "2",
    "widgets": [
      {
        "title": "CPU Utilization by Container",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"k8s_container\" AND metric.type=\"kubernetes.io/container/cpu/core_usage_time\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE",
                    "crossSeriesReducer": "REDUCE_MEAN",
                    "groupByFields": ["resource.label.container_name"]
                  }
                }
              },
              "plotType": "LINE"
            }
          ],
          "timeshiftDuration": "0s"
        }
      },
      {
        "title": "Memory Usage by Container",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"k8s_container\" AND metric.type=\"kubernetes.io/container/memory/used_bytes\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_MEAN",
                    "crossSeriesReducer": "REDUCE_MEAN",
                    "groupByFields": ["resource.label.container_name"]
                  }
                }
              },
              "plotType": "LINE"
            }
          ]
        }
      },
      {
        "title": "Request Count",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/http/request_count\"",
              "aggregation": {
                "alignmentPeriod": "3600s",
                "perSeriesAligner": "ALIGN_SUM",
                "crossSeriesReducer": "REDUCE_SUM"
              }
            }
          }
        }
      },
      {
        "title": "Error Rate",
        "scorecard": {
          "timeSeriesQuery": {
            "timeSeriesFilter": {
              "filter": "resource.type=\"k8s_container\" AND metric.type=\"custom.googleapis.com/http/error_count\"",
              "aggregation": {
                "alignmentPeriod": "3600s",
                "perSeriesAligner": "ALIGN_SUM",
                "crossSeriesReducer": "REDUCE_SUM"
              }
            }
          },
          "thresholds": [
            {
              "value": 100,
              "color": "YELLOW",
              "direction": "ABOVE"
            },
            {
              "value": 500,
              "color": "RED",
              "direction": "ABOVE"
            }
          ]
        }
      }
    ]
  }
}
```

Create the dashboard using the gcloud CLI.

```bash
# Create a dashboard from a JSON definition file
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

## Using the gcloud CLI

You can also manage dashboards entirely from the command line.

```bash
# List all dashboards
gcloud monitoring dashboards list

# Describe a specific dashboard
gcloud monitoring dashboards describe DASHBOARD_ID

# Update an existing dashboard
gcloud monitoring dashboards update DASHBOARD_ID --config-from-file=dashboard.json

# Delete a dashboard
gcloud monitoring dashboards delete DASHBOARD_ID
```

## Widget Types

Cloud Monitoring supports several widget types, each suited for different data.

Line charts work well for time-series data like CPU usage, memory, and request rates over time. Bar charts are good for comparing values across categories. Scorecards show a single number with optional thresholds - perfect for current error counts or latency. Gauges display a value against a known range. Text widgets let you add documentation or context to the dashboard.

## Building a Comprehensive Application Dashboard

A good application dashboard typically includes four sections: golden signals, infrastructure, application-specific metrics, and business metrics.

Here is the structure I use for most services.

```bash
# Create a dashboard using gcloud with inline JSON
gcloud monitoring dashboards create --config-from-file=- << 'EOF'
{
  "displayName": "My Service - Overview",
  "mosaicLayout": {
    "columns": 12,
    "tiles": [
      {
        "xPos": 0,
        "yPos": 0,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Latency (p50, p95, p99)",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_PERCENTILE_50"
                    }
                  }
                },
                "plotType": "LINE",
                "legendTemplate": "p50"
              },
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_latencies\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_PERCENTILE_95"
                    }
                  }
                },
                "plotType": "LINE",
                "legendTemplate": "p95"
              }
            ]
          }
        }
      },
      {
        "xPos": 6,
        "yPos": 0,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Count by Response Code",
          "xyChart": {
            "dataSets": [
              {
                "timeSeriesQuery": {
                  "timeSeriesFilter": {
                    "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\"",
                    "aggregation": {
                      "alignmentPeriod": "60s",
                      "perSeriesAligner": "ALIGN_SUM",
                      "crossSeriesReducer": "REDUCE_SUM",
                      "groupByFields": ["metric.label.response_code_class"]
                    }
                  }
                },
                "plotType": "STACKED_BAR"
              }
            ]
          }
        }
      }
    ]
  }
}
EOF
```

## Using Mosaic Layout for Flexible Positioning

The mosaic layout gives you more control over widget positioning and sizing compared to the grid layout. You specify the x and y position plus width and height for each tile in a 12-column grid.

This is the layout type I recommend for any dashboard beyond a simple one. It lets you put important metrics at the top and larger charts where they have room to breathe.

## Adding Variables and Filters

Dashboard-level filters let viewers narrow down what they see without modifying the dashboard definition.

```json
{
  "displayName": "Filtered Dashboard",
  "dashboardFilters": [
    {
      "labelKey": "resource.label.namespace_name",
      "filterType": "RESOURCE_LABEL",
      "templateVariable": "namespace"
    },
    {
      "labelKey": "resource.label.cluster_name",
      "filterType": "RESOURCE_LABEL",
      "templateVariable": "cluster"
    }
  ],
  "mosaicLayout": {
    "columns": 12,
    "tiles": []
  }
}
```

Users can then select specific namespaces or clusters from a dropdown, and all widgets on the dashboard filter accordingly.

## Version Controlling Dashboards

Since dashboards are JSON, you can store them in Git and deploy them through your CI/CD pipeline.

```bash
# Export an existing dashboard for version control
gcloud monitoring dashboards describe DASHBOARD_ID --format=json > dashboards/app-overview.json

# Deploy dashboards from your repository
for file in dashboards/*.json; do
  gcloud monitoring dashboards create --config-from-file="$file"
done
```

This approach lets you review dashboard changes through pull requests and roll back if a change breaks something.

## Using Terraform for Dashboard Management

If you use Terraform for infrastructure, you can manage dashboards as code.

```hcl
# main.tf - Dashboard as Terraform resource
resource "google_monitoring_dashboard" "app_dashboard" {
  dashboard_json = file("${path.module}/dashboards/app-overview.json")
}
```

## Dashboard Design Tips

After building many dashboards, here are principles I follow:

- Put the most important metrics at the top left. That is where eyes go first.
- Use scorecards for numbers that have clear thresholds (error rate, latency SLO).
- Use line charts for trends that change over time.
- Group related metrics together visually.
- Add text widgets with context - links to runbooks, explanations of what the metrics mean, or team contact info.
- Do not overload a single dashboard. Better to have focused dashboards for different audiences (on-call, product, infrastructure).

## Summary

Custom dashboards in Cloud Monitoring give your team a single view of system health. Whether you build them through the Console for quick exploration or define them as code for repeatability, the key is including the right metrics for your audience. Start with the four golden signals (latency, traffic, errors, saturation), add your application-specific metrics, and iterate based on what questions your team asks during incidents.
