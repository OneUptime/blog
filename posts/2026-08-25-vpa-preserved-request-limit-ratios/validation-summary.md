# Validation Summary: Why VPA Preserves Request-to-Limit Ratios

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA)
- Container resource requests and limits
- VPA resource policies and update modes
- LimitRange and ResourceQuota
- Pod-level resources
- In-place Pod resize
- `kubectl` and `jq`

## Sources Consulted
- [VPA example: keeping limits proportional to requests](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/examples.md#keeping-limit-proportional-to-request)
- [VPA API reference](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md)
- [VPA limits and in-place update features](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md)
- [VPA proportional limit implementation](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/vpa/limit_and_request_scaling.go)
- [VPA recommendation capping implementation](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/vpa/capping.go)
- [VPA LimitRange calculator](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/limitrange/limit_range_calculator.go)
- [VPA known limitations](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md)
- [VPA Pod-level resource incompatibility](https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/README.md#features-and-known-limitations)
- [VPA 1.7.1 release](https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.7.1)
- [Kubernetes Vertical Pod Autoscaling](https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/)
- [Kubernetes resource requests and limits](https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/)
- [Kubernetes Node Autoscaling](https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/)
- [Kubernetes LimitRanges](https://kubernetes.io/docs/concepts/policy/limit-range/)
- [Kubernetes LimitRange API](https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/)
- [Kubernetes ResourceQuotas](https://kubernetes.io/docs/concepts/policy/resource-quotas/)
- [Kubernetes in-place container resource resize](https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/)
- [Kubernetes API dry-run](https://kubernetes.io/docs/reference/using-api/api-concepts/#dry-run)
- [`kubectl events` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/)
- [Kubernetes KYAML enhancement: YAML implicit type-coercion pitfalls](https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/5295-kyaml/README.md)
- [jq manual](https://jqlang.org/manual/)

## Issues Found
- The VPA manifest used unquoted `updateMode: Off`. Kubernetes-compatible YAML handling can coerce bare `Off` to the Boolean `false`, but the VPA CRD requires the string enum `Off`. Changed it to `updateMode: "Off"`.
- The post described admission-time application immediately after an `Off`-mode manifest. For the policy shown, `Off` publishes recommendations but does not apply them to Pods. Clarified the distinction between recommendation-only mode and applying modes, and made the `RequestsOnly` behavior conditional on recommendations being applied.
- The LimitRange statement was too broad. Current upstream VPA post-processes CPU and memory recommendations against `Container`- and `Pod`-type minimum and maximum constraints, but it does not account for `maxLimitRequestRatio`. Clarified that Kubernetes admission enforces that ratio independently and can reject the resulting Pod.
- The namespace checklist named only limit quota keys even though an applied VPA recommendation changes requests. Added `requests.cpu` and `requests.memory`, and replaced the ambiguous Pod-level resource wording with the actual `.spec.resources` field.
- The event command sorted on the legacy `.lastTimestamp` field, which does not reliably represent the newest occurrence for modern event series. Replaced it with the current `kubectl events` command.
- The dry-run advice did not specify the object that must exercise Pod admission. Clarified that a representative Pod manifest containing the calculated request and limit should be server-side dry-run in the target namespace before using a canary.
- The in-place paragraph attributed node-capacity deferral to any increase, although node fit is accounted against requests. Changed this to a request increase and documented that `InPlace` is an alpha VPA 1.7+ mode requiring the VPA `InPlace` feature gate and Kubernetes in-place Pod resize support.

## Review Notes
- Review was performed against current upstream VPA 1.7.1 and Kubernetes 1.36 documentation and implementation. `InPlaceOrRecreate` is GA in VPA 1.6+, while `InPlace` remains alpha in VPA 1.7+.
- The 2:1 arithmetic, proportional-limit formula, `RequestsAndLimits` default, `RequestsOnly` semantics, `controlledResources`, request bounds, and `uncappedTarget` explanation were verified as correct.
- The `autoscaling.k8s.io/v1` manifest fields, Kubernetes resource quantities, `kubectl` commands, and `jq` filters were verified as current and syntactically valid after the corrections.
- Server-side dry-run evaluates admission and validation without persisting the Pod. A canary is still needed to exercise real quota timing, scheduling, and runtime resize behavior.
- All external links in the post resolved to the intended official documentation and their referenced anchors were present.
