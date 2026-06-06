# Validation Summary: How to Trace Autonomous Vehicle Sensor Data Processing Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry OTLP gRPC exporters
- Autonomous vehicle sensor processing pipelines
- Lidar, camera, radar, perception, sensor fusion, prediction, and planning telemetry

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python BatchSpanProcessor documentation: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- NVIDIA technical blog on autonomous vehicle sensor data scale: https://developer.nvidia.com/blog/training-self-driving-vehicles-challenge-scale/
- Intel autonomous driving data estimate: https://download.intel.com/newsroom/2021/archive/2016-11-15-editorials-krzanich-the-future-of-automated-driving.pdf

## Issues Found
- The `fusion_objects` metric was created with `meter.create_gauge(...)`, but the example used `fusion_objects.set(len(fused))`. Current OpenTelemetry Python synchronous gauges record measurements with `record(...)`, so this was changed to `fusion_objects.record(len(fused))`.

## Review Notes
- The code snippets are syntactically valid Python, but they are illustrative excerpts and depend on application-specific functions and objects such as `process_radar`, `lidar_detector`, `sensor_fusion`, and `is_pipeline_busy`.
- The OTLP gRPC endpoint form `http://otel-collector:4317` is valid per the OpenTelemetry exporter specification, where an `http` scheme indicates an insecure gRPC connection.
- The sensor data volume and latency figures are reasonable examples for autonomous vehicle systems, but actual rates vary widely by sensor suite, compression, logging policy, and whether raw or processed data is counted.
