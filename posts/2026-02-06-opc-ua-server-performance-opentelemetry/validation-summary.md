# Validation Summary: How to Instrument OPC UA Server Communication Performance with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python API and SDK
- OTLP gRPC exporters
- Python OPC UA (`opcua`) server/node APIs
- OPC UA reads, writes, subscriptions, monitored items, and sessions

## Sources Consulted
- OpenTelemetry Python manual instrumentation docs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API docs: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter docs: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Python OPC-UA Node API docs: https://python-opcua.readthedocs.io/en/latest/node.html
- Python OPC-UA Server API docs: https://python-opcua.readthedocs.io/en/latest/opcua.server.html
- asyncua project documentation/PyPI notes: https://pypi.org/project/asyncua/

## Issues Found
- The post described the sample as using "`opcua` library (asyncua)", but the code is synchronous and does not use `asyncua`'s async/await style. Changed the wording to "Using the synchronous `opcua` library" to match the example.
- The read/write wrapper called `self.server.read_values()` and `self.server.write_value()`, which are not the documented high-level Python OPC-UA server APIs. Updated the sample to use `server.get_node(node_id).get_value()` for reads and `server.get_node(node_id).set_value(value)` for writes.
- The read wrapper divided by `len(node_ids)` without checking for an empty list. Added a guard before recording average per-node latency.
- The error handling used `trace.StatusCode.ERROR` directly and did not record exceptions. Updated it to import `Status` and `StatusCode`, set status with `Status(StatusCode.ERROR, str(e))`, and call `span.record_exception(e)`, matching OpenTelemetry Python guidance.
- The active-session counter incremented with the `auth_method` attribute but decremented without that attribute, which would not reduce the same metric time series. Updated `on_session_closed` to accept `auth_method` and decrement with the same attribute set.
- The monitored-items UpDownCounter incremented on add but had no corresponding removal hook. Added `on_monitored_item_removed()` to decrement the counter.

## Review Notes
The examples are illustrative wrapper hooks rather than a complete drop-in integration with the internals of an OPC UA server implementation. The `client_id`, `subscription_id`, and `node_id` attributes may be high-cardinality in production telemetry pipelines; future revisions could mention cardinality controls or aggregation views.
