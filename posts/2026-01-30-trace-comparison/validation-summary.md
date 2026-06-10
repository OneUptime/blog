# Validation Summary: How to Create Trace Comparison

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry (JavaScript/TypeScript SDK)
- Distributed tracing concepts (spans, traces, baselines, regressions)
- Mermaid diagrams (Gantt charts, flowcharts, xychart-beta)
- TypeScript
- GitHub Actions (CI/CD workflow)
- curl, jq (shell tooling)
- Statistical methods (z-score / standard deviation)

## Sources Consulted
- OpenTelemetry JavaScript API reference (`Tracer.startSpan` and `SpanOptions.attributes`): https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api.Tracer.html
- Mermaid Gantt syntax documentation: https://mermaid.js.org/syntax/gantt.html (confirmed that the third parameter after start is interpreted as duration when using `dateFormat X`)
- Mermaid xychart-beta syntax: https://mermaid.js.org/syntax/xyChart.html
- GitHub Actions `deployment_status` event: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#deployment_status
- d3-time-format specifiers (`%L` for milliseconds): https://d3js.org/d3-time-format
- Internal cross-checks against arithmetic in code/Mermaid diagrams

## Issues Found
- **README.md, line 189 — Inconsistent numbers in narration of the first Gantt chart.** The text read: "The `inventory.check` span grew from 30ms to 150ms." Mermaid Gantt with `dateFormat X` interprets the third parameter as a duration (verified because entries like `order.create :baseline5, 145, 5` would have an impossible negative range otherwise — confirming duration semantics). The diagram defines `inventory.check` with `:baseline3, 30, 60` and `:current3, 30, 180`, so the actual durations are 60ms (baseline) and 180ms (current). The delta of +120ms is consistent with the xychart-beta data (`bar [0, 120, 10, 0]`), but the cited source/target values were wrong. Fixed the text to read "from 60ms to 180ms."

## Review Notes
- The Mermaid `axisFormat %L ms` directive is technically a d3 specifier that prints "milliseconds of the second" (000–999). For the example values (all under 1000), the axis still renders sensibly, but readers attempting larger time ranges should be aware that `%L` is not "milliseconds since epoch." This is a stylistic/documentation observation, not a correctness issue, so it was left as-is.
- The `trace.baseline` attribute used in the OpenTelemetry example is a custom attribute (not defined in the OTel semantic conventions). The post presents it as such, which is fine.
- The Z-score threshold of 2 ≈ 95% confidence interval is a standard rule of thumb and is described correctly.
- The `npx trace-diff` package referenced in the CI/CD example is illustrative; readers should be aware it represents the tooling pattern rather than a specific published package.
- Single-trace comparison is statistically noisy in practice; the post acknowledges this and recommends statistical baselines in section 5, which is good.
