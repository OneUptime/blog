# Validation Summary: How to Implement Vertical Pod Autoscaler for Automatic Right-Sizing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Horizontal Pod Autoscaler (HPA)
- metrics-server / metrics.k8s.io
- kube-state-metrics custom resource state metrics
- Prometheus / PromQL
- kubectl

## Sources Consulted
- Kubernetes documentation: Vertical Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA installation guide: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- Kubernetes autoscaler VPA quickstart: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- VPA autoscaling.k8s.io/v1 API package reference: https://pkg.go.dev/k8s.io/autoscaler/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1
- Kubernetes documentation: Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes documentation: kube-state-metrics: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics repository and changelog: https://github.com/kubernetes/kube-state-metrics

## Issues Found
- The post used `updateMode: "Auto"` as the primary automatic VPA mode. Current upstream VPA documentation marks `Auto` as deprecated and recommends explicit modes. Updated automatic eviction-based examples and explanations to use `updateMode: "Recreate"` and added a short note that `Auto` is deprecated.
- The post said VPA supports only three update modes. Current VPA supports additional explicit modes, including `InPlaceOrRecreate` and `InPlace` where supported. Updated the section to describe Off, Initial, and Recreate as common explicit modes and mention the newer in-place modes.
- The post implied the admission controller recreates evicted pods. In Kubernetes, the workload controller creates the replacement pod and the VPA admission controller mutates it during admission. Updated the explanation.
- The post described VPA monitoring as continuous. Kubernetes documentation describes VPA components as periodic. Updated wording to "periodically" where appropriate.
- The post used a non-standard Prometheus metric name, `vpa_status_recommendation`. Updated the PromQL example to use a kube-state-metrics custom resource state metric form and clarified that the metric exists only if the monitoring stack exports VPA CR status.
- A `kubectl edit statefulset` command was inside a YAML code fence. Changed it to a bash code fence.
- The troubleshooting text said VPA strictly requires metrics-server. Updated it to say VPA requires a resource metrics source and that metrics-server commonly provides the metrics.k8s.io API in the default setup.

## Review Notes
The YAML manifests use current Kubernetes API versions (`apps/v1`, `autoscaling/v2`, and `autoscaling.k8s.io/v1`) and valid VPA resource policy fields. The Prometheus metric name for VPA recommendations remains exporter-configuration dependent when using kube-state-metrics custom resource state metrics, so production users should verify the exact emitted series in their monitoring stack.
