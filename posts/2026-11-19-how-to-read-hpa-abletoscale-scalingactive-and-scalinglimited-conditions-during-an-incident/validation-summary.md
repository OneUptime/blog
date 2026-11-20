# Validation Summary: Read HPA AbleToScale, ScalingActive, and ScalingLimited Conditions

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands.

## Technologies Covered
- Kubernetes HorizontalPodAutoscaler (autoscaling/v2)
- Deployment scale subresource (apps/v1)
- Resource, custom, and external metrics APIs
- Metrics Server and metrics adapters
- kubectl, shell pipelines, and jq

## Sources Consulted
- HPA status conditions walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/#appendix-horizontal-pod-autoscaler-status-conditions
- HPA algorithm, multiple metrics, resource requests, and scaling behavior: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes v1.35.0 HPA controller implementation: https://github.com/kubernetes/kubernetes/blob/v1.35.0/pkg/controller/podautoscaler/horizontal.go
- HPA API fields: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Deployment API and scale endpoint: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Resource metrics pipeline and metrics.k8s.io/v1beta1: https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-metrics-pipeline/
- kubectl get options: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- kubectl describe options: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- jq object construction, iteration, raw output, and TSV formatting: https://jqlang.org/manual/
- Author profile link: https://github.com/nawazdhandala

## Issues Found
- The placeholder instructions treated the HPA name as the Deployment name. These names need not match, and an HPA can target other scalable kinds. Clarified that the Deployment examples assume a same-named Deployment and that readers must use the kind and name in spec.scaleTargetRef.
- The missing-CPU-request statement was unconditional. Qualified it to CPU utilization targets and relevant containers; AverageValue targets use raw resource usage without requiring CPU requests. This follows the separate raw-value and utilization calculation branches in the controller.

## Review Notes
- Checked condition status transitions, early reconciliation exits, scale access failures, stabilization, overlapping selectors, partial metric failures, and replica/rate limits against the version-pinned controller. The remaining explanations are accurate.
- Confirmed that lastTransitionTime changes when condition status changes, rather than whenever a reason or message changes.
- Confirmed that a valid metric can permit scale-up despite another metric failing; partial metric failure prevents a calculated scale-down.
- Confirmed that ScalingLimited compares the normalized recommendation with the stabilized recommendation. Merely reaching maxReplicas does not necessarily set it to True.
- Verified the JSON field names, kubectl flags, raw API paths, and jq expressions. The resource metrics API's v1beta1 path remains documented; its beta version is not by itself evidence of deprecation.
- The controller link intentionally pins v1.35.0. Exact reasons and reconciliation details should be compared with the deployed Kubernetes version during an incident.
- Checked the post's external links and their intended destinations. The distinction between operator and controller credentials, and between an accepted scale update and Ready serving capacity, is correct.
- Validation is based on documentation, source inspection, shell syntax checking, and local jq fixture checks; no live Kubernetes cluster or incident was exercised.
