# Validation Summary: How to Configure Health Probes for Sidecar Containers in Multi-Container Pods

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Kubernetes Pods
- Kubernetes liveness, readiness, and startup probes
- Kubernetes init containers and native sidecar containers
- Istio sidecar injection and health probe rewriting
- Prometheus Operator PrometheusRule resources
- kube-state-metrics
- Python Flask health check endpoints

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes: https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes task guide: Configure Liveness, Readiness and Startup Probes: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes documentation: Sidecar Containers: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes API reference: Pod v1 container fields and restartPolicy behavior: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes documentation: kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Istio documentation: Health Checking of Istio Services: https://istio.io/latest/docs/ops/configuration/mesh/app-health-check/
- Istio documentation: Resource Annotations: https://istio.io/latest/docs/reference/config/annotations/

## Issues Found
- The init-container example had a startup deadlock: the regular init container waited for `/config/ready`, but the regular sidecar that created the file would not start until init containers completed. Changed the init container to prepare the configuration and create `/config/ready`, while the sidecar keeps configuration updated after startup.
- The Istio example used the deprecated `sidecar.istio.io/inject` annotation. Changed it to the supported injection label on the pod template while keeping `sidecar.istio.io/rewriteAppHTTPProbers` as an annotation.
- The native sidecar section said Kubernetes 1.29 introduced native sidecars. Updated the wording to say Kubernetes 1.29 enabled the feature by default; current Kubernetes documentation lists sidecar containers as stable in v1.33.
- The native sidecar Istio proxy example exposed port `15001` as `envoy-admin` while probing port `15021`. Changed the exposed container port to `15021` and named it `status-port`, matching Istio's health/status probe port usage.
- The Prometheus `MainContainerReadyButSidecarNot` rule could produce many-to-many vector matching errors when a pod has multiple app containers or multiple sidecars. Aggregated readiness by `pod` and `namespace` before matching, and adjusted the annotation text because the resulting alert no longer carries a single sidecar container label.
- The sidecar container regex in the alerts did not match sidecar names used elsewhere in the post such as `log-shipper` and `config-sync`. Expanded the regex to include those examples.
- The post overstated readiness behavior as only "all containers pass their readiness probes." Updated the wording to account for containers without readiness probes and the overall container ready state.
- The post implied health probes orchestrate shutdown. Updated the wording to distinguish readiness-based traffic removal from lifecycle hooks and native sidecar lifecycle ordering.

## Review Notes
Local syntax verification passed for the Python code block and all YAML snippets that were parsed with PyYAML. No Kubernetes cluster or API server was available for server-side schema validation.
