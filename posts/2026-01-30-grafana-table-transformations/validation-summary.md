# Validation Summary: How to Create Grafana Table Transformations

## Status
validated

## Post Type
Technical tutorial / guide

## Technologies Covered
- Grafana transformations
- Grafana table panels
- Grafana dashboard transformation JSON/YAML representations
- Prometheus PromQL
- Mermaid diagrams

## Sources Consulted
- Grafana documentation: Transform data - https://grafana.com/docs/grafana/latest/visualizations/panels-visualizations/query-transform-data/transform-data/
- Grafana learning path: Filter data by values - https://grafana.com/docs/learning-paths/data-transformation/filter-by-value/
- Grafana source: transformation IDs and transformer option shapes - https://github.com/grafana/grafana/tree/main/packages/grafana-data/src/transformations
- Grafana source: Filter by value matcher IDs - https://github.com/grafana/grafana/tree/main/packages/grafana-data/src/transformations/matchers/valueMatchers
- Grafana source: Join by field modes - https://github.com/grafana/grafana/blob/main/packages/grafana-data/src/transformations/transformers/joinShared.ts
- Grafana source: Convert field type transformer options - https://github.com/grafana/grafana/blob/main/packages/grafana-data/src/transformations/transformers/convertFieldType.ts
- Grafana source: Sort by transformer behavior - https://github.com/grafana/grafana/blob/main/packages/grafana-data/src/transformations/transformers/sortBy.ts

## Issues Found
- The Organize fields examples used renamed display names in `indexByName`. Grafana orders fields before renaming them, so I changed those keys to the original field names.
- The Add field from calculation mode table listed `reduce`; current Grafana uses `reduceRow` for row-wise reduction and also supports cumulative and window function modes. I corrected and expanded the mode list.
- Numeric constants in binary calculation examples were unquoted numbers. Current Grafana's compatibility path for compact binary operands expects field names or fixed values as strings, so I changed constants like `100` and `1000` to strings.
- The Join by field tabular example used `mode: outer`. Current Grafana distinguishes time-series outer joins from tabular outer joins, so I changed the tabular example to `mode: outerTabular`.
- The Sort by section claimed multi-level sorting. Current Grafana stores an array but applies only the first sort field, so I corrected that explanation.
- The Convert field type snippet used an obsolete `fields` map shape. Current Grafana uses a `conversions` array with `targetField` and `destinationType`, so I updated the snippet.
- The real-world transformation chain merged all query results and then attempted to join service metadata afterward. After a merge there is no separate metadata frame left to join, so I removed the redundant join step and clarified that merge aligns the query results by common matching fields such as `service`.
- The debugging tip described using Table view for intermediate results. Grafana Table view shows the final transformed result; individual transformation input/output is available from the bug icon on the transformation row. I corrected the text.
- The filter condition and field type lists were incomplete for current Grafana. I added substring/range matchers and enum/other field types.

## Review Notes
The snippets are presented as YAML representations rather than complete dashboard JSON. They are now aligned with Grafana's current transformer IDs and option shapes where the post shows implementation-like configuration. PromQL examples are syntactically valid for conventional Prometheus metric names, assuming the referenced metrics and labels exist in the reader's environment.
