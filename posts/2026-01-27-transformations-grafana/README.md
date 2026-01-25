# How to Use Transformations in Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Transformations, Data Processing, Dashboards, Visualization, Analytics

Description: Master Grafana transformations to reshape, filter, combine, and calculate data directly in your dashboards without modifying queries or data sources.

---

## What Are Grafana Transformations?

Transformations process query results before visualization. Instead of writing complex queries or creating calculated fields in your data source, transformations let you manipulate data in Grafana itself.

Use transformations when you need to:
- Combine data from multiple queries
- Filter rows or series
- Calculate new fields
- Rename or reorganize data
- Convert between data formats

## Accessing Transformations

Open any panel in edit mode and select the "Transform" tab. You will see a list of available transformations. Transformations chain together, with each transformation processing the output of the previous one.

## Essential Transformations

### Filter by Name

Select specific series from your query results.

```yaml
Transformation: Filter by name
Configuration:
  Include: "cpu|memory"  # Regex pattern
```

Example: Your Prometheus query returns metrics for all containers, but you only want to display the application containers.

```promql
# Query returns many series
container_memory_usage_bytes{namespace="production"}

# Filter to show only app containers
Filter by name:
  Include: ".*-app-.*"
```

### Filter by Value

Keep only rows meeting certain conditions.

```yaml
Transformation: Filter by value
Configuration:
  Conditions:
    - Field: Value
      Match: Greater than
      Value: 0.9
```

Use this to show only services above a threshold:

```promql
# All service availability
sum(rate(http_requests_total{status!~"5.."}[5m])) by (service)
/
sum(rate(http_requests_total[5m])) by (service)

# Filter to show only services with availability > 99%
Filter by value:
  - Field: Value
    Match: Greater than
    Value: 0.99
```

### Reduce

Collapse multiple rows into a single summary.

```yaml
Transformation: Reduce
Configuration:
  Mode: Reduce rows
  Calculations: [Last, Mean, Max, Min]
```

Convert time series to a summary table:

```promql
# Time series query
rate(http_requests_total[5m])

# Reduce to show current, average, and peak values
Reduce:
  Calculations: [Last, Mean, Max]
```

Output becomes a table with Last, Mean, and Max columns.

### Group By

Aggregate data by field values.

```yaml
Transformation: Group by
Configuration:
  Group by: service
  Calculate:
    - Field: requests
      Calculation: Sum
    - Field: latency
      Calculation: Mean
```

### Merge

Combine multiple queries into a single result.

```yaml
# Query A: CPU usage
sum(rate(container_cpu_usage_seconds_total[5m])) by (pod)

# Query B: Memory usage
sum(container_memory_working_set_bytes) by (pod)

# Merge combines them into one table
Transformation: Merge
Result: Table with pod, CPU, Memory columns
```

This is essential for creating overview tables with data from different metrics.

### Join by Field

Combine queries using a common field.

```yaml
Transformation: Join by field
Configuration:
  Mode: Outer join
  Field: pod
```

```promql
# Query A: Pod metadata
kube_pod_info

# Query B: Pod resource usage
sum(container_memory_working_set_bytes) by (pod)

# Join on pod name
Join by field:
  Field: pod
```

Result includes columns from both queries, joined on pod name.

### Organize Fields

Rename, reorder, and hide fields.

```yaml
Transformation: Organize fields
Configuration:
  - Field: __name__
    Rename: "Metric"
    Order: 1
  - Field: Value
    Rename: "Current Value"
    Order: 2
  - Field: Time
    Hidden: true
```

### Add Field from Calculation

Create new fields based on existing data.

```yaml
Transformation: Add field from calculation
Configuration:
  Mode: Binary operation
  Operation: Field A / Field B * 100
  Alias: "Percentage"
```

Calculate percentage:

```yaml
# After merging requests and errors queries
Add field from calculation:
  Mode: Binary operation
  Operation: errors / requests * 100
  Alias: "Error Rate %"
```

### Sort By

Order results by field values.

```yaml
Transformation: Sort by
Configuration:
  Field: Value
  Reverse: true  # Descending order
```

## Advanced Transformation Chains

Transformations can be combined for powerful data processing.

### Example: Top N Services by Error Rate

```promql
# Query A: Errors
sum(rate(http_requests_total{status=~"5.."}[5m])) by (service)

# Query B: Total requests
sum(rate(http_requests_total[5m])) by (service)
```

Transformation chain:

```yaml
1. Merge
   # Combines errors and total into single table

2. Add field from calculation
   Mode: Binary operation
   Field A: errors
   Field B: total
   Operation: A / B * 100
   Alias: "Error Rate"

3. Sort by
   Field: Error Rate
   Reverse: true

4. Limit
   Limit: 10

5. Organize fields
   Hide: [errors, total]
   Rename:
     - service -> "Service"
     - Error Rate -> "Error Rate (%)"
```

### Example: Service Health Matrix

Create a matrix showing health across services and environments.

```promql
# Query: Health score per service/environment
avg(up{}) by (service, environment)
```

Transformation chain:

```yaml
1. Prepare time series
   Format: Multi-frame to wide
   # Pivots data into table format

2. Group by
   Group by: service
   Calculate: Last value for each environment field

3. Organize fields
   Reorder: [service, production, staging, development]
```

## Transformation for Different Panel Types

### Table Panels

Tables benefit most from transformations:

```yaml
# Common table transformation pattern
1. Merge (combine queries)
2. Join by field (correlate data)
3. Add field from calculation (computed columns)
4. Sort by (order results)
5. Organize fields (rename, hide, reorder)
```

### Stat Panels

Reduce transformations work well for stats:

```yaml
1. Reduce
   Calculations: [Last]
   # Single value for the stat display
```

### Time Series Panels

Filter transformations help focus visualizations:

```yaml
1. Filter by name
   Include: "critical-service.*"
   # Show only important series

2. Rename by regex
   Match: ".*{service=\"(.*)\"}"
   Replace: "$1"
   # Clean up legend
```

### Bar Gauge Panels

Sorting and limiting for rankings:

```yaml
1. Reduce
   Calculations: [Last]

2. Sort by
   Field: Value
   Reverse: true

3. Limit
   Limit: 5
```

## Performance Considerations

Transformations run in the browser. For large datasets:

### Limit Data at Query Level

```promql
# Better: Limit in query
topk(10, sum(rate(http_requests_total[5m])) by (service))

# Instead of: Query all, then transform
sum(rate(http_requests_total[5m])) by (service)
# + Limit transformation
```

### Use Server-Side Processing

Recording rules in Prometheus pre-compute values:

```yaml
# prometheus rules
- record: service:http_requests:rate5m
  expr: sum(rate(http_requests_total[5m])) by (service)
```

Then query the pre-computed metric instead of calculating in Grafana.

### Avoid Expensive Transformation Chains

Each transformation processes the full dataset. Complex chains on large datasets cause slow rendering:

```yaml
# Expensive chain
1. Merge (1000 rows)
2. Join (1000 rows)
3. Add field (1000 rows)
4. Group by (reduces to 50 rows)
5. Sort (50 rows)

# Better: Use query to reduce early
Query with aggregation -> 50 rows
1. Add field
2. Sort
```

## Debugging Transformations

### Enable Table View

While building transformations, switch the panel to Table view to see intermediate results clearly.

### Check Each Step

Add transformations one at a time and verify the output at each step. Remove transformations from the bottom up if results are unexpected.

### Common Issues

**Missing data after Join:**
- Ensure join field values match exactly
- Check for whitespace or case differences

**Unexpected nulls:**
- Inner join excludes non-matching rows
- Use outer join to keep all data

**Wrong calculation results:**
- Verify field names in calculation expressions
- Check that numeric fields are not formatted as strings

## Real-World Examples

### SLA Compliance Table

```promql
# Query A: Successful requests
sum(increase(http_requests_total{status!~"5.."}[30d])) by (service)

# Query B: Total requests
sum(increase(http_requests_total[30d])) by (service)

# Query C: SLA target (from labels or static)
vector(0.999)
```

Transformations:

```yaml
1. Merge

2. Add field from calculation
   Field A: Query A
   Field B: Query B
   Operation: A / B
   Alias: "SLA Achievement"

3. Add field from calculation
   Mode: Binary operation
   Field A: SLA Achievement
   Field B: Query C
   Operation: A >= B
   Alias: "Compliant"

4. Organize fields
   Rename:
     - service -> "Service"
     - Query C -> "Target"
   Hide: [Query A, Query B]
```

### Resource Efficiency Score

```promql
# Query A: CPU request
sum(kube_pod_container_resource_requests{resource="cpu"}) by (namespace)

# Query B: CPU usage
sum(rate(container_cpu_usage_seconds_total[5m])) by (namespace)
```

Transformations:

```yaml
1. Merge

2. Add field from calculation
   Field A: Query B
   Field B: Query A
   Operation: A / B * 100
   Alias: "CPU Efficiency %"

3. Filter by value
   Field: CPU Efficiency %
   Match: Is not null

4. Sort by
   Field: CPU Efficiency %
   Reverse: false  # Least efficient first
```

## Conclusion

Transformations unlock dashboard capabilities that would otherwise require complex queries or data source modifications. Start with simple transformations like filtering and renaming, then build up to chains that merge, calculate, and reshape data. Remember to consider performance with large datasets, and use query-level optimizations when possible. Mastering transformations makes your dashboards more flexible and maintainable.
