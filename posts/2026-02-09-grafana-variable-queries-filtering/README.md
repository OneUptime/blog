# How to Use Grafana Variable Queries for Dynamic Dashboard Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Dashboards, Variables, Filtering, Monitoring

Description: Master Grafana template variables and query variables to create dynamic, interactive dashboards that adapt to user selections and context.

---

Static dashboards quickly become overwhelming as infrastructure grows. Grafana variables enable dynamic filtering, allowing users to select namespaces, services, or time ranges without creating dozens of similar dashboards. Variables reduce dashboard maintenance, improve user experience, and enable self-service observability. This guide covers variable types, query patterns, and advanced techniques for building flexible dashboards.

## Understanding Grafana Variables

Variables are placeholders that can be selected by dashboard users. They appear as dropdowns at the top of dashboards and their values are substituted into panel queries. Types of variables:
- **Query variables**: Populated from Prometheus/data source queries
- **Custom variables**: Manually defined values
- **Constant variables**: Fixed values used throughout dashboard
- **Text box variables**: Free-form user input
- **Interval variables**: Time range selections

Variables use the syntax `$variable_name` or `${variable_name}` in queries.

## Basic Query Variable

Create a variable that lists namespaces:

```json
{
  "templating": {
    "list": [
      {
        "name": "namespace",
        "type": "query",
        "datasource": {
          "type": "prometheus",
          "uid": "prometheus"
        },
        "query": "label_values(kube_pod_info, namespace)",
        "refresh": 1,
        "includeAll": true,
        "allValue": ".*",
        "multi": true,
        "sort": 1
      }
    ]
  }
}
```

Use in panel query:

```promql
sum(rate(http_requests_total{namespace=~"$namespace"}[5m])) by (namespace)
```

## Chained Variables

Variables that depend on other variables:

```json
{
  "templating": {
    "list": [
      {
        "name": "namespace",
        "type": "query",
        "query": "label_values(kube_pod_info, namespace)",
        "includeAll": true,
        "multi": true
      },
      {
        "name": "pod",
        "type": "query",
        "query": "label_values(kube_pod_info{namespace=~\"$namespace\"}, pod)",
        "includeAll": true,
        "multi": true,
        "refresh": 2
      },
      {
        "name": "container",
        "type": "query",
        "query": "label_values(kube_pod_container_info{namespace=~\"$namespace\", pod=~\"$pod\"}, container)",
        "includeAll": true,
        "multi": true,
        "refresh": 2
      }
    ]
  }
}
```

Dashboard configuration in Grafana UI:
1. Settings > Variables > Add variable
2. Name: `namespace`
3. Type: Query
4. Data source: Prometheus
5. Query: `label_values(kube_pod_info, namespace)`
6. Refresh: On Dashboard Load
7. Multi-value: Enabled
8. Include All option: Enabled

## Common Variable Patterns

### Service Selection

```json
{
  "name": "service",
  "type": "query",
  "datasource": "prometheus",
  "query": "label_values(kube_service_info, service)",
  "refresh": 1,
  "includeAll": true,
  "multi": true,
  "sort": 1
}
```

Use in queries:

```promql
sum(rate(http_requests_total{service=~"$service"}[5m])) by (service)
```

### Node Selection

```json
{
  "name": "node",
  "type": "query",
  "query": "label_values(kube_node_info, node)",
  "refresh": 1,
  "includeAll": true,
  "multi": true
}
```

### Deployment Selection

```json
{
  "name": "deployment",
  "type": "query",
  "query": "label_values(kube_deployment_labels{namespace=~\"$namespace\"}, deployment)",
  "refresh": 2,
  "includeAll": true,
  "multi": true
}
```

### Instance Selection with Filtering

```json
{
  "name": "instance",
  "type": "query",
  "query": "label_values(up{job=\"node-exporter\"}, instance)",
  "refresh": 1,
  "includeAll": true,
  "multi": true,
  "regex": "/([^:]+):.*/",
  "sort": 1
}
```

## Advanced Variable Queries

### Dynamic Label Extraction

Extract deployment name from pod name:

```json
{
  "name": "deployment",
  "type": "query",
  "query": "query_result(topk(100, kube_pod_info{namespace=~\"$namespace\"}))",
  "regex": "/.*pod=\"([^-]*-[^-]*).*/",
  "includeAll": true,
  "multi": true
}
```

### Filtering by Metric Existence

Only show namespaces with active pods:

```json
{
  "name": "active_namespace",
  "type": "query",
  "query": "label_values(kube_pod_info{pod=~\".+\"}, namespace)",
  "refresh": 1,
  "includeAll": true,
  "multi": true
}
```

### Top N Services by Traffic

Show busiest services:

```json
{
  "name": "top_services",
  "type": "query",
  "query": "topk(10, sum by (service) (rate(http_requests_total[5m])))",
  "regex": "/.*service=\"([^\"]*)\".*/",
  "includeAll": false,
  "multi": true
}
```

### Environment-Based Filtering

```json
{
  "name": "environment",
  "type": "custom",
  "query": "production,staging,development",
  "current": {
    "text": "production",
    "value": "production"
  }
},
{
  "name": "namespace",
  "type": "query",
  "query": "label_values(kube_namespace_labels{label_environment=\"$environment\"}, namespace)",
  "refresh": 2
}
```

## Interval Variables

Create dynamic time intervals based on dashboard time range:

```json
{
  "name": "interval",
  "type": "interval",
  "query": "30s,1m,5m,10m,30m,1h",
  "auto": true,
  "auto_count": 30,
  "auto_min": "30s"
}
```

Use in queries:

```promql
rate(http_requests_total{namespace="$namespace"}[$interval])
```

## Text Box Variables

Allow custom filtering:

```json
{
  "name": "search",
  "type": "textbox",
  "query": "",
  "current": {
    "value": ""
  }
}
```

Use with regex matching:

```promql
sum(rate(http_requests_total{path=~".*$search.*"}[5m]))
```

## Constant Variables

Define constants for reuse:

```json
{
  "name": "prometheus_url",
  "type": "constant",
  "query": "http://prometheus:9090",
  "hide": 2
}
```

## Variable Options

### Multi-Select with All

```json
{
  "name": "service",
  "includeAll": true,
  "allValue": ".*",
  "multi": true,
  "current": {
    "text": "All",
    "value": "$__all"
  }
}
```

Query handles multi-select:

```promql
sum(rate(http_requests_total{service=~"$service"}[5m])) by (service)
```

### Sorting Variables

```json
{
  "name": "namespace",
  "sort": 1,  // 1 = alphabetical ascending, 2 = alphabetical descending
  "sortValue": 3  // 3 = numerical ascending, 4 = numerical descending
}
```

### Regex Transformation

Transform variable values:

```json
{
  "name": "instance",
  "query": "label_values(up, instance)",
  "regex": "/([^:]+):.*/",  // Extract hostname before port
  "includeAll": true
}
```

## Using Variables in Queries

### Basic Substitution

```promql
rate(http_requests_total{namespace="$namespace"}[5m])
```

### Multi-Value Variables

```promql
# Works with multi-select
sum(rate(http_requests_total{namespace=~"$namespace"}[5m])) by (namespace)
```

### Variable in Label Matcher

```promql
container_memory_usage_bytes{namespace=~"$namespace", pod=~"$pod"}
```

### Variable in Aggregation

```promql
sum by ($group_by) (rate(http_requests_total[5m]))
```

### Variable in Functions

```promql
topk($top_n, sum by (service) (rate(http_requests_total[5m])))
```

## Variable Formatting

Use advanced formatting:

```promql
# Pipe-separated values
{namespace=~"${namespace:pipe}"}

# Regex format
{namespace=~"${namespace:regex}"}

# CSV format
${namespace:csv}

# JSON format
${namespace:json}

# Custom format
${namespace:glob}
```

## Dynamic Dashboard Titles

Use variables in panel titles:

```json
{
  "title": "HTTP Requests - $namespace",
  "targets": [
    {
      "expr": "rate(http_requests_total{namespace=\"$namespace\"}[5m])"
    }
  ]
}
```

## Repeat Panels by Variable

Create multiple panels from a variable:

```json
{
  "panels": [
    {
      "title": "CPU Usage - $service",
      "repeat": "service",
      "repeatDirection": "h",
      "maxPerRow": 3,
      "targets": [
        {
          "expr": "sum(rate(container_cpu_usage_seconds_total{service=\"$service\"}[5m]))"
        }
      ]
    }
  ]
}
```

## Variable Dependencies

Create complex dependencies:

```json
{
  "templating": {
    "list": [
      {
        "name": "cluster",
        "query": "label_values(kube_pod_info, cluster)"
      },
      {
        "name": "namespace",
        "query": "label_values(kube_pod_info{cluster=\"$cluster\"}, namespace)"
      },
      {
        "name": "deployment",
        "query": "label_values(kube_deployment_labels{cluster=\"$cluster\", namespace=\"$namespace\"}, deployment)"
      },
      {
        "name": "pod",
        "query": "label_values(kube_pod_labels{cluster=\"$cluster\", namespace=\"$namespace\", label_app=\"$deployment\"}, pod)"
      }
    ]
  }
}
```

## Testing Variables

Test variable queries directly in Prometheus:

```bash
kubectl port-forward -n monitoring svc/prometheus-operated 9090:9090

# Test variable query
curl -s 'http://localhost:9090/api/v1/label/namespace/values' | jq '.data'

# Test with existing variables
curl -s 'http://localhost:9090/api/v1/query?query=label_values(kube_pod_info{namespace="production"},pod)' | jq
```

## Best Practices

1. Use descriptive variable names (namespace, not ns)
2. Enable multi-select for flexibility
3. Add "All" option when appropriate
4. Set proper refresh intervals (on load, on time range change)
5. Chain variables logically (cluster > namespace > service > pod)
6. Use regex to transform values when needed
7. Hide constant variables from users
8. Sort variables alphabetically for better UX
9. Test variables with edge cases (empty results, special characters)
10. Document variable purpose in dashboard description

## Performance Considerations

Optimize variable queries:

```promql
# Bad: Expensive aggregation
query_result(sum by (namespace) (kube_pod_info))

# Good: Simple label values
label_values(kube_pod_info, namespace)

# Bad: Full metric scan
label_values(container_memory_usage_bytes, namespace)

# Good: Use kube-state-metrics
label_values(kube_namespace_labels, namespace)
```

## Conclusion

Grafana variables transform static dashboards into dynamic, interactive tools. By mastering query variables, chaining, and advanced patterns, you create dashboards that scale with your infrastructure. Users can self-service their monitoring needs without requiring dashboard duplication. Combined with proper organization and performance optimization, variables enable powerful, maintainable observability solutions.
