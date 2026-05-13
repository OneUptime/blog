# Validation Summary: How to Configure Flagger for Canary Deployments with TCP Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Flagger Canary custom resources
- Flagger MetricTemplate custom resources
- Kubernetes Deployments and Services
- Istio VirtualService TCP routing
- Istio standard TCP metrics
- Prometheus and PromQL
- kubectl

## Sources Consulted
- Flagger documentation: Istio Canary Deployments - https://docs.flagger.app/main/tutorials/istio-progressive-delivery
- Flagger documentation: How it works - https://docs.flagger.app/usage/how-it-works
- Flagger documentation: Metrics Analysis - https://docs.flagger.app/main/usage/metrics
- Flagger Canary and MetricTemplate CRD schema - https://github.com/fluxcd/flagger/blob/main/artifacts/flagger/crd.yaml
- Flagger Istio router implementation - https://github.com/fluxcd/flagger/blob/main/pkg/router/istio.go
- Flagger MetricTemplate rendering implementation - https://github.com/fluxcd/flagger/blob/main/pkg/apis/flagger/v1beta1/metric.go
- Istio documentation: Protocol Selection - https://istio.io/latest/docs/ops/configuration/traffic-management/protocol-selection/
- Istio documentation: Istio Standard Metrics - https://istio.io/latest/docs/reference/config/metrics/
- Istio documentation: Collecting Metrics for TCP Services - https://istio.io/latest/docs/tasks/observability/metrics/tcp-metrics/
- Kubernetes documentation: Service application protocol - https://kubernetes.io/docs/concepts/services-networking/service/#application-protocol
- Kubernetes documentation: kubectl set image - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The custom `tcp-connections-success` MetricTemplate attempted to calculate TCP success as opened connections divided by opened plus closed connections, with an unrelated `connection_security_policy!="mutual_tls"` filter. Istio's TCP opened and closed metrics are lifecycle counters, not success and failure counters, so the calculation did not measure connection success. Replaced it with a `tcp-connection-errors` metric that checks closed TCP connections with non-empty Envoy response flags and uses `thresholdRange.max: 0`.
- The generated VirtualService example included `match: port: 5000`. Flagger's Istio router only creates TCP `match` entries from explicit `spec.service.match` entries; it does not infer a port match from `spec.service.port`. Removed the generated `match` block from the example.

## Review Notes
- The post uses `appProtocol: tcp`. Flagger's current Istio router treats this case-insensitively, and Istio documents lowercase `tcp` as the protocol value for Kubernetes Service protocol selection.
- The YAML snippets were parsed successfully after the edits. Local `ruby` was unavailable, so YAML validation was performed with Python's `yaml.safe_load`.
