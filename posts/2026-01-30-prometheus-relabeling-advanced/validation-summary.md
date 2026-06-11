# Validation Summary: How to Implement Prometheus Relabeling Advanced

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Prometheus (relabel_configs / metric_relabel_configs)
- Kubernetes service discovery (`kubernetes_sd_configs`)
- PromQL (cardinality queries)
- promtool (config validation)
- Istio / Envoy (service mesh metrics example)
- RE2 regex (Prometheus regex engine)

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus `model/relabel` package source: https://pkg.go.dev/github.com/prometheus/prometheus/model/relabel
- PR #10641 (lowercase/uppercase actions, Prometheus 2.36): https://github.com/prometheus/prometheus/pull/10641
- PromLabs "What's New in Prometheus 2.30" (intro of `__scrape_interval__`): https://promlabs.com/blog/2021/09/14/whats-new-in-prometheus-2-30/
- Grafana blog: "How relabeling in Prometheus works": https://grafana.com/blog/2022/03/21/how-relabeling-in-prometheus-works/

## Issues Found

1. **Composite Label Creation example (Section 4) — broken replacement.**
   The original snippet used `replacement: '${1}/${2}/${3}'` while relying on the default regex `(.*)`. In Prometheus, source labels are concatenated using the `separator` *before* matching, and the default regex captures the entire joined string as a single group. With only `${1}` populated, the result would have been `ns/controller/pod//` (trailing empty groups). Fixed by changing the replacement to `${1}` and adding a brief comment explaining how source-label concatenation interacts with the default regex.

2. **"Avoid Regex When Possible" section (Section 11) — technically incorrect.**
   The original claimed that "simple equality checks are faster than regex" and presented `regex: 'production'` as slower than `regex: '^production$'`. This is wrong: every Prometheus relabel match goes through the RE2 engine, and Prometheus already implicitly anchors the regex (`^...$`), so both patterns are equivalent in semantics and performance. Rewrote the subsection (renamed to "Prefer Specific Regex Patterns") to accurately describe the implicit anchoring and to redirect the performance advice toward avoiding overly broad patterns like `.*`.

## Review Notes

- The `lowercase` / `uppercase` actions are version-gated (added in Prometheus 2.36, May 2022). The post does not call this out — fine for modern deployments, but worth noting for readers on older Prometheus versions.
- `__scrape_interval__` was added in Prometheus 2.30 (Sept 2021); Use Case 1 implicitly assumes a recent Prometheus version.
- The "Drop High-Cardinality Metrics" example drops all `_bucket` metrics, which will break `histogram_quantile()`. Likewise the production example drops `+Inf`, `0.005`, `0.01`, and `0.025` buckets — `+Inf` is required for `histogram_quantile()` to work. Both are presented illustratively; not incorrect as syntax, but readers should treat as caution rather than recipe.
- The "Negative Lookahead Simulation" subheading is a slight stretch — the example is just a `drop` action with an OR'd regex, which is the idiomatic way to exclude matches in Prometheus rather than a true lookahead simulation. Behavior is correct; phrasing is loose.
- The cardinality PromQL `count by (__name__)(count by (__name__, instance)({__name__=~".+"}))` works but counts unique `(name, instance)` pairs per metric, which isn't quite the same as label-cardinality-per-metric that readers might expect. Functional, but a more direct query (e.g., `topk(10, count by (__name__)({__name__=~".+"}))`) would be clearer.
- All YAML examples are syntactically valid and use real Prometheus configuration fields. The `hashmod` signature, `labelmap` replacement pattern, kubernetes_sd meta labels, and the `__address__` port-rewrite regex in the production example are all correct.
