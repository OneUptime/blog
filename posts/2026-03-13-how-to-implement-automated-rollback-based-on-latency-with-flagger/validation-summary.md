# Validation Summary: How to Implement Automated Rollback Based on Latency with Flagger

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes Canary resources
- Istio service mesh metrics
- Prometheus and PromQL
- Kubernetes progressive delivery and automated rollback

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger FAQ, built-in request success rate and request duration queries: https://docs.flagger.app/faq
- Flagger Istio Canary Deployments tutorial: https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger How It Works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Upgrade Guide for `thresholdRange` and Istio telemetry v2 notes: https://docs.flagger.app/main/dev/upgrade-guide
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API metrics reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Classifying Metrics Based on Request or Response task: https://istio.io/latest/docs/tasks/observability/metrics/classify-metrics/
- Istio Customizing Istio Metrics task: https://istio.io/latest/docs/tasks/observability/metrics/customize-metrics/

## Issues Found
- The Canary examples used `analysis.interval: 30s` while every metric used `interval: 1m`. Flagger's documentation notes that the metric interval should be lower than or equal to the control loop interval, so I changed the analysis interval examples to `1m`.
- The rollback explanation said Flagger rolls back after `threshold` consecutive checks. Official Flagger docs describe `threshold` as the maximum number of failed metric/webhook checks before rollback, so I changed the wording to "if the number of failed checks reaches `threshold`."
- The endpoint-specific latency query filtered on `request_url_path`, which is not one of Istio's standard metric labels. I clarified that endpoint-level filtering requires a bounded custom label and changed the example to use a custom `request_operation` label.
- The canary-vs-primary comparison queried `destination_workload="{{ target }}-canary"`. In Flagger's Istio flow, the canary workload remains the target deployment name while the generated stable workload is `{{ target }}-primary`, so I changed the canary side to `destination_workload="{{ target }}"`.

## Review Notes
The PromQL examples are syntactically valid for Istio Prometheus histograms and use the current `istio_request_duration_milliseconds_bucket` metric. The endpoint-specific example depends on users configuring an appropriate bounded custom metric label on request duration metrics before using the query.
