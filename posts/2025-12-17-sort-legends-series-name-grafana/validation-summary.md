# Validation Summary: How to Sort Legends by Series Name in Grafana

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana time series panels
- Grafana legend configuration
- Grafana transformations
- Grafana field overrides
- PromQL
- Prometheus query functions and aggregation operators
- JSON dashboard panel configuration

## Sources Consulted
- Grafana documentation: Time series visualization legend and tooltip options, https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/visualizations/time-series/
- Grafana documentation: Configure a legend, https://grafana.com/docs/grafana-cloud/visualizations/panels-visualizations/configure-legend/
- Grafana documentation: Transform data and transformation functions, https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana documentation: Calculation types, https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/calculation-types/
- Grafana documentation: Configure field overrides, https://grafana.com/docs/grafana/latest/panels-visualizations/configure-overrides/
- Prometheus documentation: Query functions, https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus documentation: Operators and aggregation operators, https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The post claimed Grafana time series panels have a persistent "Sort by: Name" legend option with `sortBy` and `sortDesc` JSON fields. Grafana's documented time series legend options include visibility, mode, placement, width, limit, values, and overflow; documented legend sorting is interactive value sorting in table mode. I replaced those claims and snippets with Organize fields by name guidance and removed unsupported `sortBy` / `sortDesc` legend fields.
- The post implied value sorting can be configured persistently through `sortBy: "Last"` or `sortBy: "Max"` in legend JSON. Grafana documentation describes sorting legend table rows by clicking displayed calculation headers. I changed the examples to configure displayed calculations and describe interactive sorting.
- The Transform section implied the Sort by transform reorders series for legend sorting. Grafana documents Sort by as sorting each frame by a field. I clarified that Sort by sorts rows, while Organize fields by name is the transform relevant to series order.
- The PromQL sort section did not note that `sort()` and `sort_desc()` sort by sample value and affect instant queries, while range query results have fixed output ordering. I added that caveat and added `sort_by_label()` / `sort_by_label_desc()` examples with the required experimental-function note.
- The field override JSON placed `overrides` at the wrong level and used regex capture replacement as a display name. I corrected it to use `fieldConfig.overrides` and `${__field.labels.service}` for the display name.
- One JSON example included comments, which made it invalid JSON. I split the placement examples into valid JSON snippets.
- Some non-PromQL configuration examples were fenced as `promql`. I changed those fences to `text`.

## Review Notes
The post is now technically accurate for current Grafana documentation, but legend name sorting remains version- and data-shape-sensitive because Grafana documents interactive table sorting by calculation values rather than a dedicated time series legend "sort by name" option.
