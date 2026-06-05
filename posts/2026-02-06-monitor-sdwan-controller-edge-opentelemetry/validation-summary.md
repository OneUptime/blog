# Validation Summary: How to Monitor SD-WAN Controller and Edge Device Performance with OpenTelemetry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python tracing and metrics APIs
- OpenTelemetry Collector OTLP receiver/exporter configuration
- OpenTelemetry Collector Contrib transform processor and OTTL
- SD-WAN controller, edge device, tunnel, transport, and SLA telemetry
- BFD, GRE, and IPsec tunnel concepts

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python SDK trace implementation documentation: https://opentelemetry-python.readthedocs.io/en/stable/_modules/opentelemetry/sdk/trace.html
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL datapoint context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottldatapoint
- RFC 5880, Bidirectional Forwarding Detection: https://www.rfc-editor.org/rfc/rfc5880
- RFC 2784, Generic Routing Encapsulation: https://www.rfc-editor.org/rfc/rfc2784
- RFC 4301, Security Architecture for the Internet Protocol: https://www.rfc-editor.org/rfc/rfc4301

## Issues Found
- The Collector transform processor example compared the bandwidth metric against `attributes["threshold_bps"]`, but the edge telemetry code did not emit that attribute. I added `sdwan.transport.threshold_bps` to the transport metric attributes so the derived congestion flag has data to compare against.
- The OTTL condition used `Double()` with no argument to represent the current metric value. The documented datapoint context exposes metric values through paths such as `datapoint.value_int` and `datapoint.value_double`, so I changed the condition to compare `datapoint.value_int` with `datapoint.attributes["sdwan.transport.threshold_bps"]`.
- The transform example used an unqualified `attributes[...]` setter. I changed it to `datapoint.attributes[...]`, matching the documented datapoint context path.
- The configuration did not state that the transform processor is a Collector Contrib component. I added a short comment noting that the config requires a Collector distribution that includes the transform processor, such as OpenTelemetry Collector Contrib.

## Review Notes
The Python snippets are illustrative and still depend on application-specific objects and functions such as `send_policy_to_edge`, `edge_device.get_tunnels()`, and `edge_device.get_transports()`. The OpenTelemetry API usage itself is current: synchronous gauges, counters, histograms, span attributes, and span status calls are supported by the current Python documentation.
