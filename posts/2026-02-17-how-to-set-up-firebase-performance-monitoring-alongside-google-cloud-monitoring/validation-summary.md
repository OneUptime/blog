# Validation Summary: How to Set Up Firebase Performance Monitoring Alongside Google Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Firebase Performance Monitoring
- Firebase JavaScript SDK
- Cloud Functions for Firebase
- Google Cloud Monitoring
- Google Cloud Monitoring custom metrics
- Google Cloud Monitoring dashboards
- Google Cloud CLI
- Cloud Logging

## Sources Consulted
- Firebase Performance Monitoring overview: https://firebase.google.com/docs/perf-mon
- Firebase Performance Monitoring for web setup: https://firebase.google.com/docs/perf-mon/get-started-web
- Firebase Performance Monitoring HTTP/S network traces: https://firebase.google.com/docs/perf-mon/network-traces
- Firebase custom code traces: https://firebase.google.com/docs/perf-mon/custom-code-traces
- Firebase JavaScript Performance API reference: https://firebase.google.com/docs/reference/js/performance
- Cloud Monitoring custom metrics API guide: https://cloud.google.com/monitoring/custom-metrics/creating-metrics
- Cloud Monitoring timeSeries.create API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/create
- Cloud Monitoring TimeSeries API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v3/TimeSeries
- Google Cloud metrics for Cloud Functions: https://cloud.google.com/monitoring/api/metrics_gcp_c
- Cloud Monitoring dashboards overview: https://cloud.google.com/monitoring/dashboards
- gcloud monitoring dashboards create reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- gcloud monitoring policies create reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Functions for Firebase environment configuration: https://firebase.google.com/docs/functions/config-env

## Issues Found
- The Firebase web install snippet included `@firebase/performance`, but the documented setup installs the public `firebase` package and imports Performance Monitoring from `firebase/performance`. Changed the install comment to `npm install firebase`.
- The web setup text said Firebase Performance automatically captures screen rendering times. Official docs describe screen rendering as Apple/Android data; web apps collect page loading and network request data. Updated the sentence to web-specific metrics.
- The custom trace examples stopped traces only on the success path in `measureSearch`, and the fetch tracing example did not stop the trace if `fetch` threw. Added `finally` blocks so traces stop on both success and failure.
- The checkout error attribute used `error.message`, which can be long or contain sensitive request/user details. Changed it to `error_type` with the error name.
- The Cloud Functions custom metric sample passed `process.env.GCLOUD_PROJECT` directly to the Monitoring client. Added a `GOOGLE_CLOUD_PROJECT` fallback and an explicit guard so the sample fails clearly if no project ID is available.
- The dashboard section implied Google Cloud Monitoring dashboards can directly show Firebase Performance Monitoring client metrics. Firebase Performance data is reviewed in the Firebase console, while Cloud Monitoring dashboards show Cloud Monitoring metrics. Clarified the distinction.
- The alerting command used outdated/nonexistent flags for current `gcloud monitoring policies create` usage. Replaced them with `--aggregation`, `--if`, and `--duration`.
- The alert threshold treated Cloud Functions execution time as milliseconds. The Cloud Functions `cloudfunctions.googleapis.com/function/execution_times` metric is a distribution reported in nanoseconds, so changed the 5 second threshold to `5000000000` and aligned the distribution with `ALIGN_PERCENTILE_95`.
- The trace-correlation snippet imported `uuid` without noting the dependency and used the full request URL as a custom attribute. Added the install comment and imports, and changed the attribute to a URL path to avoid query strings and overly long values.

## Review Notes
Firebase Performance Monitoring for web is still documented by Firebase as a beta JavaScript SDK. The post remains technically valid, but a future revision could explicitly mention that caveat and add Firebase Performance alert setup steps to match the summary's "alerts configured on both sides" wording.
