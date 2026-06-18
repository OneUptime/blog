# Validation Summary: How to Configure OpenTelemetry for IoT Devices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OTLP/HTTP
- MicroPython
- MQTT
- CoAP
- CBOR
- OneUptime telemetry ingestion

## Sources Consulted
- OpenTelemetry Python `SpanExporter` and `SimpleSpanProcessor` API: https://opentelemetry-python.readthedocs.io/en/latest/sdk/trace.export.html
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector exporter retry settings: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/exporterhelper/README.md
- OpenTelemetry Collector contrib receiver list: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver
- OpenTelemetry transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- MicroPython `machine.unique_id()` documentation: https://docs.micropython.org/en/latest/library/machine.html
- OneUptime OpenTelemetry ingestion documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- aiocoap usage examples and API documentation: https://aiocoap.readthedocs.io/en/latest/examples.html
- IETF RFC 7252, The Constrained Application Protocol: https://datatracker.ietf.org/doc/html/rfc7252
- OASIS MQTT specification: https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html

## Issues Found
- The custom Python span exporter did not implement the current OpenTelemetry `SpanExporter` contract. Updated it to inherit from `SpanExporter`, return `SpanExportResult.SUCCESS`, and provide `shutdown()` and `force_flush()` methods.
- The Python exporter sent custom JSON to the default OTLP traces endpoint, which is not valid OTLP JSON. Changed the example to send to a gateway bridge endpoint and clarified that custom payloads need translation before entering the Collector.
- The MicroPython example used `machine.unique_id().hex()`, which is less portable across MicroPython ports. Changed it to `ubinascii.hexlify(machine.unique_id()).decode()` and checked response status before clearing the buffer.
- The gateway Collector config used a non-existent generic `httpreceiver` and implied the transform processor could convert arbitrary custom JSON into OTLP. Removed that receiver and clarified that compact JSON, MQTT, and CoAP payloads require a bridge or custom receiver before the Collector.
- The Collector exporter used the deprecated `otlphttp` component alias. Updated examples to `otlp_http` and added OneUptime's documented `encoding: json` setting.
- The MQTT Collector example used an unsupported `mqtt` receiver. Replaced it with a valid OTLP receiver configuration for an MQTT-to-OTLP bridge.
- The power-efficient telemetry example referenced undefined helper methods. Added minimal implementations for reading, clearing, connecting, disconnecting, and sending data, and only clears local data after a successful send.
- The CoAP example used `time.time()` without importing `time`. Added the missing import.

## Review Notes
The examples remain illustrative and hardware-dependent. Battery voltage conversion, charging pins, Wi-Fi connectivity, MQTT-to-OTLP bridging, CoAP server handling, and device health helper functions still need device-specific implementations in a production deployment.
