# How to implement Grafana dashboards with variables and templating

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Dashboard, Variable

Description: Learn how to create dynamic Grafana dashboards using variables and templating to build reusable and interactive visualizations.

---

Static dashboards work for simple monitoring scenarios, but as your infrastructure grows, you need dashboards that adapt to different environments, services, and metrics without creating dozens of duplicates. Grafana variables and templating solve this problem by allowing you to create dynamic, reusable dashboards that work across your entire infrastructure.

## Understanding Grafana Variables

Variables are placeholders that get replaced with actual values when you view a dashboard. They appear as dropdown menus at the top of your dashboard, allowing users to filter and customize the view without editing the dashboard itself.

Variables can pull values from data sources, be manually defined, or derive from other variables. This flexibility makes them powerful for creating interactive dashboards.

## Creating Your First Variable

Let's start with a simple query variable that pulls Kubernetes namespace values from Prometheus.

Navigate to Dashboard Settings, then Variables, and click Add Variable. Configure it like this:

```yaml
# Variable configuration for namespace selection

Name: namespace
Type: Query
Label: Namespace
Data source: Prometheus
Query type: Label values
Label: namespace
Metric: kube_pod_info
Refresh: On Dashboard Load
Multi-value: true
Include All option: true
```

This creates a dropdown that queries Prometheus for all unique namespace values from the `kube_pod_info` metric. Users can select one, multiple, or all namespaces.

## Using Variables in Panel Queries

Once you've defined variables, reference them in your panel queries using the `$variable_name` syntax.

```promql
# Query using namespace variable
sum(rate(container_cpu_usage_seconds_total{namespace=~"${namespace:regex}"}[5m])) by (pod)

# Query with multiple variables
rate(http_requests_total{namespace=~"${namespace:regex}", service=~"${service:regex}", method=~"${method:regex}"}[5m])
```

When users change the variable selection, Grafana automatically updates all panels that reference that variable.

## Creating Chained Variables

Variables can depend on other variables, creating cascading dropdowns that narrow down selections progressively.

```yaml
# First variable - select namespace
Name: namespace
Type: Query
Query type: Label values
Label: namespace
Metric: kube_pod_info

# Second variable - select pods in chosen namespace
Name: pod
Type: Query
Query type: Label values
Label: pod
Metric: kube_pod_info{namespace=~"${namespace:regex}"}

# Third variable - select container in chosen pod
Name: container
Type: Query
Query type: Label values
Label: container
Metric: kube_pod_container_info{namespace=~"${namespace:regex}", pod=~"${pod:regex}"}
```

This creates a three-level hierarchy where selecting a namespace filters the available pods, and selecting a pod filters the available containers.

## Custom Variable Types

Grafana supports several variable types beyond query variables.

Custom variables let you define a manual list of values:

```yaml
Name: environment
Type: Custom
Custom options: production,staging,development
```

Constant variables store values that don't change but can be referenced throughout the dashboard:

```yaml
Name: cluster_name
Type: Constant
Value: prod-us-east-1
```

Text box variables allow users to enter arbitrary values:

```yaml
Name: search_term
Type: Text box
Default value: error
```

Interval variables provide time range options for aggregation:

```yaml
Name: resolution
Type: Interval
Interval options: 30s,1m,5m,10m,30m,1h
Auto option: true
```

## Advanced Variable Formatting

Variables support multiple formatting options that control how values are substituted into queries.

```promql
# Default interpolation - for a single selected value
container_cpu_usage{pod="${pod}"}

# Regex format - for multi-value or "All" label matching
container_cpu_usage{pod=~"${pod:regex}"}

# Pipe format - for multiple values
container_cpu_usage{pod=~"${pod:pipe}"}

# Raw CSV format - for data sources or query functions that need comma-separated values
${pod:csv}

# Distributed format - for OpenTSDB queries
${pod:distributed}
```

The regex format `=~` is particularly useful when the "Include All" option is enabled or when multiple values are selected.

## Using Variables in Panel Titles

Make panel titles dynamic to provide context about what data is being displayed.

```text
# Static title
CPU Usage by Pod

# Dynamic title with variables
CPU Usage - $namespace / $pod

# Title with multiple variables
HTTP Requests ($method) - $service in $environment

# Title with formatting
[[namespace]] Pods - Last $__interval
```

Dynamic titles help users understand what they're looking at, especially when multiple variable combinations are possible.

## Template Variables with Transformations

Combine variables with Grafana transformations to create sophisticated data manipulations.

```json
{
  "panels": [
    {
      "title": "Filtered Metrics - $service",
      "targets": [
        {
          "expr": "up{job=~\"$job\"}"
        }
      ],
      "transformations": [
        {
          "id": "filterByValue",
          "options": {
            "filters": [
              {
                "fieldName": "job",
                "config": {
                  "id": "equal",
                  "options": {
                    "value": "$service"
                  }
                }
              }
            ],
            "match": "all",
            "type": "include"
          }
        }
      ]
    }
  ]
}
```

This filters the data based on the selected variable value, providing an additional layer of control beyond the query itself.

## Creating Dashboard Templates with Variables

Use variables to create dashboard templates that work across different environments or projects.

```yaml
# Environment variable
Name: env
Type: Custom
Options: prod,staging,dev

# Data source variable
Name: prometheus_ds
Type: Data source
Data source type: Prometheus
Regex: /prometheus-$env/

# Threshold variable (for alerting)
Name: cpu_threshold
Type: Constant
Value: 80
```

Then use these variables in your panels:

```promql
# Query using the threshold variable
100 - (avg(irate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > $cpu_threshold
```

Set the panel data source to `$prometheus_ds` to use the environment-specific data source selected by the data source variable.

## Variable Options for Better UX

Configure variable options to improve user experience:

```yaml
Name: service
Type: Query
Query type: Label values
Label: service
Metric: http_requests_total
Regex: /^(api|web|worker).*/  # Filter values with regex
Sort: Alphabetical (asc)
Multi-value: true
Include All option: true
All value: .*  # Use regex for "All"
```

The regex filter removes unwanted values from the dropdown, while sorting makes finding values easier.

## Provisioning Dashboards with Variables

When provisioning dashboards via configuration files, include variables in the dashboard JSON.

```json
{
  "dashboard": {
    "title": "Service Dashboard",
    "templating": {
      "list": [
        {
          "name": "namespace",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(kube_pod_info, namespace)",
          "refresh": 1,
          "multi": true,
          "includeAll": true
        },
        {
          "name": "service",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(kube_service_info{namespace=~\"${namespace:regex}\"}, service)",
          "refresh": 1,
          "multi": false
        }
      ]
    },
    "panels": []
  }
}
```

This approach ensures consistent variable configuration across deployments.

## Testing Variable Queries

Test PromQL selectors in the Explore view and use the variable editor's preview to verify the variable values before adding them to dashboards. This helps identify issues with query syntax or data source configuration.

```promql
# Test selector in Explore
metric_name

# Verify the selector returns series with the expected labels
http_requests_total{namespace="production"}
```

If the query returns no results, check your metric names, label names, and ensure data exists in your time range.

## Best Practices for Dashboard Variables

Keep variable names short and descriptive. Use lowercase with underscores for consistency.

Set sensible defaults for variables so dashboards display useful data immediately without requiring user interaction.

Limit the number of variables per dashboard. Too many variables create a cluttered interface and confuse users.

Use the "Hide" option for variables that don't need user interaction but are used for calculations or queries.

Document complex variable queries with comments in dashboard descriptions so future maintainers understand the logic.

Variables and templating transform static dashboards into dynamic tools that scale with your infrastructure. They reduce maintenance overhead and provide users with the flexibility to explore data from multiple perspectives.
