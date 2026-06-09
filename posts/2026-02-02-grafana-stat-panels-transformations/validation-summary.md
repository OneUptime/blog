# Validation Summary: How to Build Grafana Stat Panels with Transformations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana (Stat panels, Transformations, panel/field config JSON model)
- Prometheus (PromQL queries used as data source examples)
- Grafana transformation IDs: `reduce`, `calculateField`, `filterFieldsByName`, `organize`, `groupBy`
- Grafana field-config options (thresholds, value mappings)

## Sources Consulted
- Grafana docs — Stat panel: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/stat/
- Grafana docs — Transform data: https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/
- Grafana docs — Calculate field transformation (binary operation, reduce row): https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/#add-field-from-calculation
- Grafana docs — Reduce transformation (modes: seriesToRows / reduceFields): https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/#reduce
- Grafana docs — Filter by name / Filter by value: https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/#filter-fields-by-name and `#filter-data-by-values`
- Grafana docs — Organize fields: https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/#organize-fields-by-name
- Grafana docs — Group by: https://grafana.com/docs/grafana/latest/panels-visualizations/query-transform-data/transform-data/#group-by
- Grafana docs — Value mappings and thresholds: https://grafana.com/docs/grafana/latest/panels-visualizations/configure-value-mappings/ and `/configure-thresholds/`
- Grafana source — `CalculateFieldMode` enum (`packages/grafana-data/src/transformations/transformers/calculateField.ts`)
- Grafana source — `ReduceTransformerMode` enum (`packages/grafana-data/src/transformations/transformers/reduce.ts`)
- Prometheus docs — `rate()` and `increase()` functions: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
1. **Calculate Field mode value in chained-transformations YAML (section 10)**: The post used `mode: binaryOperation` in two transformation blocks. Grafana's serialized value for the binary-operation mode is `binary` (the TS enum key is `BinaryOperation`, but its string value is `"binary"`). Using `binaryOperation` would not match the value Grafana writes/reads in the dashboard JSON model and would prevent the configured pipeline from being applied. Changed both occurrences to `mode: binary` to match Grafana's actual serialization.

## Review Notes
- The Stat panel `options` JSON (reduceOptions, orientation, textMode, colorMode, graphMode, justifyMode) matches Grafana's current panel schema; all enum values used (`auto`, `area`, `value`) are valid.
- Transformation IDs in JSON examples are correct: `reduce`, `calculateField`, `filterFieldsByName`, `organize`, `groupBy`. The Reduce options (`reducers`, `mode: "seriesToRows"`, `includeTimeField`, `labelsToFields`) and the Group By `operation: "aggregate"` match Grafana's source.
- The Filter by Value match-type table uses common terminology (Greater, Lower, Not equal, etc.). Note that Grafana's UI label for "Not equal" has been "Different" in recent versions — both are understandable, so this was left as-is.
- Reducer names listed in section 3 (`lastNotNull`, `last`, `first`, `mean`, `max`, `min`, `sum`, `count`, `range`, `delta`) are all real Grafana reducer IDs. The description of `delta` as "Cumulative change" is slightly imprecise — Grafana documents it as the cumulative change that only counts increments — but the gist is accurate.
- Prometheus example queries (`avg(rate(node_cpu_seconds_total{mode!="idle"}[5m])) * 100`, `sum(increase(http_requests_total[5m]))`, `probe_success{job="blackbox"}`, `container_memory_usage_bytes`, `container_spec_memory_limit_bytes`) are syntactically valid PromQL using metrics that exist in their respective standard exporters (node_exporter, blackbox_exporter, cAdvisor).
- The "Outer Join" terminology in Examples 3 and 4 is the informal name for Grafana's "Join by field" transformation with `OUTER` mode; the description is accurate enough for readers to find the right transformation.
- Threshold and value-mapping JSON examples conform to Grafana's `fieldConfig.defaults.thresholds` and `mappings` schema.
