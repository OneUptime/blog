# Validation Summary: How to Use the TraceZ Debug Interface to Diagnose Latency Issues

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector zPages extension
- TraceZ
- OpenTelemetry Go contrib zPages
- OpenTelemetry Python manual tracing API
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector zPages extension README: https://pkg.go.dev/go.opentelemetry.io/collector/extension/zpagesextension
- OpenTelemetry Collector zPages source README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Go contrib zPages package documentation: https://pkg.go.dev/go.opentelemetry.io/contrib/zpages
- OpenTelemetry Go contrib zPages source: https://github.com/open-telemetry/opentelemetry-go-contrib/tree/main/zpages
- OpenTelemetry Python documentation and repository: https://opentelemetry.io/docs/languages/python/ and https://github.com/open-telemetry/opentelemetry-python

## Issues Found
- The post implied Collector TraceZ displays arbitrary application spans flowing through the Collector. Current Collector zPages documentation describes TraceZ as in-process diagnostics for spans created by instrumented Collector components. Updated the introduction and Collector section to clarify this scope.
- The Python embedded TraceZ example used `opentelemetry.ext.zpages.ZPagesSpanProcessor`, which is not a current OpenTelemetry Python API. Replaced it with a Go example using the official `go.opentelemetry.io/contrib/zpages` span processor and `NewTracezHandler`.
- The post said the OpenTelemetry SDK for most languages includes zPages. Updated this to say application TraceZ is available when the language has a zPages implementation.
- The latency bucket list did not match the Collector zPages documentation. Updated it to the documented bucket scale from microseconds through one minute.
- The debugging workflow claimed TraceZ shows full span attributes and events. Current zPages TraceZ views expose span names, latency buckets, running/error samples, timing, and trace/span identifiers, but are not a full trace explorer. Updated the workflow to use TraceZ for finding slow samples and a tracing backend or correlated logs for full span attributes and events.
- The running span example said progress events would be visible in TraceZ. Updated the wording so progress events are used in the backend or logs after export/correlation.

## Review Notes
The Collector YAML structure and zPages endpoint configuration are valid for the documented extension. The remaining Python snippets are illustrative manual instrumentation examples; helper functions such as `check_cache`, `get_pool_stats`, `query_database`, and `process_item` are intentionally application-specific placeholders.
