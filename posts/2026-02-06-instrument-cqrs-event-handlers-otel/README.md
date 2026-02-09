# How to Instrument CQRS Event Handlers with OpenTelemetry for Separate Read and Write Path Visibility

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, CQRS, Event Handlers, Distributed Tracing

Description: Instrument CQRS read and write paths separately with OpenTelemetry to gain independent visibility into command and query performance.

CQRS (Command Query Responsibility Segregation) splits your system into two distinct paths: commands that mutate state and queries that read it. Each path has different performance characteristics and failure modes. By instrumenting them separately with OpenTelemetry, you can monitor write-side throughput independently from read-side latency.

## The CQRS Pattern

In a typical CQRS setup:
- **Write side**: Commands go through command handlers, produce domain events, and persist to an event store
- **Read side**: Events get projected into read-optimized views that query handlers use

## Instrumenting the Command (Write) Path

```python
from opentelemetry import trace, metrics

tracer = trace.get_tracer("cqrs.write")
meter = metrics.get_meter("cqrs.write")

# Metrics for the write side
command_duration = meter.create_histogram(
    name="cqrs.command.duration",
    description="Time to process a command",
    unit="ms",
)

command_counter = meter.create_counter(
    name="cqrs.command.total",
    description="Total commands processed",
    unit="1",
)

events_produced = meter.create_counter(
    name="cqrs.events.produced",
    description="Total domain events produced",
    unit="1",
)

class InstrumentedCommandBus:
    """A command bus that traces every command execution."""

    def __init__(self, handlers):
        self.handlers = handlers

    def dispatch(self, command):
        command_type = type(command).__name__

        with tracer.start_as_current_span(
            f"command.{command_type}",
            kind=trace.SpanKind.INTERNAL,
            attributes={
                "cqrs.side": "write",
                "cqrs.command.type": command_type,
                "cqrs.aggregate.id": getattr(command, "aggregate_id", ""),
            }
        ) as span:
            import time
            start = time.time()

            handler = self.handlers.get(command_type)
            if not handler:
                span.set_status(trace.Status(trace.StatusCode.ERROR, "No handler found"))
                raise ValueError(f"No handler for {command_type}")

            try:
                # Execute the command handler
                result = handler.handle(command)

                # Track events produced
                event_count = len(result.events) if hasattr(result, "events") else 0
                span.set_attribute("cqrs.events.count", event_count)
                events_produced.add(event_count, {"command.type": command_type})

                for event in getattr(result, "events", []):
                    span.add_event("domain_event_produced", {
                        "event.type": type(event).__name__,
                    })

                elapsed = (time.time() - start) * 1000
                command_duration.record(elapsed, {
                    "command.type": command_type,
                    "command.status": "success",
                })
                command_counter.add(1, {
                    "command.type": command_type,
                    "command.status": "success",
                })

                return result

            except Exception as e:
                elapsed = (time.time() - start) * 1000
                command_duration.record(elapsed, {
                    "command.type": command_type,
                    "command.status": "error",
                })
                command_counter.add(1, {
                    "command.type": command_type,
                    "command.status": "error",
                })
                span.record_exception(e)
                span.set_status(trace.Status(trace.StatusCode.ERROR))
                raise
```

## Instrumenting the Query (Read) Path

```python
query_tracer = trace.get_tracer("cqrs.read")
query_meter = metrics.get_meter("cqrs.read")

query_duration = query_meter.create_histogram(
    name="cqrs.query.duration",
    description="Time to execute a query",
    unit="ms",
)

query_counter = query_meter.create_counter(
    name="cqrs.query.total",
    description="Total queries executed",
    unit="1",
)

query_result_size = query_meter.create_histogram(
    name="cqrs.query.result_size",
    description="Number of items returned by queries",
    unit="1",
)

class InstrumentedQueryBus:
    """A query bus that traces every query execution."""

    def __init__(self, handlers):
        self.handlers = handlers

    def execute(self, query):
        query_type = type(query).__name__

        with query_tracer.start_as_current_span(
            f"query.{query_type}",
            kind=trace.SpanKind.INTERNAL,
            attributes={
                "cqrs.side": "read",
                "cqrs.query.type": query_type,
            }
        ) as span:
            import time
            start = time.time()

            handler = self.handlers.get(query_type)
            if not handler:
                span.set_status(trace.Status(trace.StatusCode.ERROR, "No handler"))
                raise ValueError(f"No handler for {query_type}")

            try:
                result = handler.handle(query)

                # Track result size for pagination and performance analysis
                if isinstance(result, list):
                    span.set_attribute("cqrs.query.result_count", len(result))
                    query_result_size.record(len(result), {"query.type": query_type})

                elapsed = (time.time() - start) * 1000
                query_duration.record(elapsed, {
                    "query.type": query_type,
                    "query.status": "success",
                })
                query_counter.add(1, {
                    "query.type": query_type,
                    "query.status": "success",
                })

                return result

            except Exception as e:
                elapsed = (time.time() - start) * 1000
                query_duration.record(elapsed, {
                    "query.type": query_type,
                    "query.status": "error",
                })
                query_counter.add(1, {
                    "query.type": query_type,
                    "query.status": "error",
                })
                span.record_exception(e)
                raise
```

## Instrumenting Event Projections

Projections bridge the write and read sides. They consume domain events and update read models:

```python
projection_tracer = trace.get_tracer("cqrs.projection")

projection_lag = meter.create_histogram(
    name="cqrs.projection.lag",
    description="Time between event creation and projection update",
    unit="ms",
)

class InstrumentedProjectionHandler:
    def __init__(self, projection_name, read_store):
        self.projection_name = projection_name
        self.read_store = read_store

    def handle_event(self, event, event_context=None):
        """Process a domain event and update the read model."""
        links = []
        if event_context:
            links.append(trace.Link(event_context))

        with projection_tracer.start_as_current_span(
            f"projection.{self.projection_name}",
            links=links,
            attributes={
                "cqrs.side": "projection",
                "cqrs.projection.name": self.projection_name,
                "cqrs.event.type": type(event).__name__,
                "cqrs.event.aggregate_id": event.aggregate_id,
            }
        ) as span:
            import time

            # Calculate projection lag
            if hasattr(event, "timestamp"):
                lag_ms = (time.time() - event.timestamp) * 1000
                projection_lag.record(lag_ms, {
                    "projection.name": self.projection_name,
                    "event.type": type(event).__name__,
                })
                span.set_attribute("cqrs.projection.lag_ms", lag_ms)

            # Update the read model
            self.apply(event)
            span.set_attribute("cqrs.projection.status", "applied")

    def apply(self, event):
        """Override in subclasses to apply specific event types."""
        raise NotImplementedError
```

## Separate Dashboards for Read and Write

With the `cqrs.side` attribute on every span and metric, you can build separate dashboards:

```promql
# Write-side command throughput
sum(rate(cqrs_command_total[5m])) by (command_type)

# Read-side query latency (P95)
histogram_quantile(0.95,
  sum(rate(cqrs_query_duration_bucket[5m])) by (le, query_type)
)

# Projection lag by projection name
histogram_quantile(0.99,
  sum(rate(cqrs_projection_lag_bucket[5m])) by (le, projection_name)
)
```

This separation gives you the ability to scale and optimize each path independently. If read latency spikes, you know to look at projection lag or query handler performance. If write throughput drops, you focus on command handlers and event store performance.
