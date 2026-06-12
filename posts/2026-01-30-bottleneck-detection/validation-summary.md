# Validation Summary: How to Implement Bottleneck Detection

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Distributed tracing
- OpenTelemetry concepts and Collector tail sampling
- TypeScript
- JavaScript promises
- Mermaid diagrams
- Observability and SRE performance analysis

## Sources Consulted
- OpenTelemetry trace concepts and span kinds: https://opentelemetry.io/docs/concepts/signals/traces/
- OpenTelemetry tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector Contrib tail sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- MDN JavaScript `Promise.all()` reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise/all
- Local TypeScript parser via the repository's installed `typescript` package

## Issues Found
- The original critical path section implied that parent-child span relationships alone identify the full dependency critical path, including sibling dependencies. OpenTelemetry traces provide parent-child relationships and links, but sibling dependency analysis usually needs explicit dependency edges or timing inference. I updated the prose and code comments to describe the implementation as a parent-child critical-path approximation and to pair it with sequential-chain detection.
- The critical path code used an unused `spanMap` and compared a descendant path's end time against the direct child's end time. I removed the unused map and changed the comparison to track the latest descendant path end time directly.
- The percentile helper calculated p99 with `Math.floor(length * 0.99)`, which can select the wrong zero-based index for nearest-rank percentile calculations. I changed it to `Math.ceil(length * 0.99) - 1`.
- The bottleneck scoring code could divide by zero for empty or zero-duration traces. I clamped the trace-duration denominator to at least 1 millisecond.
- The complete detector snippet imported OpenTelemetry API symbols that were not used. I removed the unused import so the snippet does not imply a required dependency.
- The detector constructor used a shallow merge for nested weight configuration. I changed it to merge `weights` separately so partial configuration cannot drop default weight values.

## Review Notes
The OpenTelemetry Collector tail sampling YAML uses policy names and fields that match the upstream Collector Contrib documentation. The TypeScript snippets were checked for parse-level syntax correctness. The code is intentionally illustrative; production implementations should use streaming percentile sketches such as t-digest or HDR Histogram, bounded memory, and service-specific dependency metadata where available.
