# Validation Summary: How to Handle Cloud Monitoring Dashboards

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Google Cloud Monitoring dashboards
- Cloud Monitoring dashboard API JSON
- Google Cloud CLI (`gcloud monitoring dashboards`, metrics, and time-series commands)
- Terraform `google_monitoring_dashboard`
- Monitoring Query Language (MQL)
- Google Cloud Monitoring Python client library
- Custom metrics

## Sources Consulted
- Google Cloud Monitoring dashboard REST API: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud CLI `gcloud monitoring dashboards create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud custom dashboards guide: https://docs.cloud.google.com/monitoring/charts/dashboards
- Google Cloud dashboard metric visualizations: https://docs.cloud.google.com/monitoring/charts
- Google Cloud dashboard filters and variables: https://docs.cloud.google.com/monitoring/charts/filter-dashboard
- Google Cloud Load Balancing metrics for SLIs: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/lb-metrics
- Google Cloud Monitoring Query Language deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud user-defined metrics with the API: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics

## Issues Found
- The first dashboard JSON labeled a Compute Engine CPU utilization query as request latency. Changed the widget title to "CPU Utilization (p99 across instances)" to match the actual metric.
- The MQL section presented MQL as generally recommended. Updated it to note Google's current deprecation guidance and recommendation to use PromQL or the query builder for new dashboards.
- MQL examples used `2xx`/`5xx` style response-code class values and `metric.response_code_class`; Google load-balancing examples use numeric response-code-class labels such as `200` and `500`. Updated the examples to use numeric values and idiomatic `val()` aggregation.
- XyChart threshold examples used scorecard-style `color` and `direction` fields. Removed those fields from XyChart threshold snippets and kept labels/values.
- The custom metric Python example declared a `DISTRIBUTION` metric but wrote `double_value` points. Changed the descriptor to `DOUBLE` so the descriptor and point value match.
- A fenced `json` example contained a `//` comment, making it invalid JSON. Removed the inline comment.
- A best-practice heading described alignment periods as time ranges. Renamed it to "Use Consistent Alignment Periods."
- The dashboard variable guidance implied arbitrary `${project_id}`, `${region}`, and `${service_name}` placeholders. Updated the text to reference dashboard filters with `templateVariable` values and chart filter interpolation.
- The dashboard export/import command used raw `describe` output for creation. Updated the export command to remove `name` and `etag`, because `etag` should not be sent during dashboard creation.

## Review Notes
Terraform and `gcloud` were not installed in the local environment, so those examples were reviewed against official Google Cloud documentation rather than executed locally. JSON snippets were parsed locally, Python syntax was compiled locally, and markdown whitespace was checked with `git diff --check`.
