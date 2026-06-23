# Validation Summary: How to Get Grafana Instant Query Working for Prometheus

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana
- Prometheus
- PromQL
- Grafana dashboard panels
- Grafana template variables
- Grafana alerting
- Prometheus HTTP API
- Prometheus recording rules

## Sources Consulted
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Grafana Prometheus query editor: https://grafana.com/docs/grafana/latest/datasources/prometheus/query-editor/
- Grafana Prometheus template variables: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana data source management and query caching: https://grafana.com/docs/grafana/latest/administration/data-source-management/
- Grafana Enterprise configuration caching section: https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/enterprise-configuration/
- Grafana alerting queries and conditions: https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/queries-conditions/
- Grafana alerting file provisioning: https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana Query Inspector: https://grafana.com/docs/grafana/latest/visualizations/explore/explore-inspector/

## Issues Found
- The introduction and diagram described instant queries as returning "a single value." Prometheus instant queries evaluate at one timestamp but can return one sample per matching series, so the wording was corrected.
- The Grafana query editor instructions used the older "Instant: ON" wording. Current Grafana Prometheus docs describe the query Type options as Both, Range, and Instant, so the text example was updated to "Type: Instant."
- The post said `up @ start()` queries the start of day. In PromQL, `start()` and `end()` are special `@` modifier values tied to the query evaluation range; for an instant query, both resolve to the evaluation time. The example was changed to use a fixed Unix timestamp.
- The template variable example used the deprecated classic `label_values(up, instance)` syntax. It was changed to the current Prometheus variable query type fields for Label values.
- The Grafana query caching snippet used non-existent `[datasources.prometheus]` `grafana.ini` keys. It was replaced with the documented `[caching]` settings and a note that query caching is enabled per data source on the Cache tab in Grafana Enterprise or Grafana Cloud.
- The alerting section stated that Grafana alerting uses instant queries by default. This was narrowed to say alerting can use instant Prometheus queries for current-value checks. The provisioning example was also updated to include `relativeTimeRange` fields and `range: false` for the instant Prometheus query.

## Review Notes
The remaining examples are illustrative dashboard JSON and provisioning snippets rather than complete exported dashboards. They are technically consistent with the referenced Grafana and Prometheus behavior, but exact dashboard JSON can vary by Grafana version.
