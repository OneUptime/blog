# Validation Summary: How to Define SLOs and SLIs in Cloud Monitoring for Service Reliability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring SLO API
- Cloud Monitoring services API
- Cloud Monitoring alerting policies
- Cloud Run metrics
- SLOs, SLIs, and error budget burn-rate alerts

## Sources Consulted
- Google Cloud Monitoring service monitoring concepts: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring
- Google Cloud Monitoring SLO API usage guide: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/using-api
- Google Cloud Monitoring `services.serviceLevelObjectives` REST reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services.serviceLevelObjectives
- Google Cloud Monitoring `services` REST reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/services
- Google Cloud Monitoring request/response SLI metric examples for Cloud Run: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Google Cloud Monitoring burn-rate alerting guide: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/alerting-on-budget-burn-rate
- Google Cloud Monitoring SLO time-series selectors: https://cloud.google.com/stackdriver/docs/solutions/slo-monitoring/api/timeseries-selectors
- Google Cloud SDK `gcloud monitoring` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring

## Issues Found
- The post used `gcloud monitoring services list`, `gcloud monitoring services create`, and `gcloud monitoring slos` commands. These are not part of the current GA `gcloud monitoring` command surface. Replaced those examples with Cloud Monitoring API `curl` calls.
- The Cloud Run examples used `basicSli` for availability and latency. Current Google documentation shows Cloud Run SLOs using request-based `goodTotalRatio` and `distributionCut` SLIs, while `basicSli` is for service types with predefined SLIs such as App Engine and Istio. Updated the examples and explanatory text.
- The request filters used `metric.labels.response_code_class`; the official Cloud Run SLI examples use the Monitoring filter label form `metric.label."response_code_class"`. Updated the affected filters.
- The window-based SLI example included both `goodBadMetricFilter` and `metricMeanInRange`, but `windowsBased` accepts only one `window_criterion` field. It also used non-BOOL and distribution metrics in fields that require BOOL or GAUGE metrics. Replaced the example with a valid `goodTotalRatioThreshold` using an embedded request-based SLI.
- The SLO status example implied that describing an SLO returns current status and error budget. Updated it to list SLO definitions through the SLO API and retrieve budget data through the `timeSeries.list` API with `select_slo_budget`.
- The burn-rate alert example combined fast and slow burn conditions with `AND`, which would not let either condition independently catch its intended case. Changed the combiner to `OR` and adjusted the slow-burn example to a 24-hour, 2x burn-rate condition that matches Google Cloud's current documented starting point.

## Review Notes
Local `gcloud` was not installed in the review environment, so CLI verification was done against the official Google Cloud SDK reference. The post is now technically aligned with the current Cloud Monitoring API documentation, but readers still need to replace placeholder project, service, SLO, channel, and time values before running the examples.
