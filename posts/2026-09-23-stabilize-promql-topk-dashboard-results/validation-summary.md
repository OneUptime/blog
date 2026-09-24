# Validation Summary: How to Keep `topk()` Results Stable Across Dashboard Time Ranges and Query Steps

## Status
validated

## Post Type
Technical guide with PromQL query examples.

## Technologies Covered
- Prometheus
- PromQL: `topk`, `sum by`, `rate`, `increase`, `and on`, and the `@` modifier
- Grafana dashboard variables, query steps, and time ranges

## Sources Consulted
- Prometheus querying basics: range evaluation, selector syntax, timestamps, and performance: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus operators: aggregation, top-k grouping, and set matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus functions: counter semantics for `rate()` and `increase()`: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus introduction to the `@` modifier and fixed-ranking example: https://prometheus.io/blog/2021/02/18/introducing-the-@-modifier/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Grafana Prometheus template variables: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana Prometheus query editor, including step-dependent time alignment: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana dashboard variables and manually configured selections: https://grafana.com/docs/grafana/latest/visualizations/dashboards/variables/add-template-variables/
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
1. **Endpoint alignment could change the cohort across resolutions.** `@ end()` fixes the endpoint within one Prometheus range request, but Grafana aligns request timestamps to the step. Added the alignment caveat and an explicit Unix timestamp remedy. Qualified fixed-window independence on an unchanged ranking endpoint and updated incident-report guidance accordingly.
2. **Top-k cardinality was stated as exactly five.** Changed the cluster-service example to “up to five” because fewer eligible candidates can exist.
3. **Cohort verification needed consistent ranking inputs and subset comparison.** Clarified use of the actual request endpoint or explicit ranking timestamp, identical ranking windows across step comparisons, and subset membership. Selected services can be absent from the entire graph when none of the evaluated display windows has sufficient samples.
4. **A fixed display window needs sufficient scrape coverage.** Qualified the five-minute display-window advice so it does not imply that this duration works regardless of scrape interval.

## Review Notes
- All five PromQL code blocks were reviewed against current official syntax and semantics. Grafana must expand `$__range` before those expressions are submitted directly to Prometheus. No code-block changes were necessary.
- The original range-query explanation and fixed-ranking intersection pattern are correct. `and on` preserves the displayed values; matching on the complete aggregated identity prevents cross-cluster inclusion. Grouping `topk` by cluster changes the selection to a per-cluster quota.
- Counter functions precede aggregation, preserving reset handling. `increase()` is an extrapolated counter increase, and applying it to a recorded per-second rate is inappropriate.
- The discussion of rolling endpoints, dashboard-duration changes, close scores, manual cohorts, and missing measurements is sound. Fixed timestamps do not prevent results changing if the underlying stored data changes.
- `$__rate_interval` depends on resolution and the configured scrape interval. Fixed smoothing is a valid deliberate choice when the fixed window contains sufficient samples.
- The referenced documentation and author URLs resolved to the intended resources. The historical modifier announcement is supplemented by current documentation; no deprecated syntax was identified.
- This was a documentation-based review. No live Prometheus/Grafana instance or metric dataset was supplied, so the queries were not executed against a running deployment. There are no terminal commands or configuration files in the post to validate.
