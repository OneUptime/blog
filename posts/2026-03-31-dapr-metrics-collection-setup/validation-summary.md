# Validation Summary: How to Set Up Dapr Metrics Collection

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecars and control plane)
- Prometheus (scraping, ServiceMonitor, PromQL)
- Kubernetes (deployments, annotations, port-forwarding, services)
- Prometheus Operator (ServiceMonitor CRD)

## Sources Consulted
- Dapr Docs - Configure metrics: https://docs.dapr.io/operations/observability/metrics/metrics-overview/
- Dapr Docs - Observe metrics with Prometheus: https://docs.dapr.io/operations/observability/metrics/prometheus/
- Dapr Docs - Arguments and annotations overview: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Docs - Overview of Dapr services: https://docs.dapr.io/concepts/dapr-services/
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- Dapr metrics reference: https://github.com/dapr/dapr/blob/master/docs/development/dapr-metrics.md

## Issues Found

1. **Incorrect claim that metrics are disabled by default**: The post stated "Metrics are disabled by default in some installations, so you need to verify they are enabled." Dapr metrics are enabled by default in all standard installations (CLI, Helm, Kubernetes). Changed to state that metrics are enabled by default and the user can verify they are working.

2. **daprd listed as a control plane component**: The post listed "daprd, dapr-operator, dapr-sentry, dapr-placement" as control plane components. `daprd` is the sidecar process, not a control plane component. The actual control plane components are dapr-operator, dapr-sentry, dapr-placement, dapr-scheduler, and dapr-sidecar-injector. Updated the list to remove daprd and include the correct components.

3. **Incorrect metric name**: The post referenced `dapr_grpc_server_io_latency_bucket` but the actual metric name is `dapr_grpc_io_server_server_latency_bucket`. The word order was incorrect (`grpc_server_io` vs the correct `grpc_io_server_server`). Fixed the metric name.

## Review Notes
- The `dapr.io/metrics-port: "9090"` annotation in Step 1 is technically correct but redundant since 9090 is already the default. This is not an error — it serves as explicit documentation of the port being used and may be helpful for readers.
- The control plane scrape config in Step 4 only lists three of the five control plane components. Users may also want to scrape dapr-scheduler and dapr-sidecar-injector for complete coverage.
- The Prometheus port-forward in Step 5 uses port 9090 for Prometheus itself, which could conflict with Dapr's metrics port if running on the same machine. This is a potential source of confusion but is standard practice in tutorials.
