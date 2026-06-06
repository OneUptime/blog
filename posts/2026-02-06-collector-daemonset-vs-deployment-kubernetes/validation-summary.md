# Validation Summary: How to Set Up the Collector as a DaemonSet vs. Deployment in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Operator for Kubernetes
- OpenTelemetry Collector Kubernetes distribution
- Kubernetes DaemonSet
- Kubernetes Deployment
- Kubernetes Services and DNS
- Kubernetes Downward API environment variables
- OpenTelemetry Collector receivers, processors, and exporters

## Sources Consulted
- OpenTelemetry Operator for Kubernetes: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Collector Helm chart and Kubernetes presets: https://opentelemetry.io/docs/platforms/kubernetes/helm/collector/
- OpenTelemetry Collector Kubernetes components: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry agent-to-gateway deployment pattern: https://opentelemetry.io/docs/collector/deploy/other/agent-to-gateway/
- OpenTelemetry Collector releases: https://github.com/open-telemetry/opentelemetry-collector-releases/releases
- OpenTelemetry Operator OpenTelemetryCollector CRD schema: https://github.com/open-telemetry/opentelemetry-operator/blob/main/config/crd/bases/opentelemetry.io_opentelemetrycollectors.yaml
- Kubernetes DaemonSet documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes dependent environment variables: https://kubernetes.io/docs/tasks/inject-data-application/define-interdependent-environment-variables/

## Issues Found
- The OpenTelemetry Operator examples used receivers and processors that may not be available in the Operator's default Collector image. Added `image: otel/opentelemetry-collector-k8s:0.153.0` to both Collector resources so Kubernetes-focused components such as `filelog`, `k8sattributes`, `hostmetrics`, and `tail_sampling` are available.
- The DaemonSet example told applications to send OTLP to the node IP, but the Collector was only listening in the pod network. Added `hostNetwork: true` and `dnsPolicy: ClusterFirstWithHostNet` so the node-IP endpoint matches the example.
- The host metrics example did not mount the host filesystem or set `root_path`, which is required in Kubernetes to collect node metrics rather than container-local metrics. Added a `/hostfs` hostPath volume, mount, and `hostmetrics.root_path: /hostfs`.
- The application Deployment manifest was invalid for `apps/v1` because it lacked a selector and matching pod template labels. Added `spec.selector.matchLabels` and `template.metadata.labels`.
- The application Deployment referenced `$(NODE_IP)` before defining `NODE_IP`. Reordered the environment variables so Kubernetes can expand the dependent value correctly.
- The gateway example configured tail sampling while also showing multiple autoscaled replicas behind a normal Service. Tail sampling requires all spans for a trace to reach the same Collector instance. Changed the example to one replica and updated the explanation to mention trace-ID-aware load balancing for multi-replica tail-sampling gateways.
- The resilience benefit implied agents buffer by default during gateway outages. Clarified that local buffering depends on configuring exporter queues and retries.

## Review Notes
The examples are syntactically valid YAML after the corrections. In a production manifest, RBAC, Service definitions, security context, and exporter queue/retry settings should be included explicitly or supplied by a Helm chart/operator preset.
