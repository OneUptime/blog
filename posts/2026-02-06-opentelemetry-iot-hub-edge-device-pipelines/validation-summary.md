# Validation Summary: How to Set Up OpenTelemetry for IoT Hub and Edge Device Pipelines

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP gRPC exporters
- OpenTelemetry Collector and Collector Contrib components
- MQTT with Eclipse Paho Python client
- IoT edge gateway telemetry patterns
- W3C Trace Context identifiers
- Python and YAML configuration

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector exporter helper documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector file storage extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/storage/filestorage/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector groupbyattrs processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/README.md
- OpenTelemetry Collector file exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/fileexporter/README.md
- Eclipse Paho MQTT Python client documentation: https://eclipse.dev/paho/files/paho.mqtt.python/html/client.html

## Issues Found
- The gateway Python example imported and used `BatchSpanExporter`, which is not part of the current OpenTelemetry Python SDK. Changed it to `BatchSpanProcessor`, matching the official SDK examples.
- The Paho MQTT client examples relied on the default callback API version, which emits a deprecation warning in current Paho MQTT releases. Updated both clients to pass `mqtt.CallbackAPIVersion.VERSION2` explicitly.
- The gateway Collector filter processor used the older `spans.exclude.match_type/span_names` syntax. Updated it to the current OTTL-based `trace_conditions` syntax.
- The article implied that the gateway created "linked spans" from device telemetry. Clarified that the gateway creates spans parented by the remote device-originated context.
- The post tagged the guide as Azure IoT Hub even though the examples use a generic MQTT gateway and OpenTelemetry Collector pipeline. Replaced the tag with `IoT Hub Gateway`.
- The microcontroller observer example used `trace.StatusCode.ERROR` directly. Updated it to import and use `Status` and `StatusCode`, matching the current OpenTelemetry Python documentation.
- The Collector examples use Collector Contrib-only components such as `file_storage`, `file`, and `groupbyattrs`. Added brief notes that these snippets require an OpenTelemetry Collector Contrib distribution.

## Review Notes
The code examples remain illustrative and assume real MQTT brokers, TLS configuration, package installation, and device protocol parsing are supplied by the deployment. The custom MQTT payload carries valid trace and span identifiers, but it is not a standard W3C `traceparent` carrier unless the deployment maps it into that format.
