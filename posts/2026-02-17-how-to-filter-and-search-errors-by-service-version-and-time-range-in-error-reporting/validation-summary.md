# Validation Summary: How to Filter and Search Errors by Service Version and Time Range

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Google Cloud Error Reporting
- Error Reporting API v1beta1
- Google Cloud Python Error Reporting client library
- Google Cloud CLI
- Cloud Logging
- Cloud Monitoring log-based metrics

## Sources Consulted
- Google Cloud Error Reporting: View and filter error groups: https://docs.cloud.google.com/error-reporting/docs/viewing-errors
- Google Cloud Error Reporting REST API, projects.groupStats.list: https://docs.cloud.google.com/error-reporting/reference/rest/v1beta1/projects.groupStats/list
- Google Cloud Error Reporting REST API, QueryTimeRange: https://docs.cloud.google.com/error-reporting/reference/rest/v1beta1/QueryTimeRange
- Google Cloud Error Reporting REST API, ServiceContext: https://docs.cloud.google.com/error-reporting/reference/rest/v1beta1/ServiceContext
- Google Cloud Python client, ErrorStatsServiceClient: https://docs.cloud.google.com/python/docs/reference/clouderrorreporting/latest/google.cloud.errorreporting_v1beta1.services.error_stats_service.ErrorStatsServiceClient
- Google Cloud Python client, ListGroupStatsRequest: https://docs.cloud.google.com/python/docs/reference/clouderrorreporting/latest/google.cloud.errorreporting_v1beta1.types.ListGroupStatsRequest
- Google Cloud Python client, ErrorGroupStats: https://docs.cloud.google.com/python/docs/reference/clouderrorreporting/latest/google.cloud.errorreporting_v1beta1.types.ErrorGroupStats
- Google Cloud CLI, error-reporting events: https://docs.cloud.google.com/sdk/gcloud/reference/beta/error-reporting/events
- Google Cloud CLI, logging read: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Cloud Logging log-based metric labels: https://docs.cloud.google.com/logging/docs/logs-based-metrics/labels
- Google Cloud CLI, logging metrics create: https://docs.cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Cloud Logging LogMetric REST resource: https://docs.cloud.google.com/logging/docs/reference/v2/rest/v2/projects.metrics#LogMetric

## Issues Found
- The console filtering description referred to a top-level "All Services" filter and a version filter next to it. Current Error Reporting docs describe filtering through the "All Resources" menu, with service and version labels available for certain resource types. Updated the wording to match the current console model.
- The post implied Cloud Run service and revision values are always automatically set as Error Reporting service/version labels. Adjusted the wording to say environment metadata can be captured automatically, but custom reports should explicitly provide the intended `serviceContext` values.
- The Python API examples passed `service_filter` and `order` directly to `list_group_stats`, but the current Python client only exposes `project_name` and `time_range` as flattened keyword parameters. Updated the examples to build `ListGroupStatsRequest` objects and made the version-comparison snippet self-contained.
- The Python API example used `PERIOD_7_DAYS`, but the current Error Reporting enum is `PERIOD_1_WEEK`. Updated the enum.
- The Python output example referenced `affected_services_count`, but the current `ErrorGroupStats` field is `num_affected_services`. Updated the field name.
- The `gcloud beta error-reporting events list` examples were invalid because the current command group only supports `delete` and `report`. Replaced those examples with supported `gcloud logging read` commands for querying underlying error log entries.
- The log-based metric example claimed service/version breakdown but created a simple counter with no labels. Updated it to use a `LogMetric` YAML config with `metricDescriptor.labels` and matching `labelExtractors`, then create the metric with `--config-from-file`.

## Review Notes
The corrected `gcloud logging read` examples search log entries, not Error Reporting error groups. The post now states that distinction explicitly. The Python code examples were syntax-checked locally with `python3 ast.parse`, but they were not executed against a Google Cloud project.
