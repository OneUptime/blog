# Validation Summary: How to Implement Log Aggregation for Dapr Microservices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, service invocation)
- Fluent Bit (log collection, filtering, Loki output, Lua filter, Kubernetes filter, grep filter)
- Grafana Loki (log backend, LogQL queries)
- Kubernetes (ConfigMap, DaemonSet, container logging, annotations)
- Node.js / Express (correlation ID middleware)
- Dapr JavaScript SDK (`@dapr/dapr` — `DaprClient.invoker.invoke`)
- Lua (Fluent Bit scripting for log normalization)

## Sources Consulted
- Fluent Bit Tail Input Plugin docs — https://docs.fluentbit.io/manual/pipeline/inputs/tail (verified `Exclude_Path`, `DB`, `Parser` options)
- Fluent Bit Kubernetes Filter docs — https://docs.fluentbit.io/manual/pipeline/filters/kubernetes (verified `Kube_URL`, `Merge_Log`, `K8S-Logging.Parser`)
- Fluent Bit Grep Filter docs — https://docs.fluentbit.io/manual/pipeline/filters/grep (verified record accessor support with `Regex` directive)
- Fluent Bit Loki Output Plugin docs — https://docs.fluentbit.io/manual/pipeline/outputs/loki (verified `Labels` parameter supports record accessor syntax for dynamic labels)
- Fluent Bit Lua Filter docs — https://docs.fluentbit.io/manual/pipeline/filters/lua (verified function signature and return codes)
- Fluent Bit Monitoring docs — https://docs.fluentbit.io/manual/administration/monitoring (verified port 2020, `/api/v1/metrics` JSON endpoint)
- Dapr JS SDK source code on GitHub — https://github.com/dapr/js-sdk (verified `invoker.invoke()` method signature and `InvokerOptions` type with `headers` property)
- Dapr JS SDK client docs — https://docs.dapr.io/developing-applications/sdks/js/js-client/

## Issues Found
1. **Architecture diagram code fence language**: The text diagram used ` ```json ` but the content is not valid JSON — it is a plain text ASCII diagram. Changed to ` ```text `.

2. **Standalone Fluent Bit config snippet code fence**: The Lua filter config block used ` ```yaml ` but the content is Fluent Bit's native INI-like configuration format, not YAML. Changed to ` ```ini `.

3. **Lua filter return code**: The `normalize_level` function returned code `1`, which tells Fluent Bit that both the record AND timestamp were modified. Since the function only modifies the record (the `level` field) and passes the timestamp through unchanged, the correct return code is `2` (record modified, timestamp unchanged). Changed `return 1, timestamp, record` to `return 2, timestamp, record`.

## Review Notes
- The Fluent Bit grep filter's `Regex` directive with record accessor syntax (`$kubernetes['annotations']['dapr.io/enabled']`) is supported but the official docs only show explicit record accessor examples with the `Exclude` directive. It works in practice but readers should be aware this is less commonly documented.
- The Fluent Bit Loki output `Labels` parameter with record accessors (e.g., `namespace=$kubernetes['namespace_name']`) requires Fluent Bit v2.1+ where the built-in Loki plugin is available. Earlier versions using the external Grafana Loki plugin may have different syntax.
- The Dapr JS SDK `invoker.invoke()` 5th parameter `{ headers: { ... } }` (type `InvokerOptions`) is only effective when using the HTTP communication protocol. When using gRPC, custom headers passed this way are ignored.
- The LogQL query syntax `| correlationId = "abc-123-def-456"` is correct — in LogQL label filter expressions after a parser stage, `=` is the equality operator.
