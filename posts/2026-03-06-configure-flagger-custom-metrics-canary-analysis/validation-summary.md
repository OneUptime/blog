# Validation Summary: How to Configure Flagger with Custom Metrics for Canary Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flux
- Kubernetes
- Prometheus
- PromQL
- kubectl
- Flagger loadtester

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger Webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger How it Works documentation: https://docs.flagger.app/usage/how-it-works
- Flagger Prometheus Operator tutorial: https://docs.flagger.app/main/tutorials/prometheus-operator
- Prometheus histogram and histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.2/querying/api/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The example metric exposition was marked as JSON, but Prometheus text exposition is not JSON. Changed the code fence to `text`.
- The sample metrics did not include the `app` and `namespace` labels used by the later PromQL selectors, so the example queries would not match the shown series. Added those labels to the sample metric lines.
- The timeout error-rate query used `http_requests_total`, but the sample metrics did not show that counter. Added a matching request counter example.
- The canary-to-primary comparison query selected `app="{{ target }}-canary"`, while Flagger's generated canary service selects the target workload and the primary service selects `app=<name>-primary`. Changed the canary selector to `app="{{ target }}"`.
- The CPU saturation query selected only by namespace and container, which could include both canary and primary pods when the container name is unchanged. Added a pod-name selector for the canary deployment pods.
- The commands use `jq`, but `jq` was not listed as a prerequisite. Added it to the prerequisites list.

## Review Notes
- The Prometheus scrape annotations are valid for Prometheus setups configured to honor Kubernetes pod annotations, but Prometheus Operator users commonly use `ServiceMonitor` resources instead.
- The custom metric examples assume the scrape configuration preserves or adds `app` and `namespace` labels on the resulting time series.
