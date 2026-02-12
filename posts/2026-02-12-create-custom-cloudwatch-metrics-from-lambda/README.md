# How to Create Custom CloudWatch Metrics from Lambda

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: AWS, Lambda, CloudWatch, Metrics, Observability

Description: Publish custom CloudWatch metrics from AWS Lambda functions to track business KPIs, application-specific performance data, and operational metrics beyond the defaults.

---

Lambda's built-in CloudWatch metrics tell you about invocations, errors, and duration. But they don't tell you about your application. How many orders were processed? What's the average payment amount? How many items are in the queue? How long does the database query take versus the total function duration?

Custom metrics fill this gap. You can publish any numerical data point to CloudWatch from your Lambda function, then build alarms and dashboards around your specific business and application metrics.

## Two Ways to Publish Custom Metrics

There are two approaches:

1. **CloudWatch PutMetricData API** - Direct API calls. More flexible, but adds latency and cost per API call.
2. **Embedded Metric Format (EMF)** - Structured log lines that CloudWatch automatically extracts as metrics. Zero additional API calls, lower latency, and lower cost.

EMF is the recommended approach for Lambda. Let's cover both.

## Approach 1: PutMetricData API

The straightforward way - call the CloudWatch API to publish metrics:

```javascript
// Publish custom metrics using the CloudWatch API
const { CloudWatchClient, PutMetricDataCommand } = require('@aws-sdk/client-cloudwatch');

const cloudwatch = new CloudWatchClient({ region: 'us-east-1' });

async function publishMetric(metricName, value, unit, dimensions = []) {
  await cloudwatch.send(new PutMetricDataCommand({
    Namespace: 'MyApp',
    MetricData: [
      {
        MetricName: metricName,
        Value: value,
        Unit: unit,
        Dimensions: dimensions,
        Timestamp: new Date(),
      },
    ],
  }));
}

exports.handler = async (event) => {
  const startTime = Date.now();

  // Process the order
  const order = await processOrder(event);

  // Publish custom metrics
  await publishMetric('OrdersProcessed', 1, 'Count', [
    { Name: 'Region', Value: order.region },
  ]);

  await publishMetric('OrderAmount', order.total, 'None', [
    { Name: 'Region', Value: order.region },
    { Name: 'PaymentType', Value: order.paymentType },
  ]);

  await publishMetric('ProcessingTime', Date.now() - startTime, 'Milliseconds');

  return { statusCode: 200, body: JSON.stringify(order) };
};
```

Batch multiple metrics in a single API call for efficiency:

```javascript
// Batch multiple metrics into a single API call
async function publishMetrics(metrics) {
  const metricData = metrics.map(m => ({
    MetricName: m.name,
    Value: m.value,
    Unit: m.unit || 'None',
    Dimensions: m.dimensions || [],
    Timestamp: new Date(),
  }));

  // PutMetricData accepts up to 1000 metric data points per call
  for (let i = 0; i < metricData.length; i += 1000) {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: 'MyApp',
      MetricData: metricData.slice(i, i + 1000),
    }));
  }
}

// Usage
await publishMetrics([
  { name: 'OrdersProcessed', value: 1, unit: 'Count' },
  { name: 'OrderAmount', value: order.total },
  { name: 'ItemCount', value: order.items.length, unit: 'Count' },
  { name: 'DbQueryTime', value: dbDuration, unit: 'Milliseconds' },
]);
```

## Approach 2: Embedded Metric Format (Recommended)

EMF lets you publish metrics by simply logging a specially formatted JSON object. CloudWatch picks it up automatically - no API calls needed.

```javascript
// Publish metrics using Embedded Metric Format - zero API calls
function emitMetric(metrics, dimensions, properties = {}) {
  const metricDefinitions = Object.entries(metrics).map(([name, value]) => ({
    Name: name,
    Unit: typeof value === 'object' ? value.unit : 'None',
  }));

  const metricValues = {};
  for (const [name, value] of Object.entries(metrics)) {
    metricValues[name] = typeof value === 'object' ? value.value : value;
  }

  // CloudWatch recognizes this format and extracts metrics automatically
  console.log(JSON.stringify({
    _aws: {
      Timestamp: Date.now(),
      CloudWatchMetrics: [
        {
          Namespace: 'MyApp',
          Dimensions: [Object.keys(dimensions)],
          Metrics: metricDefinitions,
        },
      ],
    },
    ...dimensions,
    ...metricValues,
    ...properties,
  }));
}

exports.handler = async (event) => {
  const startTime = Date.now();
  const order = await processOrder(event);
  const duration = Date.now() - startTime;

  // Emit metrics via structured log - no API call needed
  emitMetric(
    {
      OrdersProcessed: 1,
      OrderAmount: order.total,
      ProcessingTime: { value: duration, unit: 'Milliseconds' },
    },
    {
      Environment: process.env.ENVIRONMENT,
      Region: order.region,
    },
    {
      // Additional properties for log context (not metrics)
      orderId: order.id,
      customerId: order.customerId,
    }
  );

  return { statusCode: 200, body: JSON.stringify(order) };
};
```

## Using the AWS EMF Library

AWS provides official EMF libraries that make this cleaner:

```javascript
// Using the official aws-embedded-metrics library
const { createMetricsLogger, Unit } = require('aws-embedded-metrics');

exports.handler = async (event) => {
  const metrics = createMetricsLogger();

  // Set dimensions
  metrics.setDimensions({ Environment: 'production', Service: 'orders' });

  // Set namespace
  metrics.setNamespace('MyApp');

  const startTime = Date.now();
  const order = await processOrder(event);

  // Record metrics
  metrics.putMetric('OrdersProcessed', 1, Unit.Count);
  metrics.putMetric('OrderAmount', order.total, Unit.None);
  metrics.putMetric('ProcessingTime', Date.now() - startTime, Unit.Milliseconds);

  // Add non-metric properties for searchability in logs
  metrics.setProperty('orderId', order.id);
  metrics.setProperty('customerId', order.customerId);

  // Flush metrics (writes the EMF log line)
  await metrics.flush();

  return { statusCode: 200, body: JSON.stringify(order) };
};
```

Install the library:

```bash
npm install aws-embedded-metrics
```

## Python EMF Example

```python
# Python EMF metrics using aws-embedded-metrics
from aws_embedded_metrics import metric_scope
from aws_embedded_metrics.unit import Unit

@metric_scope
def handler(event, context, metrics):
    metrics.set_namespace("MyApp")
    metrics.set_dimensions({"Environment": "production", "Service": "orders"})

    # Process the request
    order = process_order(event)

    # Record metrics
    metrics.put_metric("OrdersProcessed", 1, Unit.COUNT)
    metrics.put_metric("OrderAmount", order['total'], Unit.NONE)

    # Add searchable properties
    metrics.set_property("orderId", order['id'])

    return {'statusCode': 200, 'body': json.dumps(order)}
```

Install with:

```bash
pip install aws-embedded-metrics
```

## High-Resolution Metrics

For metrics that need sub-minute granularity, use storage resolution of 1 second:

```javascript
// Publish high-resolution metrics (1-second granularity)
await cloudwatch.send(new PutMetricDataCommand({
  Namespace: 'MyApp',
  MetricData: [
    {
      MetricName: 'ActiveConnections',
      Value: connectionCount,
      Unit: 'Count',
      StorageResolution: 1,  // 1-second resolution (default is 60)
      Timestamp: new Date(),
    },
  ],
}));
```

Note: High-resolution metrics cost more. Use them only for metrics where second-level granularity matters.

## Building Alarms on Custom Metrics

Once your metrics are in CloudWatch, create alarms just like built-in metrics:

```bash
# Alarm when order processing is too slow
aws cloudwatch put-metric-alarm \
  --alarm-name "slow-order-processing" \
  --namespace MyApp \
  --metric-name ProcessingTime \
  --statistic p99 \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5000 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions "arn:aws:sns:us-east-1:123456789012:alerts"

# Alarm when error rate exceeds 5%
aws cloudwatch put-metric-alarm \
  --alarm-name "high-error-rate" \
  --metrics '[
    {
      "Id": "errors",
      "MetricStat": {
        "Metric": {
          "Namespace": "MyApp",
          "MetricName": "ProcessingErrors",
          "Dimensions": [{"Name": "Environment", "Value": "production"}]
        },
        "Period": 300,
        "Stat": "Sum"
      }
    },
    {
      "Id": "total",
      "MetricStat": {
        "Metric": {
          "Namespace": "MyApp",
          "MetricName": "OrdersProcessed",
          "Dimensions": [{"Name": "Environment", "Value": "production"}]
        },
        "Period": 300,
        "Stat": "Sum"
      }
    },
    {
      "Id": "errorRate",
      "Expression": "(errors / total) * 100",
      "Label": "Error Rate %"
    }
  ]' \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1
```

## Metric Best Practices

**Choose dimensions wisely.** Each unique combination of dimensions creates a separate metric stream. If you use high-cardinality dimensions (like userId or orderId), you'll create millions of metric streams and the costs will explode.

Good dimensions: Environment, Region, Service, Endpoint, StatusCode
Bad dimensions: UserId, OrderId, RequestId, Timestamp

**Use statistics instead of individual values.** CloudWatch stores metrics as statistical sets, so you automatically get min, max, average, sum, and percentiles.

**Batch your metrics.** If using PutMetricData, batch multiple data points in a single call rather than making one API call per metric.

**Prefer EMF over PutMetricData.** EMF is cheaper (you pay for log ingestion, not per-metric API calls), adds zero latency to your function, and the log lines double as searchable audit records.

## Common Metric Patterns

Here's a reusable pattern for tracking Lambda function performance at a granular level:

```javascript
// Comprehensive performance tracking for Lambda
async function trackPerformance(name, fn) {
  const start = Date.now();
  let success = true;

  try {
    const result = await fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = Date.now() - start;
    emitMetric(
      {
        [`${name}Duration`]: { value: duration, unit: 'Milliseconds' },
        [`${name}Success`]: success ? 1 : 0,
        [`${name}Failure`]: success ? 0 : 1,
      },
      { Service: 'my-service' }
    );
  }
}

// Usage - track each operation separately
exports.handler = async (event) => {
  const user = await trackPerformance('DbQuery', () => getUser(event.userId));
  const enriched = await trackPerformance('ApiCall', () => enrichProfile(user));
  const result = await trackPerformance('Transform', () => formatResponse(enriched));
  return result;
};
```

## Wrapping Up

Custom CloudWatch metrics bridge the gap between infrastructure monitoring and business monitoring. They let you track what matters to your application - order volumes, processing times, error rates by endpoint, payment amounts - not just Lambda invocation counts. The Embedded Metric Format is the best approach for Lambda: it's free (beyond normal log costs), adds no latency, and your metric log lines serve as both metrics and searchable logs. Start with a few key business metrics and expand as you learn what's useful.
