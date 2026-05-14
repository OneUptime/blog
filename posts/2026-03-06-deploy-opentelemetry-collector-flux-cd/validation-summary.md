# Validation Summary: How to Deploy OpenTelemetry Collector with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux HelmRepository, HelmRelease, and Kustomization resources
- Kubernetes
- OpenTelemetry Operator
- OpenTelemetry Collector
- OpenTelemetry Collector Kubernetes receivers and processors
- OpenTelemetry auto-instrumentation
- Prometheus remote write
- Grafana Loki OTLP ingestion
- Grafana Tempo OTLP ingestion

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation: https://fluxcd.io/flux/cmd/
- OpenTelemetry Operator for Kubernetes documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/
- OpenTelemetry Operator automatic instrumentation documentation: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- OpenTelemetry Collector Kubernetes components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/
- OpenTelemetry Collector gateway deployment pattern documentation: https://opentelemetry.io/docs/collector/deploy/gateway/
- OpenTelemetry Collector contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases
- OpenTelemetry Collector contrib Kubernetes attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/k8sattributesprocessor
- OpenTelemetry Collector contrib Kubernetes events receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8seventsreceiver
- OpenTelemetry Collector contrib resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector contrib Prometheus remote write exporter README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/prometheusremotewriteexporter
- Grafana Loki OpenTelemetry ingestion documentation: https://grafana.com/docs/loki/latest/send-data/otel/

## Issues Found

1. **Duplicate Helm values key**: The operator HelmRelease had two `manager` keys under `values`. In YAML, the later key can overwrite the earlier one, dropping the resource limits. Merged `collectorImage` into the existing `manager` block.

2. **Missing cert-manager prerequisite**: The Helm values enable `admissionWebhooks.certManager.enabled`, but the prerequisites did not mention cert-manager. Added it as a prerequisite.

3. **Prometheus remote write receiver caveat missing**: The example exports metrics to Prometheus using `/api/v1/write`, which requires the Prometheus remote write receiver to be enabled. Updated the backend prerequisite to say this explicitly.

4. **Missing Collector RBAC**: The agent collector uses `k8sattributes`, `k8s_events`, and `resourcedetection` with the `k8snode` detector, all of which require Kubernetes API permissions. Added a minimal ClusterRole and ClusterRoleBinding for the operator-created `otel-agent-collector` service account.

5. **Outdated Collector image version**: The examples used `otel/opentelemetry-collector-contrib:0.100.0`, which is old. Updated the examples to `0.151.0`, the current Collector contrib release at review time.

6. **Agent Kubernetes metadata filter missing**: The DaemonSet collector set `K8S_NODE_NAME` but did not use it in the `k8sattributes` processor. Added `filter.node_from_env_var: K8S_NODE_NAME` so each agent watches pods on its own node.

7. **Removed Loki exporter**: The `loki` exporter has been removed from current OpenTelemetry Collector contrib distributions. Replaced it with `otlphttp/loki` and Loki's native OTLP endpoint path.

8. **Tail sampling with multiple gateway replicas**: The gateway used `replicas: 3` with `tail_sampling`. Tail sampling requires all spans for a trace to reach the same collector instance unless a trace-aware load-balancing layer is used. Changed the example to `replicas: 1`.

## Review Notes
- The Flux `HelmRepository`, `HelmRelease`, and `Kustomization` API versions used in the post are current.
- The OpenTelemetry `OpenTelemetryCollector` `v1beta1` and `Instrumentation` `v1alpha1` resources are valid for the operator.
- The collector YAML blocks parse successfully after the edits.
