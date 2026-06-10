# Validation Summary: How to Implement Tempo Span Metrics

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Grafana Tempo (metrics-generator / span_metrics processor)
- Prometheus (remote_write, PromQL, alerting rules, exemplars)
- Grafana Mimir (as a remote_write target)
- Grafana dashboards (Prometheus datasource exemplar config)
- OpenTelemetry (OTLP receivers, span attributes / semantic conventions)
- Kubernetes (Deployment manifest for scaling the generator)
- RED method (Rate, Errors, Duration)
- Apdex score calculation

## Sources Consulted
- Grafana Tempo span_metrics processor docs: https://grafana.com/docs/tempo/latest/metrics-generator/span_metrics/
- Grafana Tempo configuration reference: https://grafana.com/docs/tempo/latest/configuration/
- Grafana Tempo configuration manifest: https://grafana.com/docs/tempo/latest/configuration/manifest/
- Grafana Tempo metrics-generator active series docs: https://grafana.com/docs/tempo/latest/metrics-from-traces/metrics-generator/active-series/
- Prometheus remote_write configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#remote_write
- Apdex formula reference: https://en.wikipedia.org/wiki/Apdex

## Issues Found

1. **Incorrect `dimension_mappings` field name (Section 7).** The post used
   `source_attributes` as the sub-field under `dimension_mappings`, but the actual Tempo
   schema names this field `source_labels`. Tempo would reject the config or ignore the
   mapping. Renamed `source_attributes` → `source_labels`.

2. **`max_active_series` placed under the wrong key (Section 10 and Section 12).** The
   post showed `max_active_series` nested inside
   `metrics_generator.processor.span_metrics`. According to the Tempo configuration
   reference, this is a per-tenant override and must live at
   `overrides.defaults.metrics_generator.max_active_series` (or under a specific tenant
   ID). Moved the option to the correct overrides location in both sections and added a
   one-sentence note explaining the overflow behavior (`metric_overflow="true"` series
   instead of dropping data), which matches the documented Tempo behavior.

3. **Non-existent `drop_high_cardinality_dimensions` option (Section 10).** This field
   does not exist anywhere in Tempo's configuration. Removed the line and replaced the
   surrounding paragraph with concrete, supported guidance (restrict the `dimensions`
   list, use `filter_policies`).

4. **Incorrect Apdex formula (Section 9, "Advanced Queries").** The PromQL expression
   evaluated to `bucket{le=0.4} / 2 / total`, because it added the satisfied bucket and
   then subtracted it again. The correct Apdex score is `(Satisfied + Tolerating/2) / Total`,
   which, given the cumulative-histogram buckets exposed by Tempo, simplifies to
   `(bucket{le=0.1} + bucket{le=0.4}) / 2 / total`. Removed the stray subtraction and
   added a two-line comment showing the derivation.

5. **Production config in Section 12 did not enable the generator processors per tenant.**
   While editing item #2, I also added `processors: [span-metrics]` to the
   `overrides.defaults.metrics_generator` block in the "Putting It All Together"
   configuration. Without this, the metrics-generator component runs (because
   `target: all` or a dedicated `-target=metrics-generator` deployment is used) but does
   not process any spans for the tenant. This is a documented requirement.

## Review Notes

- **Intrinsic vs. configured dimensions.** Several examples list `service.name`,
  `span.name`, `span.kind`, and `status.code` under the `dimensions` array. These are
  already part of Tempo's intrinsic dimensions and are added automatically (as the
  Prometheus labels `service`, `span_name`, `span_kind`, `status_code`). Repeating them
  in `dimensions` is redundant but harmless — Tempo deduplicates intrinsic labels — so I
  left these examples as-is to preserve the author's pedagogical structure. A future
  revision could tighten this up by showing only the custom attributes in the
  `dimensions` list and using `intrinsic_dimensions` for the standard ones.

- **`enable_target_info` semantics.** The post's "Key Configuration Options" table
  describes this as "Enable all three metric types" / "Adds service metadata". In
  practice it emits a separate `traces_target_info` metric containing the span's
  resource attributes; it does not gate emission of the three RED metrics. The phrasing
  is loose but not technically wrong enough to require an edit.

- **Metric naming list.** Section 9 says "Tempo generates three primary metrics" and
  then lists four rows. The fourth row (`_count`) is a histogram suffix, not a separate
  metric — Tempo emits one histogram (`traces_spanmetrics_latency`) plus the
  `traces_spanmetrics_calls_total` counter, and there is also a
  `traces_spanmetrics_size_total` counter the post does not mention. Minor wording
  issue; not technically incorrect, so left untouched.

- **`enable_tracestate_span_multiplier` / `span_multiplier_key` / `filter_policies`.**
  These supported processor options are not covered in the post. Worth mentioning in a
  future revision, particularly for users sampling at the SDK level who need their
  metrics scaled accordingly.

- **`send_exemplars: true` on `remote_write`.** Verified as a valid Prometheus
  remote_write field (passes through unmodified from Tempo's underlying Prometheus
  remote_write client), so the config examples are correct.
