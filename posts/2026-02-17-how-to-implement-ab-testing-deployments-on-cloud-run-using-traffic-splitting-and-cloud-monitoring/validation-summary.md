# Validation Summary: How to Use A/B Testing Deployments on Cloud Run Using Traffic Splitting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Cloud Run traffic splitting and revision tags
- Google Cloud CLI
- Cloud Monitoring custom metrics and dashboards
- Cloud Logging sinks
- BigQuery
- Python
- Flask

## Sources Consulted
- Cloud Run rollbacks, gradual rollouts, and traffic migration: https://docs.cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- gcloud run deploy reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- gcloud logging sinks create reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Monitoring monitored resource types: https://docs.cloud.google.com/monitoring/api/resources
- Cloud Run request-response metrics: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Cloud Monitoring dashboard API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Cloud Monitoring user-defined metrics API guide: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- Cloud Run logging guide: https://docs.cloud.google.com/run/docs/logging
- Cloud Logging BigQuery export guide: https://docs.cloud.google.com/logging/docs/export/bigquery

## Issues Found
- The custom metric example used the `cloud_run_revision` monitored resource with only `project_id`. Cloud Monitoring requires additional labels for that resource, so the sample could fail. Changed the custom metric to use the `global` monitored resource with `project_id`, matching the user-defined metrics examples.
- The metric descriptor created `custom.googleapis.com/ab_test/conversion`, but the dashboard queried `custom.googleapis.com/ab_test/checkout_completed`. Changed the descriptor to match the emitted conversion event metric.
- The BigQuery export section queried `jsonPayload` fields, but the application only wrote Cloud Monitoring metrics and did not emit structured logs. Added structured JSON logging in `track_event` so the log sink and BigQuery SQL have matching source data.
- The BigQuery query used the Cloud Run request log table, but the structured experiment events are container stdout logs. Updated the query to use `run_googleapis_com_stdout`.
- The sink command did not request partitioned BigQuery tables, while the SQL used a non-date-suffixed table name. Added `--use-partitioned-tables`.
- Dashboard widgets were labeled as conversion and error rates while showing event counts and 5xx request rate. Updated titles to reflect the actual plotted data and added cross-series reducers where grouping is used.

## Review Notes
- The Cloud Run traffic splitting commands and `gcloud run deploy` flags are current in the official CLI references. `gcloud` is not installed in this workspace, so command validation was performed against the official documentation rather than local `--help` output.
- Cloud Run percentage traffic splitting is request-based. Experiments that require stable per-user assignment should add application-level assignment or Cloud Run session affinity and account for its behavior.
