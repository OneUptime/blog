# Validation Summary: How to Handle Telemetry Data Volume in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics
- Istio Sidecar resources
- Prometheus HTTP API
- Prometheus configuration, remote write, and recording rules
- Kubernetes kubectl

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task documentation: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The metric cardinality example used `source_namespace` and `destination_namespace`, which are not the current Istio standard metric label names. Updated them to `source_workload_namespace` and `destination_workload_namespace`.
- The command described as counting unique Istio time series only listed Istio metric names via `/api/v1/label/__name__/values`. Replaced it with a Prometheus instant query using `count by (__name__) ({__name__=~"istio_.*"})` so it reports active time series counts per Istio metric.
- The Istio examples used older API versions (`telemetry.istio.io/v1alpha1` and `networking.istio.io/v1beta1`). Updated them to the current stable `telemetry.istio.io/v1` and `networking.istio.io/v1` APIs shown in official documentation.
- The access-log filtering example used a low-level EnvoyFilter for a use case now supported directly by the Istio Telemetry API. Replaced it with a Telemetry `accessLogging.filter.expression` example using `response.code >= 400`.
- The Prometheus retention configuration used dotted keys under `storage.tsdb`. Updated it to the current nested `storage.tsdb.retention.time` and `storage.tsdb.retention.size` YAML structure from the Prometheus configuration reference.

## Review Notes
The recommendations are broadly accurate, but exact provider names, scrape job labels, and available telemetry fields can vary by Istio installation and Prometheus deployment. Operators should confirm these names in their own mesh before applying the examples directly.
