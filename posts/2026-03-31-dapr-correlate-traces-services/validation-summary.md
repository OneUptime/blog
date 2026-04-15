# Validation Summary: How to Correlate Traces Across Dapr Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (distributed application runtime)
- W3C Trace Context (traceparent header)
- Python / Flask
- Go (net/http)
- Elasticsearch / OpenSearch
- Prometheus (prometheus_client Python library)
- Jaeger (distributed tracing backend)

## Sources Consulted
- W3C Trace Context Specification: https://www.w3.org/TR/trace-context/ — confirmed traceparent header format (`version-trace_id-parent_id-trace_flags`) and that trace-id is at index 1 (0-based) / field 2 (1-based)
- Dapr observability documentation: https://docs.dapr.io/concepts/observability-concept/ — confirmed Dapr's automatic W3C Trace Context propagation behavior
- Jaeger Query API source code (`jaegertracing/jaeger`, `cmd/query/app/query_parser.go`): confirmed that `tag` (singular) uses `key:value` format while `tags` (plural) expects JSON-encoded maps
- Go language specification: confirmed unused imports cause compilation errors
- Flask documentation: confirmed `g`, `before_request`, `after_request` usage patterns
- Prometheus Python client documentation: confirmed `Histogram` and `.labels().time()` context manager usage

## Issues Found

1. **Go unused import `"context"` (compilation error):** The Go code example imported `"context"` but never used it. In Go, unused imports are compilation errors. Removed the unused import.

2. **Jaeger API parameter name (`tags` vs `tag`):** The Jaeger curl examples used `tags=orderId:ORD-1001` which mixes the plural parameter name (`tags`, which expects JSON) with the singular parameter's `key:value` format. The Jaeger HTTP API uses `tag` (singular) for `key:value` pairs and `tags` (plural) for JSON-encoded maps. Changed `tags=` to `tag=` in both curl commands.

3. **Misleading metrics section intro:** The section intro said "Add trace ID as a metric label for high-cardinality debugging" but the code correctly does NOT add trace_id as a Prometheus label (which would cause cardinality explosion). The actual approach shown is correlating by timestamp. Updated the intro text to match the code: "Track request durations with Prometheus and correlate with traces by timestamp."

4. **Unused `Counter` import in Python metrics code:** The metrics section imported `Counter` from `prometheus_client` but only used `Histogram`. Removed the unused `Counter` import.

## Review Notes
- The Elasticsearch query snippet uses the `GET /logs-*/_search` format with a request body, which is Kibana Dev Tools / Elasticsearch console syntax rather than a standard curl command. This is a common convention in Elasticsearch documentation and is acceptable for a blog post.
- The description mentions "span baggage" but the post does not cover baggage propagation. This is a minor mismatch but does not affect technical correctness of the content that is present.
- The `process_order()` function called in the metrics example is not defined. This is clearly intentional as a placeholder, consistent with the `# ... process` comment pattern used elsewhere in the post.
