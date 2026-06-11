# Validation Summary: How to Create Grafana Canvas Panels

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Canvas panels
- Grafana dashboards, thresholds, value mappings, data links, and actions
- Prometheus and PromQL
- OneUptime observability metrics examples

## Sources Consulted
- Grafana Canvas visualization documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/canvas/
- Grafana thresholds documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-thresholds/
- Grafana value mappings documentation: https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/configure-value-mappings/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The post described adding Canvas elements from a top toolbar. Current Grafana documentation describes adding elements through the Canvas layer options with **Add item**, so I updated the wording.
- The CPU usage PromQL averaged non-idle CPU modes directly, which can produce misleading percentages. I changed it to the standard idle-subtraction pattern: `100 * (1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))`.
- Several YAML snippets implied Grafana Canvas has a standalone YAML configuration format for element bindings, metric values, conditional visibility, and transitions. I replaced these with JSON-style Grafana panel configuration examples or UI-oriented guidance.
- The API latency histogram query used `histogram_quantile()` without aggregating classic histogram buckets by `le`. I changed it to aggregate with `sum by (le, instance)`.
- The Redis cache hit rate used raw counter values. I changed it to use `rate()` over a five-minute window and multiply by 100 for a dashboard percentage.
- The Canvas connection instructions referred to a line element. Current Grafana Canvas documentation describes connections created by enabling inline editing and dragging between connection anchors, so I corrected that workflow.
- The Canvas JSON example used non-current property names such as `backgroundColor`, a string `path`, and string connection endpoints. I updated the example to use Grafana's exported Canvas-style structure with `background`, `config.path`, `constraint`, and object-based connection fields.
- The post claimed Canvas supports per-element conditional visibility and CSS-like transition settings. I replaced that with supported approaches: thresholds, value mappings, data links/actions, and server bulb blink rates.
- The performance section gave a hard "under 50 elements" rule that is not documented as a Grafana limit. I changed it to general performance guidance and preserved the refresh-rate recommendations as practical heuristics.
- The OneUptime examples included raw response-time and incident-status queries that were less useful for dashboard panels. I changed them to aggregate response times and count active incidents.

## Review Notes
- The Canvas JSON structure is an implementation detail of exported Grafana dashboards and may change between Grafana releases. The post now presents it as a simplified example rather than a stable public API contract.
- The OneUptime metric names appear to be example metric names; users may need to adjust labels and metric names to match their own OneUptime/Prometheus setup.
