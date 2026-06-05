# Validation Summary: How to Design an OpenTelemetry Architecture for 500+ Microservices

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Collector load-balancing exporter
- OpenTelemetry Collector tail-sampling processor
- OpenTelemetry Collector Kubernetes attributes processor
- Kubernetes DaemonSet, Deployment, Service, headless Service, and HPA
- OpenTelemetry SDK environment variables
- OpenTelemetry Operator auto-instrumentation
- Prometheus ServiceMonitor

## Sources Consulted
- OpenTelemetry Collector gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector internal telemetry docs: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporter component list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry SDK environment variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Kubernetes auto-instrumentation docs: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Collector Contrib load-balancing exporter docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/loadbalancingexporter
- OpenTelemetry Collector Contrib tail-sampling processor docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry Collector Contrib Kubernetes attributes processor docs: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/k8sattributesprocessor
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases

## Issues Found
- The Mermaid subgraph labels used unquoted labels with spaces and hyphens. Quoted the labels so the diagram parses reliably.
- The agent collector used the deprecated `loadbalancing` exporter key. Updated it to the current `load_balancing` exporter key and added `routing_key: traceID`.
- The load-balancing exporter was configured against a normal Kubernetes Service, which resolves to the Service virtual IP rather than individual gateway pod IPs. Added a headless gateway Service and pointed the DNS resolver at it.
- The agent routed traces, metrics, and logs through the same load-balancing exporter while describing trace-ID routing. Kept trace-ID load balancing for traces and used normal OTLP exporters through the regular gateway Service for metrics and logs.
- The resource processor configured both an empty `from_attribute` and `value`, and used old-style environment substitution. Removed the empty `from_attribute` and changed the value to `${env:K8S_NODE_NAME}`.
- The examples discussed logs but the collector pipelines only handled traces and metrics. Added logs pipelines and an OTLP HTTP logs exporter.
- The Kubernetes manifests used the outdated `otel/opentelemetry-collector-contrib:0.96.0` image. Updated the examples to `0.153.0`, the current Contrib release checked during review.
- The Kubernetes manifests did not mount the collector configuration, expose the relevant ports, or define Services for the gateway and ServiceMonitor. Added config mounts, ports, a regular Service, and a headless Service.
- The agent DaemonSet described a local node collector endpoint but set `hostNetwork: false`. Changed it to `hostNetwork: true`, added matching host ports, and set `dnsPolicy: ClusterFirstWithHostNet`.
- The SDK configuration pointed applications at a cluster-wide agent Service, which would not guarantee node-local routing to a DaemonSet agent. Replaced it with an injected `HOST_IP` endpoint and added `POD_IP` to resource attributes.
- The gateway Kubernetes attributes processor would not reliably associate telemetry with application pods after traffic passed through agents unless pod identity was forwarded. Added `pod_association` based on `k8s.pod.ip` and injected that resource attribute in SDK configuration.
- The OpenTelemetry Operator sentence described Python as agent-based instrumentation. Reworded it to say supported auto-instrumentation, such as Java and Python.
- The Prometheus metric names omitted the `_total` suffix that appears for Prometheus-scraped summation metrics. Updated the metric names accordingly.

## Review Notes
The guide now matches the current OpenTelemetry Collector agent-to-gateway guidance. Future production examples could add RBAC for the Kubernetes attributes processor, health probes, persistent queues for stronger outage tolerance, backend authentication headers, and explicit ConfigMap examples for the mounted collector configuration.
