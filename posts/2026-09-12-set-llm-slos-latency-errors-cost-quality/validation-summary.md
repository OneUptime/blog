# Validation Summary: Set SLOs and Alerts for LLM Latency, Errors, Cost, and Quality

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Prometheus and PromQL
- Service-level indicators and objectives (SLIs/SLOs)
- Error-budget burn-rate alerting
- OpenTelemetry sampling
- LLM observability

## Sources Consulted
- [Prometheus instrumentation guidance](https://prometheus.io/docs/practices/instrumentation/)
- [Prometheus histograms and summaries](https://prometheus.io/docs/practices/histograms/)
- [Prometheus query functions](https://prometheus.io/docs/prometheus/latest/querying/functions/)
- [Google SRE Workbook: Alerting on SLOs](https://sre.google/workbook/alerting-on-slos/)
- [OpenTelemetry sampling](https://opentelemetry.io/docs/concepts/sampling/)

## Issues Found
No technical issues found.

## Review Notes
The PromQL examples are correct for the explicitly stated custom counter and classic-histogram metric shapes. The reliability query assumes that all eligible terminal outcomes share `app_llm_requests_total`, while the latency query assumes that an exact `le="5"` bucket is configured; the post states both assumptions. The guidance on initializing known label combinations, treating zero traffic separately, avoiding sampled trace data as an unbiased SLO denominator, and using multiwindow burn-rate alerts agrees with the cited authoritative guidance. No product or library versions are pinned, and no deprecated API usage was found.
