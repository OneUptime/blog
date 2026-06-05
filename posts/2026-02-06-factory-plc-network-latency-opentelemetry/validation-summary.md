# Validation Summary: How to Monitor Factory Floor PLC Network Latency with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry OTLP gRPC metric exporter
- Python socket programming
- Modbus TCP
- PLC and industrial Ethernet network monitoring
- EtherCAT, EtherNet/IP, Profinet, and Modbus TCP at a high level

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- MODBUS Application Protocol Specification V1.1b3: https://modbus.org/docs/Modbus_Application_Protocol_V1_1b3.pdf
- Python socket library documentation: https://docs.python.org/3/library/socket.html
- EtherCAT Technology Group technology overview: https://www.ethercat.org/en/technology.html
- ODVA EtherNet/IP technology overview: https://www.odva.org/technology-standards/key-technologies/ethernet-ip/

## Issues Found
- The post stated that the same application-layer polling approach works for all listed PLC protocols, including EtherCAT. EtherCAT cyclic process data normally runs directly in Ethernet frames without TCP/IP or UDP/IP, so this Modbus-style polling approach does not apply to EtherCAT process-data latency. Updated the wording to limit the approach to request/response protocols that can be polled at the application layer and to recommend controller/vendor diagnostics for EtherCAT.
- The Modbus TCP example used a single `sock.recv(256)`. TCP does not guarantee that one receive call returns a complete Modbus ADU. Added a `recv_exact` helper and changed the code to read the 7-byte MBAP header, then the body length advertised by that header.
- The socket was opened manually and could remain unclosed if a timeout or other exception occurred after creation. Replaced the manual socket lifecycle with `socket.create_connection(... )` in a context manager.
- The Modbus response validation only checked for a short response and did not detect mismatched transaction IDs, invalid protocol IDs, mismatched unit IDs, Modbus exception responses, or invalid function codes. Added validation for the MBAP header, function code, exception responses, and minimum normal response length.
- The segment latency histogram was declared but never recorded, and its description said "Average latency" even though histograms record samples for later aggregation. Added a `segment_latency.record(...)` call and changed the metric description to "Latency measurements grouped by network segment."
- The post described Modbus TCP as "the most common protocol for basic PLC monitoring." That claim is too broad without a specific market or environment. Changed it to "a widely supported protocol for basic PLC monitoring."

## Review Notes
The OpenTelemetry Python metric setup uses current APIs for `MeterProvider`, `PeriodicExportingMetricReader`, synchronous histograms, counters, and gauges. The OTLP gRPC exporter endpoint format is consistent with OpenTelemetry documentation. The alert thresholds are presented as starting points rather than universal guarantees, which is appropriate for industrial networks.
