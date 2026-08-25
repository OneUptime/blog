# Validation Summary: How LimitRanges and ResourceQuotas Alter—or Reject—VPA Recommendations

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- LimitRange and the LimitRanger admission plugin
- ResourceQuota
- Kubernetes admission control and admission webhooks
- In-place Pod resize via the `/resize` subresource
- `kubectl` and `jq`
- Pod-level resources

## Sources Consulted
- [Kubernetes Limit Ranges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes Resource Quotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes admission controllers](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [Kubernetes admission webhook good practices](https://kubernetes.io/docs/concepts/cluster-administration/admission-webhooks-good-practices/)
- [Kubernetes API dry-run documentation](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [Kubernetes API-initiated eviction](https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/)
- [`kubectl events` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [`kubectl describe` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/)
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)
- [Kubernetes configuration good practices](https://kubernetes.io/blog/2025/11/25/configuration-good-practices/)
- [VPA limits control](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md#limits-control)
- [VPA resource policy API](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md#containerresourcepolicy)
- [VPA examples](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/examples.md)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA Pod-level resource incompatibility](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/README.md#features-and-known-limitations)
- [VPA 1.7.1 updater implementation](https://github.com/kubernetes/autoscaler/blob/vertical-pod-autoscaler-1.7.1/vertical-pod-autoscaler/pkg/updater/logic/updater.go)
- [Kubernetes in-place Pod resize KEP: ResourceQuota and affected admission controllers](https://github.com/kubernetes/enhancements/blob/master/keps/sig-node/1287-in-place-update-pod-resources/README.md#resource-quota)
- [LimitRanger admission implementation](https://github.com/kubernetes/kubernetes/blob/master/plugin/pkg/admission/limitranger/admission.go)
- [Pod quota evaluator implementation](https://github.com/kubernetes/kubernetes/blob/master/pkg/quota/v1/evaluator/core/pods.go)
- [Kubernetes resource resize accounting helpers](https://github.com/kubernetes/kubernetes/blob/master/staging/src/k8s.io/component-helpers/resource/helpers.go)

## Issues Found
- `LimitRange` was described as validating defaults. Corrected this to distinguish applying default requests and limits from validating minima, maxima, and limit-to-request ratios.
- The VPA manifest used unquoted `updateMode: Off`. YAML 1.1 parsing treats `Off` as a Boolean, but the VPA CRD requires a string enum. Changed it to `updateMode: "Off"`.
- The LimitRange/VPA ratio explanation implied that a proportional limit could exceed a non-conflicting LimitRange maximum during normal capping. Clarified that VPA normally adjusts the request to keep the proportional limit within the maximum, while a conflicting VPA resource policy can override that cap.
- The `/resize` discussion omitted `maxLimitRequestRatio` enforcement and combined request and limit quota accounting. Added the ratio check and documented the distinct request and limit accounting rules, including handling of an `Infeasible` resize.
- The VPA failure-handling description could imply that ordinary LimitRange or ResourceQuota failures are cached as infeasible attempts. Updated it to match VPA 1.7.1: `InPlace` logs and counts the failure without eviction and may retry it, while `InPlaceOrRecreate` adds the Pod to fallback-eviction candidates subject to normal eviction checks.
- The event command sorted on the legacy `.lastTimestamp` field, which can misorder modern event series. Replaced it with the current `kubectl events` command.
- The quota formula combined requests and limits even though ResourceQuota evaluates individual hard quota keys, and its overlap terms could be double-counted. Recast the calculation per quota key and limited additions to usage not already present in the observed total.
- The eviction timing statement implied that the old Pod is gone before replacement admission. Clarified that eviction starts deletion, while a gracefully terminating Pod can still exist and count toward quota when the replacement is admitted.

## Review Notes
- The review used the current upstream VPA 1.7.1 behavior for version-specific in-place update handling. `InPlace` remains an alpha, feature-gated mode; `InPlaceOrRecreate` supports fallback eviction.
- Server-side dry-run evaluates the admission configuration and quota snapshot without reserving quota. The recommended canary remains necessary to exercise real concurrency and scheduling behavior.
- The remaining VPA API fields, resource quantities, shell commands, field selector, `jq` filter, admission-flow explanation, and documentation links were verified as current and technically correct.
