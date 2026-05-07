# Validation Summary: How to Configure Vertical Pod Autoscaling in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Horizontal Pod Autoscaler (HPA)
- Metrics Server
- Helm
- kubectl

## Sources Consulted
- Kubernetes Vertical Pod Autoscaling docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes field selectors docs: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes autoscaler VPA installation guide: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- Kubernetes autoscaler VPA quick start: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- Kubernetes autoscaler VPA known limitations: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md
- Kubernetes autoscaler VPA FAQ: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md
- Kubernetes autoscaler VPA Helm chart README: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/charts/vertical-pod-autoscaler/README.md
- VPA v1 API types: https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/apis/autoscaling.k8s.io/v1/types.go
- Rancher cluster access docs: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/new-user-guides/manage-clusters/access-clusters

## Issues Found
- The post used the deprecated `Auto` update mode as the primary automatic-update example. I changed the example and surrounding explanations to use `Recreate`, which is the explicit supported eviction-based mode in current VPA documentation.
- The heading `Recommendation-Only Mode (Initial)` was technically incorrect because the example used `updateMode: "Off"`. I corrected the heading to match the actual mode shown.
- The Helm installation example pointed to the `fairwinds-stable/vpa` chart rather than the upstream Kubernetes autoscaler chart. I replaced it with the official upstream Helm repository and command, and noted that the upstream chart README still marks the chart as under development.
- The verification command assumed the VPA components would run in a `vpa` namespace. Upstream installation docs for `./hack/vpa-up.sh` install VPA into `kube-system`, so I corrected the verification guidance accordingly.
- The warm-up guidance claimed users should wait at least 24 hours before switching modes. I replaced that with a source-aligned recommendation to observe representative workload traffic first, because the specific 24-hour requirement was not supported by the upstream docs I checked.

## Review Notes
- `mode: "Off"` inside `resourcePolicy.containerPolicies` is valid in the VPA v1 API and is the correct way to exclude a specific container such as a sidecar.
- The `EvictedByVPA` event reason used in the monitoring example matches the upstream VPA updater source.
- VPA can be used with HPA only when they do not act on the same resource metric; the post's memory-only VPA example alongside CPU-based HPA is technically valid after the update-mode correction.
- `InPlaceOrRecreate` is a newer explicit mode for clusters that support in-place pod resource updates, but I did not add new content for it because the task was to correct inaccuracies without expanding the article.
