# Validation Summary: How to Use Vertical Pod Autoscaler in Recommendation-Only Mode for Sizing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Horizontal Pod Autoscaler (HPA)
- kubectl
- YAML manifests
- jq

## Sources Consulted
- Kubernetes documentation: Vertical Pod Autoscaling - https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes autoscaler VPA quickstart - https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes autoscaler VPA installation guide - https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- Kubernetes autoscaler VPA API reference - https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- Kubernetes autoscaler VPA known limitations - https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md
- Kubernetes autoscaler recommender defaults source - https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/recommender/config/config.go
- Kubernetes kubectl set resources reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/
- Kubernetes HorizontalPodAutoscaler v2 API reference - https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/

## Issues Found
- The post said VPA has only three update modes and described `Auto` as the normal automatic restart mode. Current VPA documentation lists additional modes (`Recreate`, `InPlaceOrRecreate`, `InPlace`) and marks `Auto` as deprecated, currently equivalent to `Recreate`. Updated the mode list.
- The installation section said the admission controller applies recommendations at pod creation without qualifying update mode behavior. Updated it to clarify that admission-time application depends on the configured update mode.
- The recommendation field descriptions overstated lower and upper bounds as hard minimum/peak semantics. Updated them to align with VPA documentation: lower bound is a minimum recommendation and upper bound is a highest reasonable recommendation.
- The percentile explanation was inaccurate: it listed `Lower Bound` as P5 and `Upper Bound` as P95-P99. The current default recommender configuration uses P90 target, P50 lower bound, and P95 upper bound before additional processing. Updated the values and clarified that VPA also considers current/historical usage, variance, peaks, and OOM events.
- The comparison script ignored the target deployment and always read the first deployment in the namespace. Added a `DEPLOYMENT_NAME` argument and quoted shell variables in the `kubectl` commands.
- The batch section claimed VPA can recommend for Jobs and CronJobs and learns for future runs. VPA targets resources through `targetRef` and pod selectors; CronJobs do not directly manage Pods the same way a Job does. Updated the wording to Jobs and limited the claim to pods created by that Job, including remaining or retried pods.

## Review Notes
`kubectl` was not installed in the local review environment, so CLI validation was performed against the official Kubernetes generated command reference instead of local `kubectl --help` output.
