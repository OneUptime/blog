# Validation Summary: How to Normalize Dynamic URL Paths in Beyla Before They Explode Prometheus Cardinality

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Grafana Beyla
- OpenTelemetry HTTP semantic conventions
- Prometheus metrics and PromQL
- YAML configuration
- HTTP route normalization and metric cardinality

## Sources Consulted

- [Grafana Beyla routes decorator documentation](https://grafana.com/docs/beyla/latest/configure/routes-decorator/)
- [Grafana Beyla pull request changing the default unmatched policy to low-cardinality](https://github.com/grafana/beyla/pull/2624)
- [Grafana Beyla v3.33.0 default configuration source](https://github.com/grafana/beyla/blob/v3.33.0/pkg/beyla/config.go#L55-L81)
- [Grafana Beyla service-specific route matching documentation](https://grafana.com/docs/beyla/latest/configure/service-discovery/#custom-route-matching-rules)
- [Grafana Beyla metric and trace attribute selection documentation](https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/)
- [Grafana Beyla exported metrics reference](https://grafana.com/docs/beyla/latest/metrics/)
- [Grafana Beyla export configuration and span metric formats](https://grafana.com/docs/beyla/latest/configure/export-data/#span-metrics-formats)
- [Grafana Beyla metrics cardinality documentation](https://grafana.com/docs/beyla/latest/cardinality/)
- [OpenTelemetry semantic conventions for HTTP metrics](https://opentelemetry.io/docs/specs/semconv/http/http-metrics/)
- [OpenTelemetry HTTP semantic-convention migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/)
- [Prometheus query operators documentation](https://prometheus.io/docs/prometheus/latest/querying/operators/)
- [Prometheus query functions documentation](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate)

## Issues Found

- The post identified `heuristic` as Beyla's default unmatched policy. Standalone Beyla changed its default to `low-cardinality` in March 2026, and the current v3.33.0 source retains that setting. The two policy descriptions were corrected accordingly.
- The post said the heuristic learns that a segment is dynamic. The heuristic is a stateless lexical classifier; the adaptive, traffic-observing behavior belongs to low-cardinality mode. The explanation was corrected to distinguish the two mechanisms.
- The attribute-selection example used `http_path` as the Prometheus-style counterpart to the current OpenTelemetry `url.path` attribute. The current underscore form is `url_path`, so the example was corrected.
- The post attributed metric and label differences to legacy and OpenTelemetry metric modes. That format choice applies specifically to optional span metrics, not the HTTP application metric used in the examples. The caveat now accurately refers to semantic-convention versions and OpenTelemetry versus Prometheus export formats.
- The description and conclusion characterized low-cardinality matching as globally bounded. `max_path_segment_cardinality` controls unique children per trie node or path segment, not total route series globally. The wording was corrected to describe per-segment cardinality control.

## Review Notes

- Grafana's current routes decorator page still lists `heuristic` as the default, but the merged upstream change and the Beyla v3.33.0 implementation set standalone Beyla's default to `low-cardinality`.
- Both PromQL examples are valid for Beyla's default explicit-bucket Prometheus histogram. Deployments configured for native or exponential histograms may need a histogram-specific query adjustment.
- The current `url.path` metric attribute is hidden by default; the explicit exclusion remains useful when a broader attribute selection would otherwise enable it.
