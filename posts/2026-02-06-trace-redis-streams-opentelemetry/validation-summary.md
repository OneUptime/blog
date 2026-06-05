# Validation Summary: How to Trace Redis Streams with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Redis Streams and consumer groups
- redis-py
- OpenTelemetry Python tracing and metrics APIs
- W3C Trace Context propagation
- OpenTelemetry messaging semantic conventions
- OpenTelemetry Collector configuration

## Sources Consulted
- OpenTelemetry Python instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python propagation docs: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Python propagation API docs: https://opentelemetry-python.readthedocs.io/en/latest/api/propagate.html
- OpenTelemetry messaging semantic conventions: https://opentelemetry.io/docs/specs/semconv/messaging/messaging-spans/
- OpenTelemetry messaging attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/messaging/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors docs: https://opentelemetry.io/docs/collector/components/processor/
- Redis Streams with redis-py docs: https://redis.io/docs/latest/develop/use-cases/streaming/redis-py/
- Redis XAUTOCLAIM command docs: https://redis.io/docs/latest/commands/xautoclaim/
- Redis XINFO GROUPS command docs: https://redis.io/docs/latest/commands/xinfo-groups/
- redis-py command reference: https://redis.readthedocs.io/en/stable/commands.html
- W3C Trace Context recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
- The producer example imported `get_global_textmap_propagator` from an outdated/non-current path. Updated it to use `opentelemetry.propagate.inject`, matching the current OpenTelemetry Python propagation API.
- Error status handling used `span.set_status(trace.StatusCode.ERROR, str(e))`, which does not match the documented OpenTelemetry Python API. Updated the examples to import `Status` and `StatusCode` and call `set_status(Status(StatusCode.ERROR, str(e)))`.
- The examples used deprecated or non-current messaging semantic attributes such as `messaging.operation`, `messaging.source.name`, `messaging.consumer.group`, and `messaging.consumer.id`. Updated them to current attributes such as `messaging.operation.name`, `messaging.operation.type`, `messaging.destination.name`, `messaging.consumer.group.name`, and `messaging.client.id`.
- The consumer group metric was named and described as lag but recorded `group["pending"]`, which is delivered-but-unacknowledged messages, not lag. Updated it to record `group["lag"]`, skip unavailable lag values, and adjusted the explanation.
- The metric example imported `Observation` but yielded `metrics.Observation`. Updated the code to yield `Observation` directly, matching the documented Python metrics examples.
- The SDK setup configured trace export but not metric export, so the observable gauge would not be exported. Added a `MeterProvider`, `PeriodicExportingMetricReader`, and OTLP metric exporter.
- The collector prose said the attributes processor tags all telemetry, but the provided configuration applies it only to the traces pipeline. Updated the wording to say trace telemetry.
- The consumer-group creation example used `id="0"`. Updated it to `id="0-0"` for consistency with Redis Streams examples and the explicit stream ID form.

## Review Notes
The Redis command usage and redis-py method signatures are otherwise consistent with the official Redis and redis-py documentation. Redis `XINFO GROUPS` lag was added in Redis 7.0 and can be unavailable in some stream states; the updated callback handles unavailable lag by skipping the observation.
