# How to Instrument OPC UA Server Communication Performance with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OPC UA, Industrial Automation, Performance Monitoring, IIoT

Description: Instrument OPC UA server communication to monitor read/write latency, subscription throughput, and session health with OpenTelemetry.

OPC UA (Open Platform Communications Unified Architecture) is the backbone protocol for industrial automation. It connects PLCs, sensors, HMIs, and SCADA systems in factories, power plants, and process control environments. When OPC UA communication slows down or fails, production grinds to a halt.

This post covers how to instrument an OPC UA server with OpenTelemetry to track communication performance, session health, and subscription throughput.

## What to Monitor

OPC UA servers handle several types of operations that each need monitoring:

- **Read/Write requests**: Clients reading tag values or writing setpoints
- **Subscriptions**: Clients subscribing to data changes with monitored items
- **Browse requests**: Clients navigating the server's address space
- **Session management**: Client connections, authentication, timeouts

## Instrumenting an OPC UA Server (Python)

Using the `opcua` library (asyncua), here is how to add OpenTelemetry instrumentation:

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Tracing setup
trace_provider = TracerProvider()
trace_provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("opcua-server")

# Metrics setup
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=10000
)
metrics.set_meter_provider(MeterProvider(metric_readers=[metric_reader]))
meter = metrics.get_meter("opcua-server")

# Define performance metrics
read_latency = meter.create_histogram(
    "opcua.read.latency_ms",
    description="Latency of OPC UA read operations in milliseconds",
    unit="ms"
)
write_latency = meter.create_histogram(
    "opcua.write.latency_ms",
    description="Latency of OPC UA write operations in milliseconds",
    unit="ms"
)
active_sessions = meter.create_up_down_counter(
    "opcua.sessions.active",
    description="Number of currently active OPC UA sessions"
)
subscription_count = meter.create_up_down_counter(
    "opcua.subscriptions.active",
    description="Number of active subscriptions"
)
monitored_items_total = meter.create_up_down_counter(
    "opcua.monitored_items.total",
    description="Total number of monitored items across all subscriptions"
)
notification_rate = meter.create_counter(
    "opcua.notifications.sent",
    description="Number of data change notifications sent to clients"
)
request_errors = meter.create_counter(
    "opcua.requests.errors",
    description="Number of failed OPC UA requests"
)
```

## Wrapping Read and Write Operations

Wrap the core OPC UA operations with tracing and metrics:

```python
class InstrumentedOPCUAHandler:
    """
    Wraps OPC UA server request handlers with OpenTelemetry instrumentation.
    """
    def __init__(self, server):
        self.server = server

    def handle_read(self, node_ids, client_id):
        """Instrumented read handler."""
        with tracer.start_as_current_span("opcua.read") as span:
            start = time.monotonic()
            span.set_attribute("opcua.operation", "read")
            span.set_attribute("opcua.node_count", len(node_ids))
            span.set_attribute("opcua.client_id", client_id)

            try:
                results = self.server.read_values(node_ids)

                duration_ms = (time.monotonic() - start) * 1000
                read_latency.record(duration_ms, {"client_id": client_id})

                # Track per-node read performance for large batch reads
                span.set_attribute("opcua.read.duration_ms", duration_ms)
                span.set_attribute("opcua.read.avg_per_node_ms", duration_ms / len(node_ids))

                return results
            except Exception as e:
                request_errors.add(1, {"operation": "read", "error_type": type(e).__name__})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise

    def handle_write(self, node_id, value, client_id):
        """Instrumented write handler."""
        with tracer.start_as_current_span("opcua.write") as span:
            start = time.monotonic()
            span.set_attribute("opcua.operation", "write")
            span.set_attribute("opcua.node_id", str(node_id))
            span.set_attribute("opcua.client_id", client_id)

            try:
                result = self.server.write_value(node_id, value)

                duration_ms = (time.monotonic() - start) * 1000
                write_latency.record(duration_ms, {"client_id": client_id})
                span.set_attribute("opcua.write.duration_ms", duration_ms)

                return result
            except Exception as e:
                request_errors.add(1, {"operation": "write", "error_type": type(e).__name__})
                span.set_status(trace.StatusCode.ERROR, str(e))
                raise
```

## Monitoring Subscriptions

OPC UA subscriptions are long-lived and generate ongoing notifications. Track their health:

```python
class InstrumentedSubscriptionManager:
    """Tracks OPC UA subscription lifecycle and performance."""

    def on_subscription_created(self, subscription_id, client_id, publishing_interval_ms):
        """Called when a client creates a new subscription."""
        subscription_count.add(1, {"client_id": client_id})

        with tracer.start_as_current_span("opcua.subscription.create") as span:
            span.set_attribute("opcua.subscription_id", subscription_id)
            span.set_attribute("opcua.client_id", client_id)
            span.set_attribute("opcua.publishing_interval_ms", publishing_interval_ms)

    def on_monitored_item_added(self, subscription_id, node_id, sampling_interval_ms):
        """Called when a monitored item is added to a subscription."""
        monitored_items_total.add(1, {"subscription_id": subscription_id})

    def on_notification_sent(self, subscription_id, item_count):
        """Called each time a notification is published to a client."""
        notification_rate.add(item_count, {"subscription_id": subscription_id})

    def on_subscription_deleted(self, subscription_id, client_id):
        """Called when a subscription is removed."""
        subscription_count.add(-1, {"client_id": client_id})
```

## Session Lifecycle Tracking

```python
def on_session_created(session_id, client_address, auth_method):
    """Track session creation."""
    active_sessions.add(1, {"auth_method": auth_method})
    with tracer.start_as_current_span("opcua.session.create") as span:
        span.set_attribute("opcua.session_id", session_id)
        span.set_attribute("opcua.client_address", client_address)
        span.set_attribute("opcua.auth_method", auth_method)

def on_session_closed(session_id, reason):
    """Track session closure."""
    active_sessions.add(-1)
    with tracer.start_as_current_span("opcua.session.close") as span:
        span.set_attribute("opcua.session_id", session_id)
        span.set_attribute("opcua.close_reason", reason)
```

## Recommended Alerts

Set up alerts for these conditions:

- **Read latency P99 above 100ms**: OPC UA reads should be fast. Sustained high latency usually indicates server overload or address space issues.
- **Active sessions dropping to zero**: If all clients disconnect, something is wrong with the server or the network.
- **Error rate above 1%**: A small error rate is normal during client reconnections, but sustained errors indicate a problem.
- **Monitored items growing unbounded**: Clients that create subscriptions without cleaning them up will eventually exhaust server resources.

## Summary

OPC UA is critical infrastructure in industrial settings, and its performance directly impacts production. By wrapping read/write handlers, subscription management, and session lifecycle events with OpenTelemetry, you gain visibility into exactly how your OPC UA server is performing. The traces let you diagnose individual slow operations, while the metrics give you a fleet-wide view of server health across your entire plant.
