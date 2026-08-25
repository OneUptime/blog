# Validation Summary: How to Exclude Sidecars from VPA or Manage CPU and Memory Per Container

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- VPA container resource policies
- Conventional and native sidecar containers
- Horizontal Pod Autoscaler (HPA)
- Pod scheduling, resource requests, and Pod overhead
- Kubernetes Quality of Service (QoS)
- Admission webhooks, LimitRange, and ResourceQuota
- `kubectl`, JSONPath, and `jq`

## Sources Consulted
- [VPA API reference: ContainerResourcePolicy, PodResourcePolicy, recommendations, and update modes](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md)
- [VPA features: limits control and in-place update limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md)
- [VPA FAQ: controlling specific resources](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#how-can-i-configure-vpa-to-manage-only-specific-resources)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA quickstart: current update modes](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md#quick-start)
- [VPA examples: proportional request and limit scaling](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/examples.md#keeping-limit-proportional-to-request)
- [VPA container-policy matching implementation](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/vpa/api.go#L294-L308)
- [Pinned VPA recommender source for init-container handling](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/recommender/input/cluster_feeder.go#L456-L520)
- [Pinned VPA admission recommendation implementation](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/admission-controller/resource/pod/recommendation/recommendation_provider.go#L50-L151)
- [Pinned VPA in-place updater implementation](https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/updater/inplace/resource_updates.go#L50-L109)
- [VPA AEP-8905: proposed native-sidecar support](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/enhancements/8905-native-sidecar-support/README.md)
- [Kubernetes Vertical Pod Autoscaling resource policies](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/#resource-policies)
- [Kubernetes sidecar containers](https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/)
- [Kubernetes sidecar KEP: scheduling resource calculation](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/753-sidecar-containers/README.md#resources-calculation-for-scheduling-and-pod-admission)
- [Kubernetes resource management for Pods and containers](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Pod overhead](https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/)
- [Kubernetes Horizontal Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/)
- [Kubernetes Pod Quality of Service classes](https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/)
- [Kubernetes Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes admission webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes JSONPath support](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [jq manual](https://jqlang.org/manual/)
- [Kubernetes KYAML KEP: ambiguous YAML scalar coercion](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/5295-kyaml/README.md#motivation)

## Issues Found
- The VPA manifest used bare `Off` values for `updatePolicy.updateMode` and the container policy `mode`. Kubernetes-compatible YAML parsing coerces unquoted `Off` to Boolean `false`, while both VPA fields require string enum values. Quoted both values as `"Off"` and made the matching prose notation explicit.
- The native-sidecar discussion characterized regular-container recommendations as a restriction of the VPA recommendation API and referred broadly to all init-container metric samples. The API is not structurally limited that way, and the cited feeder path specifically skips real-time samples. Updated the text to state the verified current behavior: VPA records init-container names and skips their real-time samples, while its admission controller and updater operate only on regular containers in `.spec.containers`. Also replaced the conclusion's inaccurate “untracked” wording with “does not right-size.”
- The scheduling example inspected only `.spec.containers`, and the rollout checklist reduced schedulability to a sum of per-container targets. That omitted native sidecars, regular init-container peaks, and Pod overhead. Updated the explanation to use Kubernetes' effective Pod request, expanded the `jq` command to show regular containers, init containers, restart policies, and overhead, and corrected the checklist.

## Review Notes
- The current `autoscaling.k8s.io/v1` API, named and wildcard policy behavior, `mode: "Off"` recommendation omission, `controlledResources` and `controlledValues` defaults, proportional limit scaling, and all resource quantities were verified.
- Container policy `mode: Auto` remains valid and is distinct from the deprecated Pod update mode `updateMode: Auto`. The post correctly recommends explicit rollout modes and makes in-place use conditional on cluster support.
- Current upstream source at commit `22115908908a2fc94a4f3c47f28f1fb754fe585a` still ignores native sidecars for recommendation application. AEP-8905 proposes future, feature-gated support, so the post's instruction to verify the deployed VPA version remains important.
- The `kubectl`, JSONPath, and `jq` syntax was checked against current references and exercised locally where possible. The first JSONPath command intentionally inspects the first selected Pod; during a mixed rollout, operators should inspect more than one Pod if webhook mutations may differ.
- All external documentation links in the post resolved successfully and pointed to relevant upstream resources.
