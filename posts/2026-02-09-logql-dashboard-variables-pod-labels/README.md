# How to Build LogQL Dashboard Variables That Dynamically Filter by Kubernetes Pod Labels

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: LogQL, Grafana, Kubernetes

Description: Create dynamic Grafana dashboard variables using LogQL that automatically populate with Kubernetes pod labels for flexible log filtering and exploration.

---

Static dashboards quickly become outdated in dynamic Kubernetes environments where pods, deployments, and namespaces constantly change. Dashboard variables powered by LogQL queries solve this by dynamically populating dropdown lists with current label values from your logs, enabling users to filter and explore logs without editing queries.

This guide demonstrates how to build sophisticated dashboard variables that leverage Kubernetes labels for flexible log analysis in Grafana.

## Understanding Dashboard Variables in Grafana

Dashboard variables are placeholders in queries that users can change through dropdown menus. When combined with LogQL label queries, they become powerful tools for exploring logs across different dimensions like namespaces, pods, services, and custom labels.

Variables can be:
- **Query-based**: Populated from LogQL queries
- **Chained**: Dependent on other variables
- **Multi-select**: Allow selecting multiple values
- **Include all**: Support an "all" option for broad queries

## Creating Basic Label Variables

Start with simple label-based variables. In Grafana, navigate to Dashboard Settings > Variables and create a new variable:

**Variable name**: `namespace`
**Type**: Query
**Query type**: Loki
**Query**:
```logql
label_values(namespace)
```

This populates the dropdown with all namespaces present in your logs.

Create a dependent variable for pods:

**Variable name**: `pod`
**Type**: Query
**Query**:
```logql
label_values({namespace="$namespace"}, pod)
```

This shows only pods in the selected namespace.

## Building Hierarchical Variable Chains

Create a complete hierarchy of filters:

```logql
# Cluster variable (if you have multi-cluster setup)
label_values(cluster)

# Namespace variable (filtered by cluster)
label_values({cluster="$cluster"}, namespace)

# App/Service variable (filtered by cluster and namespace)
label_values({cluster="$cluster", namespace="$namespace"}, app)

# Pod variable (filtered by all above)
label_values({cluster="$cluster", namespace="$namespace", app="$app"}, pod)

# Container variable (filtered by selected pod)
label_values({cluster="$cluster", namespace="$namespace", pod="$pod"}, container)
```

Configure each variable with:
- **Multi-value**: Enabled (allows selecting multiple values)
- **Include All option**: Enabled
- **Custom all value**: `.*` (regex to match all)

## Using Regex to Filter Variable Options

Filter variable options using regex:

```logql
# Only show production namespaces
label_values({namespace=~"prod.*|production.*"}, namespace)

# Show only application pods (exclude system pods)
label_values({namespace="$namespace", pod!~".*-exporter-.*|.*-metrics-.*"}, pod)

# Filter by deployment name pattern
label_values({namespace="$namespace", pod=~"$deployment-.*"}, pod)
```

## Creating Variables from Kubernetes Labels

Extract Kubernetes labels as variable options:

```logql
# Get all unique app labels
label_values({namespace="$namespace"}, app_kubernetes_io_name)

# Get deployment versions
label_values({namespace="$namespace", app="$app"}, app_kubernetes_io_version)

# Get component types
label_values({namespace="$namespace"}, app_kubernetes_io_component)

# Custom label values
label_values({namespace="$namespace"}, team)
label_values({namespace="$namespace"}, environment)
```

## Building Dynamic Log Level Filters

Create a variable for log levels:

```logql
# Extract log levels from actual logs
label_values({namespace="$namespace"}, level)
```

Or define a custom variable with fixed values:

**Variable name**: `log_level`
**Type**: Custom
**Values**: `all,error,warn,info,debug`
**Multi-value**: Enabled
**Include All option**: Enabled

Use in queries:
```logql
{namespace="$namespace", pod="$pod"}
  | json
  | level=~"$log_level"
```

## Creating Time-Range Aware Variables

Variables that adjust based on the dashboard time range:

```logql
# Get pods that were active in the selected time range
label_values(
  rate({namespace="$namespace"}[$__interval])[5m:],
  pod
)

# Get recently deployed applications
label_values(
  {namespace="$namespace"}
  | json
  | __error__=""  # Only successfully parsed logs
  [$__range],
  app
)
```

## Building Annotation Queries with Variables

Use variables in annotation queries to mark deployments:

```logql
# Show deployment events for selected namespace and app
{namespace="$namespace", app="$app"}
  | json
  | message=~"(?i)deploy|rollout|upgrade"
```

Configure the annotation with:
- **Title**: `Deployment`
- **Tags**: `deployment,$namespace,$app`
- **Text**: `{{message}}`

## Creating Variables for HTTP Endpoints

For HTTP access logs, create variables for paths and methods:

```logql
# Get unique request paths
label_values({namespace="$namespace", app="$app"} | json, request_path)

# Get HTTP methods
label_values({namespace="$namespace", app="$app"} | json, http_method)

# Get status code ranges
label_values({namespace="$namespace", app="$app"} | json, status_category)
```

## Advanced Variable with LogQL Parsing

Extract values from log content:

```logql
# Get unique error types from logs
label_values(
  {namespace="$namespace", level="error"}
    | json
    | error_type != "",
  error_type
)

# Get unique user types
label_values(
  {namespace="$namespace"}
    | json
    | user_type != "",
  user_type
)

# Get service dependencies
label_values(
  {namespace="$namespace", app="$app"}
    | json
    | downstream_service != "",
  downstream_service
)
```

## Building Comparison Variables

Create variables for comparing different deployments or versions:

**Variable name**: `deployment_a`
**Query**:
```logql
label_values({namespace="$namespace"}, deployment)
```

**Variable name**: `deployment_b`
**Query**:
```logql
label_values({namespace="$namespace", deployment!="$deployment_a"}, deployment)
```

Use in comparison panels:

```logql
# Deployment A errors
sum(rate({namespace="$namespace", deployment="$deployment_a", level="error"}[5m]))

# Deployment B errors
sum(rate({namespace="$namespace", deployment="$deployment_b", level="error"}[5m]))
```

## Creating Variables for Query Performance

Optimize queries with interval and limit variables:

**Variable name**: `query_interval`
**Type**: Custom
**Values**: `1m,5m,10m,30m,1h`
**Default**: `5m`

**Variable name**: `log_limit`
**Type**: Custom
**Values**: `100,500,1000,5000`
**Default**: `1000`

Use in queries:
```logql
{namespace="$namespace", pod="$pod"}
  | json
  | level=~"$log_level"
| limit $log_limit
```

## Implementing Search Variables

Create free-text search variables:

**Variable name**: `search_term`
**Type**: Textbox
**Default**: `.*`

Use with regex matching:
```logql
{namespace="$namespace", pod="$pod"}
  |~ "$search_term"
```

## Building Template Variables for Queries

Create query templates using variables:

```json
// Variable: base_query
{cluster="$cluster", namespace="$namespace", app="$app"}

// Variable: parsed_query
$base_query | json | level=~"$log_level"

// Variable: filtered_query
$parsed_query | line_format "{{.message}}"
```

Use in panels:
```logql
$filtered_query |~ "$search_term"
```

## Complete Dashboard Example

Here's a complete variable configuration for a Kubernetes logging dashboard:

```yaml
# Dashboard Variables Configuration

variables:
  - name: cluster
    type: query
    datasource: Loki
    query: label_values(cluster)
    multi: false
    includeAll: false

  - name: namespace
    type: query
    datasource: Loki
    query: label_values({cluster="$cluster"}, namespace)
    multi: true
    includeAll: true
    allValue: ".*"

  - name: app
    type: query
    datasource: Loki
    query: label_values({cluster="$cluster", namespace=~"$namespace"}, app)
    multi: true
    includeAll: true
    allValue: ".*"

  - name: pod
    type: query
    datasource: Loki
    query: label_values({cluster="$cluster", namespace=~"$namespace", app=~"$app"}, pod)
    multi: true
    includeAll: true
    allValue: ".*"

  - name: log_level
    type: custom
    options: "all,error,warn,info,debug"
    multi: true
    includeAll: true
    allValue: ".*"

  - name: time_interval
    type: custom
    options: "1m,5m,15m,30m,1h,3h"
    default: "5m"
    multi: false

  - name: search
    type: textbox
    default: ""
```

## Using Variables in Queries

Apply variables in log panel queries:

```logql
# Log stream with all filters
{cluster="$cluster", namespace=~"$namespace", app=~"$app", pod=~"$pod"}
  | json
  | level=~"$log_level"
  |~ "$search"

# Error rate by app
sum by (app) (
  rate({
    cluster="$cluster",
    namespace=~"$namespace",
    app=~"$app",
    level="error"
  }[$time_interval])
)

# Log volume by pod
sum by (pod) (
  count_over_time({
    cluster="$cluster",
    namespace=~"$namespace",
    app=~"$app",
    pod=~"$pod"
  }[$time_interval])
)
```

## Debugging Variable Queries

Test variable queries in Grafana's Explore view:

1. Navigate to Explore
2. Select Loki datasource
3. Run the label query
4. Verify the results match expectations

Common issues:
- **Empty results**: Check if labels exist in the selected time range
- **Too many values**: Add more filters or use regex
- **Slow queries**: Reduce time range or add more specific label filters

## Best Practices

1. **Order variables logically**: From broad (cluster, namespace) to specific (pod, container)
2. **Use multi-select wisely**: Enable for flexible filtering, but be aware of query complexity
3. **Add defaults**: Set sensible defaults to avoid empty dashboards
4. **Test with "All" selected**: Ensure queries perform well when all values are selected
5. **Document variables**: Add descriptions explaining what each variable filters
6. **Limit cardinality**: Avoid creating variables from high-cardinality labels
7. **Cache aggressively**: Set appropriate TTL for variable queries

## Conclusion

Dynamic dashboard variables transform static Grafana dashboards into flexible exploration tools. By leveraging LogQL label queries and Kubernetes metadata, you can build dashboards that automatically adapt to your changing infrastructure. Start with basic namespace and pod variables, then gradually add more sophisticated filters based on your specific use cases. Always test variable queries with different time ranges and selections to ensure good performance.
