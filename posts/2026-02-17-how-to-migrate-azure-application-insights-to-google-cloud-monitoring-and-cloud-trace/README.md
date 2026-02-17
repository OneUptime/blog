# How to Migrate Azure Application Insights to Google Cloud Monitoring and Cloud Trace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Google Cloud Monitoring, Cloud Trace, Azure Application Insights, Observability, Cloud Migration

Description: A practical guide to migrating application observability from Azure Application Insights to Google Cloud Monitoring and Cloud Trace, covering metrics, traces, logs, and alerting.

---

Azure Application Insights combines metrics, distributed tracing, logging, and availability monitoring in a single service. In Google Cloud, these capabilities are spread across several services: Cloud Monitoring for metrics and dashboards, Cloud Trace for distributed tracing, Cloud Logging for application logs, and Cloud Monitoring uptime checks for availability.

This separation actually gives you more flexibility in how you collect and analyze telemetry, but it means you need to configure multiple services during migration.

## Service Mapping

| Application Insights Feature | GCP Equivalent |
|----------------------------|----------------|
| Metrics | Cloud Monitoring custom metrics |
| Distributed traces | Cloud Trace |
| Application logs | Cloud Logging |
| Availability tests | Cloud Monitoring uptime checks |
| Application Map | Cloud Trace service graph |
| Smart detection | Cloud Monitoring anomaly detection |
| Alerts | Cloud Monitoring alerting policies |
| Workbooks | Cloud Monitoring dashboards |
| Live Metrics | Cloud Monitoring real-time dashboards |
| Custom events | Cloud Logging + custom metrics |
| User analytics | N/A (use Google Analytics or BigQuery) |

## Step 1: Inventory Your Application Insights Setup

Document what you are monitoring and how.

```bash
# List Application Insights resources
az monitor app-insights component show \
  --resource-group my-rg \
  --query '{
    Name:name,
    InstrumentationKey:instrumentationKey,
    RetentionDays:retentionInDays,
    DailyDataCap:applicationId
  }'

# List alert rules
az monitor metrics alert list \
  --resource-group my-rg \
  --output table

# List availability tests
az monitor app-insights web-test list \
  --resource-group my-rg \
  --query '[*].{Name:name,URL:configuration.webTest}' \
  --output table
```

## Step 2: Set Up OpenTelemetry

The best approach for the migration is to use OpenTelemetry (OTel), which provides a vendor-neutral instrumentation layer. This lets you send telemetry to both Application Insights and Google Cloud during the transition period.

Install the OpenTelemetry SDK with Google Cloud exporters:

```bash
# Python example
pip install opentelemetry-api \
  opentelemetry-sdk \
  opentelemetry-exporter-gcp-trace \
  opentelemetry-exporter-gcp-monitoring \
  opentelemetry-instrumentation-flask \
  opentelemetry-instrumentation-requests
```

Configure OpenTelemetry to export to Google Cloud:

```python
# OpenTelemetry configuration for Google Cloud
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.cloud_trace import CloudTraceSpanExporter
from opentelemetry.exporter.cloud_monitoring import CloudMonitoringMetricsExporter

# Set up tracing - sends traces to Cloud Trace
tracer_provider = TracerProvider()
cloud_trace_exporter = CloudTraceSpanExporter(project_id='my-project')
tracer_provider.add_span_processor(BatchSpanProcessor(cloud_trace_exporter))
trace.set_tracer_provider(tracer_provider)

# Set up metrics - sends metrics to Cloud Monitoring
metric_reader = PeriodicExportingMetricReader(
    CloudMonitoringMetricsExporter(project_id='my-project'),
    export_interval_millis=60000  # Export every 60 seconds
)
meter_provider = MeterProvider(metric_readers=[metric_reader])
metrics.set_meter_provider(meter_provider)

# Get tracer and meter for your application
tracer = trace.get_tracer('my-app')
meter = metrics.get_meter('my-app')
```

## Step 3: Replace Application Insights SDK Calls

Convert your Application Insights instrumentation to OpenTelemetry.

### Tracking Requests/Traces

```python
# Old Application Insights code
from applicationinsights import TelemetryClient

tc = TelemetryClient('your-instrumentation-key')

def handle_request():
    tc.track_request('GET /api/users', 'https://api.example.com/users',
                     success=True, duration=150)
    tc.flush()

# New OpenTelemetry code
from opentelemetry import trace

tracer = trace.get_tracer('my-app')

def handle_request():
    # Create a span that automatically captures timing and status
    with tracer.start_as_current_span('GET /api/users') as span:
        span.set_attribute('http.method', 'GET')
        span.set_attribute('http.url', 'https://api.example.com/users')
        # Your request handling code here
        result = process_request()
        span.set_attribute('http.status_code', 200)
        return result
```

### Custom Metrics

```python
# Old Application Insights custom metrics
tc.track_metric('OrderProcessingTime', 1.5)
tc.track_metric('ActiveUsers', 42)

# New OpenTelemetry custom metrics
from opentelemetry import metrics

meter = metrics.get_meter('my-app')

# Create metric instruments
order_processing_time = meter.create_histogram(
    name='order_processing_time',
    description='Time to process an order in seconds',
    unit='s'
)

active_users = meter.create_up_down_counter(
    name='active_users',
    description='Number of currently active users'
)

# Record metrics
order_processing_time.record(1.5, attributes={'order_type': 'standard'})
active_users.add(1)
```

### Custom Events and Logging

```python
# Old Application Insights custom events
tc.track_event('OrderPlaced', {'orderId': '123', 'total': '99.99'})
tc.track_trace('Processing payment for order 123')
tc.track_exception()

# New code using Cloud Logging
import google.cloud.logging
import logging

# Set up Cloud Logging
client = google.cloud.logging.Client()
client.setup_logging()
logger = logging.getLogger('my-app')

# Log structured events (replaces track_event)
logger.info('OrderPlaced', extra={
    'json_fields': {
        'orderId': '123',
        'total': '99.99',
        'event_type': 'OrderPlaced'
    }
})

# Log traces (replaces track_trace)
logger.info('Processing payment for order 123')

# Log exceptions (replaces track_exception)
try:
    process_payment()
except Exception:
    logger.exception('Payment processing failed')
```

## Step 4: Set Up Auto-Instrumentation

For web frameworks, use OpenTelemetry auto-instrumentation to capture HTTP requests, database calls, and external service calls automatically.

```python
# Flask auto-instrumentation
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

# Instrument your Flask app and HTTP client
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()
SQLAlchemyInstrumentor().instrument(engine=db_engine)
```

For Node.js:

```javascript
// Node.js OpenTelemetry auto-instrumentation
const { NodeTracerProvider } = require('@opentelemetry/sdk-trace-node');
const { TraceExporter } = require('@google-cloud/opentelemetry-cloud-trace-exporter');
const { BatchSpanProcessor } = require('@opentelemetry/sdk-trace-base');
const { registerInstrumentations } = require('@opentelemetry/instrumentation');
const { HttpInstrumentation } = require('@opentelemetry/instrumentation-http');
const { ExpressInstrumentation } = require('@opentelemetry/instrumentation-express');

// Configure the tracer provider
const provider = new NodeTracerProvider();
const exporter = new TraceExporter({ projectId: 'my-project' });
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

// Auto-instrument HTTP and Express
registerInstrumentations({
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});
```

## Step 5: Migrate Availability Tests

Convert Application Insights availability tests to Cloud Monitoring uptime checks.

```bash
# Create an HTTPS uptime check (equivalent to URL ping test)
gcloud monitoring uptime-checks create https \
  --display-name="API Health Check" \
  --uri="https://api.example.com/health" \
  --check-every=300 \
  --timeout=10 \
  --regions=USA,EUROPE,ASIA_PACIFIC

# Create an uptime check with custom headers
gcloud monitoring uptime-checks create https \
  --display-name="Authenticated Endpoint Check" \
  --uri="https://api.example.com/status" \
  --check-every=60 \
  --headers="Authorization=Bearer test-token"
```

## Step 6: Migrate Alerts

Convert Application Insights alert rules to Cloud Monitoring alerting policies.

```bash
# Alert on high error rate (equivalent to Application Insights failure rate alert)
gcloud monitoring policies create \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate above 5%" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_count" AND metric.labels.response_code_class="5xx"' \
  --condition-threshold-value=5 \
  --condition-threshold-comparison=COMPARISON_GT \
  --notification-channels=projects/my-project/notificationChannels/12345 \
  --combiner=OR

# Alert on high response latency
gcloud monitoring policies create \
  --display-name="High Latency Alert" \
  --condition-display-name="P95 latency above 2s" \
  --condition-filter='resource.type="cloud_run_revision" AND metric.type="run.googleapis.com/request_latencies"' \
  --condition-threshold-value=2000 \
  --condition-threshold-comparison=COMPARISON_GT

# Alert on custom metric
gcloud monitoring policies create \
  --display-name="Order Processing Slow" \
  --condition-display-name="Order processing time above 5s" \
  --condition-filter='metric.type="custom.googleapis.com/order_processing_time"' \
  --condition-threshold-value=5 \
  --condition-threshold-comparison=COMPARISON_GT
```

## Step 7: Create Dashboards

Build Cloud Monitoring dashboards to replace Application Insights workbooks.

```bash
# Create a dashboard using a JSON definition
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

```json
{
  "displayName": "Application Overview",
  "mosaicLayout": {
    "tiles": [
      {
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Request Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      },
      {
        "xPos": 6,
        "width": 6,
        "height": 4,
        "widget": {
          "title": "Error Rate",
          "xyChart": {
            "dataSets": [{
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "resource.type=\"cloud_run_revision\" AND metric.type=\"run.googleapis.com/request_count\" AND metric.labels.response_code_class=\"5xx\"",
                  "aggregation": {
                    "alignmentPeriod": "60s",
                    "perSeriesAligner": "ALIGN_RATE"
                  }
                }
              }
            }]
          }
        }
      }
    ]
  }
}
```

## Step 8: Validate Observability Coverage

Verify you have equivalent coverage to Application Insights.

```bash
# Check that traces are flowing to Cloud Trace
gcloud trace traces list --project=my-project --limit=10

# Check that custom metrics are being recorded
gcloud monitoring metrics list \
  --filter='metric.type=starts_with("custom.googleapis.com")'

# Check uptime check results
gcloud monitoring uptime-checks list-configs
```

## Summary

Migrating from Application Insights to Google Cloud's observability stack is about mapping a single integrated tool to multiple focused services. OpenTelemetry is the key enabler - it lets you instrument once and export to any backend, which is perfect for running both systems in parallel during the transition. Start with tracing (Cloud Trace) and logging (Cloud Logging) since those have the most immediate impact on debugging, then migrate metrics and dashboards, and finally alerts and availability monitoring. The OpenTelemetry approach also future-proofs your instrumentation if you ever need to change observability platforms again.
