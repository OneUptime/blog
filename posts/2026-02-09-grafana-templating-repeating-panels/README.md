# How to Use Grafana Dashboard Templating with Repeating Panels per Namespace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Dashboards, Kubernetes

Description: Master Grafana's repeating panels feature to automatically create visualizations for multiple namespaces, reducing dashboard maintenance and improving multi-tenant monitoring workflows.

---

Grafana's repeating panels feature lets you automatically duplicate panels based on template variable values. This is particularly useful when monitoring multiple Kubernetes namespaces, environments, or services where you want identical visualizations for each entity.

Instead of manually creating dozens of panels, you can define one panel template and have Grafana generate copies automatically. This approach reduces maintenance burden and ensures consistency across your dashboards.

## Understanding Template Variables and Repeating Panels

Template variables are placeholders in your queries that users can change through dropdown menus. When you mark a panel as repeating, Grafana creates a copy of that panel for each value in a template variable.

This works best with multi-value variables that return lists of values like namespace names, pod labels, or service identifiers.

## Creating a Multi-Value Template Variable

Start by creating a template variable that queries all namespaces:

1. Open your dashboard and click the gear icon (Dashboard settings)
2. Go to Variables and click "Add variable"
3. Configure the variable:

```
Name: namespace
Type: Query
Label: Namespace
Data source: Prometheus
Query: label_values(kube_namespace_created, namespace)
Regex: (leave empty or filter with regex)
Multi-value: Enabled
Include All option: Enabled
```

This variable queries Prometheus for all namespace labels and allows users to select multiple namespaces or all of them at once.

## Creating a Panel with Variable Reference

Create a panel that uses the namespace variable in its query:

```promql
# CPU usage per namespace
sum(rate(container_cpu_usage_seconds_total{namespace="$namespace"}[5m])) by (pod)
```

The `$namespace` variable will be replaced with the selected namespace values when the query runs.

## Configuring Panel Repeating

To make the panel repeat for each namespace:

1. Edit the panel
2. Scroll down to "Repeat options" in the panel settings
3. Set "Repeat by variable" to `namespace`
4. Choose repeat direction: Horizontal or Vertical
5. Set max per row (for horizontal repeating)

```json
{
  "repeat": "namespace",
  "repeatDirection": "h",
  "maxPerRow": 3
}
```

Save the dashboard. Grafana will now create one panel for each selected namespace value.

## Advanced Template Variable Configuration

Create variables that depend on each other for hierarchical filtering:

```
# Variable 1: Cluster
Name: cluster
Query: label_values(kube_node_info, cluster)

# Variable 2: Namespace (filtered by cluster)
Name: namespace
Query: label_values(kube_namespace_labels{cluster="$cluster"}, namespace)

# Variable 3: Deployment (filtered by namespace)
Name: deployment
Query: label_values(kube_deployment_created{namespace="$namespace"}, deployment)
```

This creates a cascading selection where choosing a cluster filters available namespaces, and choosing a namespace filters available deployments.

## Building a Complete Multi-Namespace Dashboard

Here's a complete dashboard JSON snippet with repeating panels:

```json
{
  "dashboard": {
    "title": "Multi-Namespace Monitoring",
    "templating": {
      "list": [
        {
          "name": "namespace",
          "type": "query",
          "datasource": "Prometheus",
          "query": "label_values(kube_namespace_created, namespace)",
          "multi": true,
          "includeAll": true,
          "allValue": ".*",
          "refresh": 1
        }
      ]
    },
    "panels": [
      {
        "id": 1,
        "title": "CPU Usage - $namespace",
        "type": "graph",
        "repeat": "namespace",
        "repeatDirection": "h",
        "maxPerRow": 2,
        "targets": [
          {
            "expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\"}[5m])) by (pod)",
            "legendFormat": "{{pod}}"
          }
        ]
      },
      {
        "id": 2,
        "title": "Memory Usage - $namespace",
        "type": "graph",
        "repeat": "namespace",
        "repeatDirection": "h",
        "maxPerRow": 2,
        "targets": [
          {
            "expr": "sum(container_memory_working_set_bytes{namespace=\"$namespace\"}) by (pod)",
            "legendFormat": "{{pod}}"
          }
        ]
      }
    ]
  }
}
```

This configuration creates CPU and memory panels for each selected namespace.

## Using Repeating Rows for Complex Layouts

For more complex layouts, use repeating rows that contain multiple panels:

1. Add a row panel to your dashboard
2. Configure the row to repeat by your variable
3. Add multiple panels inside the row
4. All panels in the row will repeat together

```json
{
  "type": "row",
  "title": "Namespace: $namespace",
  "repeat": "namespace",
  "collapsed": false,
  "panels": [
    {
      "title": "CPU Usage",
      "type": "graph",
      "targets": [
        {"expr": "sum(rate(container_cpu_usage_seconds_total{namespace=\"$namespace\"}[5m]))"}
      ]
    },
    {
      "title": "Memory Usage",
      "type": "graph",
      "targets": [
        {"expr": "sum(container_memory_working_set_bytes{namespace=\"$namespace\"})"}
      ]
    },
    {
      "title": "Network I/O",
      "type": "graph",
      "targets": [
        {"expr": "sum(rate(container_network_transmit_bytes_total{namespace=\"$namespace\"}[5m]))"}
      ]
    }
  ]
}
```

Each namespace gets a complete row with CPU, memory, and network panels.

## Dynamic Panel Titles and Legends

Use template variables in panel titles and legend formats for clarity:

```
Panel Title: Namespace $namespace - CPU Usage
Legend Format: {{pod}} in $namespace
```

This makes each repeated panel clearly identify which namespace it represents.

## Handling Large Numbers of Repeated Panels

When you have many namespaces, repeated panels can make dashboards overwhelming:

```
# Limit namespaces with regex
Regex: ^(production|staging|development).*$

# Use collapsible rows
{
  "type": "row",
  "repeat": "namespace",
  "collapsed": true
}

# Set reasonable defaults
Include All option: Disabled
Default: production
```

Start with collapsed rows and specific namespace selection to keep dashboards manageable.

## Combining Repeating Panels with Other Variables

Use multiple variables to create flexible dashboards:

```promql
# Query using multiple variables
sum(rate(container_cpu_usage_seconds_total{
  namespace="$namespace",
  cluster="$cluster",
  pod=~"$pod_pattern"
}[5m])) by (pod)
```

Only the `$namespace` variable needs to be the repeat variable, but you can filter by other variables in the queries.

## Performance Considerations

Repeating panels multiplies the number of queries Grafana executes:

```
# If you have:
- 10 namespaces selected
- 4 repeating panels per namespace
- 2 queries per panel

# Grafana executes:
10 * 4 * 2 = 80 queries
```

Optimize performance by:

```
# Use efficient queries
- Increase scrape intervals for heavy queries
- Use recording rules for complex calculations
- Limit time ranges appropriately

# Reduce cardinality
- Filter labels in queries
- Use topk() to limit results
- Aggregate before repeating

# Example optimized query
topk(10, sum(rate(container_cpu_usage_seconds_total{namespace="$namespace"}[5m])) by (pod))
```

## Exporting and Sharing Repeating Dashboards

When sharing dashboards with repeating panels, others can customize namespace selection:

```bash
# Export dashboard JSON
curl -H "Authorization: Bearer $GRAFANA_API_KEY" \
  "http://localhost:3000/api/dashboards/uid/abc123" > dashboard.json

# Import with provisioning
cp dashboard.json /etc/grafana/provisioning/dashboards/

# Or use Terraform
resource "grafana_dashboard" "namespace_monitoring" {
  config_json = file("dashboard.json")
}
```

The repeating behavior is preserved in the exported JSON.

## Troubleshooting Common Issues

**Panels not repeating:**
- Verify the variable is multi-value enabled
- Check that the repeat variable name matches exactly
- Ensure the variable has values available

**Too many panels generated:**
- Add regex filtering to the variable
- Use "Include All" option carefully
- Consider using collapsed rows

**Variables not updating:**
- Check variable refresh settings
- Verify data source connectivity
- Test queries independently in Explore

**Performance problems:**
- Reduce selected namespace count
- Optimize query efficiency
- Increase query timeout settings

## Real-World Example: Multi-Tenant SaaS Monitoring

Here's a complete dashboard for monitoring multiple customer namespaces:

```json
{
  "templating": {
    "list": [
      {
        "name": "customer",
        "query": "label_values(kube_namespace_labels{label_tenant_type=\"customer\"}, namespace)",
        "multi": true,
        "includeAll": false
      },
      {
        "name": "interval",
        "type": "interval",
        "auto": true,
        "options": ["1m", "5m", "15m", "1h"]
      }
    ]
  },
  "panels": [
    {
      "type": "row",
      "title": "Customer: $customer",
      "repeat": "customer",
      "collapsed": false,
      "panels": [
        {
          "title": "Request Rate",
          "targets": [{
            "expr": "sum(rate(http_requests_total{namespace=\"$customer\"}[$interval]))"
          }]
        },
        {
          "title": "Error Rate",
          "targets": [{
            "expr": "sum(rate(http_requests_total{namespace=\"$customer\",status=~\"5..\"}[$interval]))"
          }]
        },
        {
          "title": "Latency p95",
          "targets": [{
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{namespace=\"$customer\"}[$interval]))"
          }]
        }
      ]
    }
  ]
}
```

This dashboard automatically scales to any number of customer namespaces with consistent monitoring for each.

## Conclusion

Grafana's repeating panels transform dashboard management from a tedious manual process into an automated, scalable solution. By leveraging template variables and repeating panels, you can monitor dozens or hundreds of namespaces with a single dashboard definition.

The key is proper variable configuration, efficient queries, and thoughtful panel layout. Start with a small number of namespaces to test your dashboard design, then scale up as you refine performance and layout.
