# Validation Summary: How to Implement Capacity Planning Using Google Cloud Monitoring Forecasting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring alerting policies
- Google Cloud Monitoring dashboards API
- Google Cloud CLI
- Google Cloud Monitoring Python client library
- Compute Engine metrics
- Cloud SQL capacity planning
- Cloud Run scaling and concurrency
- Pub/Sub subscription metrics
- Python and NumPy

## Sources Consulted
- Google Cloud Monitoring: Create forecasted metric-value alerting policies: https://docs.cloud.google.com/monitoring/alerts/metric-forecast
- Google Cloud Monitoring: Sample policies in JSON, including forecast policy format: https://docs.cloud.google.com/monitoring/alerts/policies-in-json
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Monitoring API reference for alert policy `ForecastOptions`: https://docs.cloud.google.com/monitoring/api/ref_v3/rpc/google.monitoring.v3
- Google Cloud Monitoring dashboards API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud Monitoring Python `MetricServiceClient` reference: https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.services.metric_service.MetricServiceClient
- Google Cloud Monitoring API `projects.timeSeries.list` reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list
- Google Cloud Monitoring API `TimeSeries` reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/TimeSeries
- Cloud Run maximum concurrent requests documentation: https://docs.cloud.google.com/run/docs/about-concurrency
- Cloud Run maximum instances documentation: https://docs.cloud.google.com/run/docs/configuring/max-instances-limits
- Cloud Run monitoring metrics documentation: https://docs.cloud.google.com/run/docs/monitoring

## Issues Found
- The original `gcloud alpha monitoring policies create` command used flags such as `--condition-threshold-value`, `--condition-threshold-comparison`, and `--condition-threshold-forecast-horizon`, which are not valid for the current `gcloud monitoring policies create` command. Replaced it with a documented alert policy JSON using `conditionThreshold.forecastOptions.forecastHorizon` and `gcloud monitoring policies create --policy-from-file`.
- The post suggested 7-day and 30-day forecast horizons for Cloud Monitoring forecast-based alerts. Official documentation limits forecast windows to 1 hour through 60 hours, so the horizon examples were corrected and longer-range planning was moved to programmatic forecasting.
- The post described projected dashboard trendlines, but the provided dashboard JSON only charts historical metric data. Updated the wording to describe current usage and historical trends.
- The Python sample used naive UTC datetimes and did not request full time-series points explicitly. Updated it to use timezone-aware UTC datetimes and `TimeSeriesView.FULL`.
- The Python sample used the last returned point as the current value without sorting. Cloud Monitoring returns points in reverse chronological order within a time series, so the sample now sorts samples chronologically before calculating current value and forecasts.
- The Cloud Run guidance compared concurrent request count directly to max instances, which conflates per-instance concurrency with the instance count limit. Updated it to track maximum concurrent requests and container instance count relative to configured concurrency and maximum instances.

## Review Notes
The Google Cloud CLI was not installed locally, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output. The edited Python blocks were parsed successfully with Python 3.12, and the embedded forecast policy JSON was validated as syntactically valid JSON.
