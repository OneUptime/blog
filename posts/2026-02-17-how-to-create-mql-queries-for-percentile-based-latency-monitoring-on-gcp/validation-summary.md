# Validation Summary: How to Create MQL Queries for Percentile-Based Latency Monitoring on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Monitoring Query Language (MQL)
- Cloud Load Balancing metrics
- Google Cloud Managed Service for Prometheus metrics
- Google Cloud CLI (`gcloud`)
- Cloud Monitoring dashboards and alerting policies

## Sources Consulted
- Google Cloud Monitoring MQL overview: https://docs.cloud.google.com/monitoring/mql
- Google Cloud Monitoring MQL examples: https://docs.cloud.google.com/monitoring/mql/examples
- Google Cloud Monitoring MQL reference: https://docs.cloud.google.com/monitoring/mql/reference
- Google Cloud MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Load Balancing metrics: https://docs.cloud.google.com/load-balancing/docs/metrics
- Google Cloud monitored resource types: https://docs.cloud.google.com/monitoring/api/resources
- Google Cloud percentiles and distribution-valued metrics: https://cloud.google.com/monitoring/api/v3/distribution-metrics
- Google Cloud user-defined metrics overview: https://cloud.google.com/monitoring/custom-metrics/
- Google Cloud Managed Service for Prometheus metric naming: https://docs.cloud.google.com/stackdriver/docs/managed-prometheus/hpa
- Google Cloud Monitoring dashboard API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- `gcloud monitoring dashboards create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The first MQL example used `percentile(val(), 95)` as a standalone pipeline operation. In MQL, `percentile()` is an aggregating expression used with operations such as `group_by`, so the query was changed to `group_by [], percentile(val(), 95)`.
- The post presented MQL as current recommended practice without caveat. Google Cloud no longer recommends MQL for new Cloud Monitoring work and no longer allows creating new MQL dashboards or alerting policies in the console, while API and CLI creation remain available. Added a concise note in the introduction.
- The multiple-percentile chart example used `union` for P50/P95/P99 series without a distinct percentile label or value column naming. Replaced it with a single `group_by` that returns named percentile value columns.
- The backend latency section called the grouping key a backend service. The official `https_lb_rule` monitored resource label is `backend_target_name`, described as a backend target service or bucket. Updated the section wording and dashboard title to "backend target."
- The total-vs-backend comparison used `union`, which would not clearly produce named total and backend values for comparison. Changed the example to name the values and use `join`.
- The regression-detection example described a 7-day average but actually compared against a 7-day time-shifted series. Updated the wording and comment to "same time last week" and used `join | div` for the two aligned series.

## Review Notes
MQL remains executable and valid through supported API paths, but PromQL or the interactive query builder should be preferred for new Cloud Monitoring dashboards and alerting policies.
