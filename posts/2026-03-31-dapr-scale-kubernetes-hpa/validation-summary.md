# Validation Summary: How to Scale Dapr Applications with Kubernetes HPA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, annotations, Prometheus metrics)
- Kubernetes Horizontal Pod Autoscaler (HPA) with autoscaling/v2 API
- Kubernetes Deployments with resource requests and limits
- Prometheus Adapter for custom metrics HPA
- Helm (for installing Prometheus Adapter)
- Prometheus (metrics backend)

## Sources Consulted
- Kubernetes HPA documentation: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
- Kubernetes autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/workload-resources/horizontal-pod-autoscaler-v2/
- Kubernetes Deployment spec (required fields: selector, labels): https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr sidecar injection documentation: https://docs.dapr.io/operations/hosting/kubernetes/kubernetes-overview/
- Dapr metrics documentation: https://docs.dapr.io/operations/observability/metrics/
- Prometheus Adapter Helm chart: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- Prometheus Adapter configuration documentation: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md

## Issues Found

### 1. Deployment YAML missing required `spec.selector` and `spec.template.metadata.labels`
**What was wrong:** The Deployment manifest under "Setting Resource Requests (Required for HPA)" was missing the required `spec.selector.matchLabels` and `spec.template.metadata.labels` fields. A Deployment without a selector is invalid and would be rejected by the Kubernetes API server.
**What was changed:** Added `spec.selector.matchLabels.app: order-service` and `spec.template.metadata.labels.app: order-service` to the Deployment YAML. This also makes the `kubectl get pods -l app=order-service` command in the Testing section work correctly.

### 2. Manual `daprd` container listed in Deployment spec
**What was wrong:** The Deployment YAML included a manually defined `daprd` container with a comment "Dapr injects this - set resources in Dapr config". Dapr's sidecar injector webhook automatically adds the daprd container when `dapr.io/enabled: "true"` is set. Manually listing it in the spec is misleading and could cause confusion or conflicts.
**What was changed:** Removed the manual `daprd` container entry and replaced it with a comment clarifying that the sidecar is automatically injected and its resources should be set via annotations.

### 3. Misleading Dapr Configuration CRD block for sidecar resources
**What was wrong:** The "Dapr Sidecar Resource Limits" section showed a `dapr.io/v1alpha1 Configuration` CRD with sidecar resource annotation names commented inside the `spec:` section. This incorrectly implied that sidecar resource settings are Configuration CRD fields. They are actually pod-level annotations on the Deployment. The section had two blocks — one misleading Configuration CRD and one correct annotations block — creating confusion.
**What was changed:** Replaced both blocks with a single, correct Deployment snippet showing the sidecar resource annotations in the proper location (`spec.template.metadata.annotations`), alongside the standard Dapr annotations.

### 4. Prometheus adapter config comment said "latency" but metric measures request rate
**What was wrong:** The YAML comment read "prometheus-adapter config for Dapr service invocation latency" but the actual metric (`dapr_service_invocation_req_sent_total`) is a request counter, and the adapter rule derives a requests-per-second rate from it — not a latency metric.
**What was changed:** Updated the comment to "prometheus-adapter config for Dapr service invocation request rate".

## Review Notes
- The Dapr metric name `dapr_service_invocation_req_sent_total` is used consistently across the blog but may not match the exact metric name in all Dapr versions. Readers should verify the available metric names in their Dapr installation by querying the sidecar metrics endpoint (default port 9090) or checking the Dapr metrics documentation for their specific version.
- The HPA `autoscaling/v2` API used in the post is correct and has been GA since Kubernetes 1.23.
- The Prometheus Adapter Helm chart `prometheus.url` parameter without a port is correct — the chart defaults port to 9090 via a separate `prometheus.port` value.
- The load generator test command using `wget` in a busybox container is a standard pattern. The service URL `http://order-service/` relies on Kubernetes DNS, which is correct for in-cluster communication.
