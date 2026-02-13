# How to Use CloudWatch Metrics Math Expressions

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, CloudWatch, Metrics, Math Expressions, Monitoring

Description: Learn how to use CloudWatch Metrics Math to combine, transform, and analyze metrics with mathematical expressions for deeper monitoring insights.

---

Standard CloudWatch metrics give you raw numbers - CPU percentage, request count, byte totals. But the really useful metrics are usually derived from combining multiple raw metrics together. What's your error rate as a percentage of total requests? How much headroom does your auto-scaling group have? What's the ratio of cache hits to misses?

CloudWatch Metrics Math lets you create new time series by applying mathematical expressions to existing metrics. You don't need to publish custom metrics or run any code - you write the expression, and CloudWatch evaluates it on the fly. It works in dashboards, alarms, and the GetMetricData API.

## Basic Syntax

A Metrics Math expression references other metrics by ID and applies mathematical operations. Here's the general pattern:

```
# Metrics are referenced by their assigned IDs
# m1, m2, m3... for raw metrics
# e1, e2, e3... for expressions (convention, not required)

e1 = m1 + m2         # Addition
e2 = m1 / m2 * 100   # Percentage calculation
e3 = RATE(m1)         # Rate of change per second
```

## Common Use Cases with Examples

### Error Rate Percentage

This is probably the most common use case. Instead of looking at error count and total request count separately, calculate the error rate:

```bash
# Create a dashboard widget showing error rate percentage
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "errors",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApplicationELB",
          "MetricName": "HTTPCode_Target_5XX_Count",
          "Dimensions": [
            {"Name": "LoadBalancer", "Value": "app/my-alb/1234567890"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "requests",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApplicationELB",
          "MetricName": "RequestCount",
          "Dimensions": [
            {"Name": "LoadBalancer", "Value": "app/my-alb/1234567890"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "error_rate",
      "Expression": "errors / requests * 100",
      "Label": "Error Rate (%)"
    }
  ]' \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T12:00:00Z
```

Notice that `ReturnData` is `false` for the raw metrics. This means only the calculated `error_rate` is returned. The raw metrics are used for computation but not included in the output.

### Requests Per Second

Convert a request count metric (total over a period) to requests per second:

```bash
# Calculate requests per second from a count metric
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "total_requests",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApiGateway",
          "MetricName": "Count",
          "Dimensions": [
            {"Name": "ApiName", "Value": "my-api"}
          ]
        },
        "Period": 60,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "rps",
      "Expression": "total_requests / PERIOD(total_requests)",
      "Label": "Requests Per Second"
    }
  ]' \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T01:00:00Z
```

The `PERIOD()` function returns the period of the referenced metric in seconds. So if the period is 60 seconds, dividing the count by 60 gives you the per-second rate.

### Cache Hit Ratio

For ElastiCache or any application that reports cache hits and misses:

```bash
# Calculate cache hit ratio
aws cloudwatch get-metric-data \
  --metric-data-queries '[
    {
      "Id": "hits",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ElastiCache",
          "MetricName": "CacheHits",
          "Dimensions": [
            {"Name": "CacheClusterId", "Value": "my-redis"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "misses",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ElastiCache",
          "MetricName": "CacheMisses",
          "Dimensions": [
            {"Name": "CacheClusterId", "Value": "my-redis"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "hit_ratio",
      "Expression": "hits / (hits + misses) * 100",
      "Label": "Cache Hit Ratio (%)"
    }
  ]' \
  --start-time 2026-02-12T00:00:00Z \
  --end-time 2026-02-12T12:00:00Z
```

## Available Functions

Metrics Math supports a solid set of functions:

### Arithmetic Functions

```
ABS(m1)           # Absolute value
CEIL(m1)          # Round up
FLOOR(m1)         # Round down
MAX(m1, m2)       # Maximum of two metrics at each data point
MIN(m1, m2)       # Minimum of two metrics at each data point
```

### Statistical Functions

```
AVG(m1)           # Average across the search expression results
SUM(m1)           # Sum across search expression results
MIN(m1)           # Minimum across search expression results
MAX(m1)           # Maximum across search expression results
STDDEV(m1)        # Standard deviation
```

### Time Functions

```
PERIOD(m1)        # Returns the period in seconds
RATE(m1)          # Rate of change per second
DIFF(m1)          # Difference between consecutive data points
RUNNING_SUM(m1)   # Cumulative sum over time
```

### Conditional Functions

```
IF(condition, trueValue, falseValue)
# Example: IF(m1 > 100, m1, 0)  -- only show values above 100
```

### Search Expressions

Search expressions let you dynamically find and aggregate metrics:

```
# Find all EC2 instance CPU metrics and average them
SEARCH('{AWS/EC2, InstanceId} MetricName="CPUUtilization"', 'Average', 300)
```

## Using Metrics Math in CloudWatch Alarms

This is where Metrics Math really shines. You can alarm on derived metrics that don't exist as standalone CloudWatch metrics.

Alarm when error rate exceeds 5%:

```bash
# Create an alarm based on a math expression
aws cloudwatch put-metric-alarm \
  --alarm-name "HighErrorRate" \
  --alarm-description "Error rate exceeds 5%" \
  --evaluation-periods 3 \
  --comparison-operator GreaterThanThreshold \
  --threshold 5 \
  --metrics '[
    {
      "Id": "errors",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApplicationELB",
          "MetricName": "HTTPCode_Target_5XX_Count",
          "Dimensions": [
            {"Name": "LoadBalancer", "Value": "app/my-alb/1234567890"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "requests",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApplicationELB",
          "MetricName": "RequestCount",
          "Dimensions": [
            {"Name": "LoadBalancer", "Value": "app/my-alb/1234567890"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "error_rate",
      "Expression": "IF(requests > 0, errors / requests * 100, 0)",
      "Label": "Error Rate"
    }
  ]' \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

The `IF(requests > 0, ...)` prevents division by zero during periods with no traffic.

### Anomaly Detection with Metrics Math

Combine math expressions with anomaly detection for smarter alarms:

```bash
# Alarm when error rate deviates from its normal band
aws cloudwatch put-metric-alarm \
  --alarm-name "ErrorRateAnomaly" \
  --evaluation-periods 3 \
  --comparison-operator GreaterThanUpperThreshold \
  --threshold-metric-id "ad1" \
  --metrics '[
    {
      "Id": "errors",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApplicationELB",
          "MetricName": "HTTPCode_Target_5XX_Count",
          "Dimensions": [
            {"Name": "LoadBalancer", "Value": "app/my-alb/1234567890"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "requests",
      "MetricStat": {
        "Metric": {
          "Namespace": "AWS/ApplicationELB",
          "MetricName": "RequestCount",
          "Dimensions": [
            {"Name": "LoadBalancer", "Value": "app/my-alb/1234567890"}
          ]
        },
        "Period": 300,
        "Stat": "Sum"
      },
      "ReturnData": false
    },
    {
      "Id": "error_rate",
      "Expression": "IF(requests > 0, errors / requests * 100, 0)",
      "ReturnData": true
    },
    {
      "Id": "ad1",
      "Expression": "ANOMALY_DETECTION_BAND(error_rate, 2)"
    }
  ]' \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:alerts
```

## Dashboard Widget Examples

Here's a dashboard source JSON that uses math expressions:

```json
// Dashboard widget showing multiple derived metrics
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [{"expression": "errors / requests * 100", "label": "Error Rate %", "id": "e1"}],
          ["AWS/ApplicationELB", "HTTPCode_Target_5XX_Count", "LoadBalancer", "app/my-alb/123", {"id": "errors", "visible": false, "stat": "Sum"}],
          ["AWS/ApplicationELB", "RequestCount", "LoadBalancer", "app/my-alb/123", {"id": "requests", "visible": false, "stat": "Sum"}]
        ],
        "period": 300,
        "title": "Error Rate"
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [{"expression": "used / total * 100", "label": "Memory Usage %", "id": "e1"}],
          ["CWAgent", "mem_used", "InstanceId", "i-123", {"id": "used", "visible": false}],
          ["CWAgent", "mem_total", "InstanceId", "i-123", {"id": "total", "visible": false}]
        ],
        "period": 300,
        "title": "Memory Usage Percentage"
      }
    }
  ]
}
```

## Advanced Patterns

### Comparing Time Periods

Use `METRICS()` with time offsets to compare current metrics to the same time last week:

```
# Current week's requests
m1 = RequestCount (current)

# Last week's requests using METRICS with offset
e1 = METRICS("m1") with period offset of 604800 seconds (7 days)
```

### Filling Missing Data

Handle gaps in your metrics:

```
# Replace missing data points with zero
FILL(m1, 0)

# Repeat the last known value
FILL(m1, REPEAT)

# Linear interpolation between known points
FILL(m1, LINEAR)
```

### Combining Multiple Services

Aggregate metrics across services:

```
# Total requests across all API endpoints
SEARCH('{AWS/ApiGateway, ApiName} MetricName="Count"', 'Sum', 300)
```

## Best Practices

**Use IF() for division.** Any expression that divides metrics should handle the zero case. `IF(denominator > 0, numerator/denominator, 0)` prevents NaN values that can break alarms.

**Set ReturnData correctly.** Only return the final computed metric when you're using expressions in alarms or when you want a clean API response. Set `ReturnData: false` on intermediate metrics.

**Keep expressions readable.** Complex nested expressions are hard to debug. Break them into multiple named expressions when possible.

**Watch the metric resolution.** All metrics in an expression must use the same period. If you mix 1-minute and 5-minute metrics, you'll get unexpected results.

For more on building effective dashboards with these expressions, check out our guide on [CloudWatch dashboards with Terraform](https://oneuptime.com/blog/post/2026-02-12-cloudwatch-dashboards-terraform/view).

## Wrapping Up

Metrics Math turns CloudWatch from a simple metric viewer into an analytics tool. The ability to derive new metrics from existing ones - especially in alarms - means you can monitor complex conditions without publishing custom metrics. Start with the basics like error rates and utilization percentages, then explore search expressions and anomaly detection as you need more sophistication.
