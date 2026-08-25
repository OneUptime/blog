# Validation Summary: Keep VPA from Changing Limits with `RequestsOnly`

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Vertical Pod Autoscaler (VPA) `autoscaling.k8s.io/v1` API
- Container CPU and memory requests and limits
- Pod Quality of Service (QoS) classes
- In-place Pod resize
- LimitRange and ResourceQuota admission policy
- Horizontal Pod Autoscaler (HPA)
- kubectl and jq

## Sources Consulted
- VPA API reference — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- VPA quick start and update-mode semantics — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/quickstart.md
- VPA features and in-place-update requirements — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md
- VPA controlled-resources FAQ — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/faq.md#how-can-i-configure-vpa-to-manage-only-specific-resources
- VPA compatibility note for Pod-level resources — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/README.md
- VPA recommendation-capping implementation — https://github.com/kubernetes/autoscaler/blob/22115908908a2fc94a4f3c47f28f1fb754fe585a/vertical-pod-autoscaler/pkg/utils/vpa/capping.go#L113-L169
- VPA generated CRD, including the `vpa` short name — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/deploy/vpa-v1-crd-gen.yaml
- VPA known limitations with HPA resource metrics — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/known-limitations.md
- Kubernetes resource requests and limits — https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes Pod QoS classes — https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/
- Kubernetes in-place resize limitations — https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/#limitations
- Kubernetes LimitRange concepts and API — https://kubernetes.io/docs/concepts/policy/limit-range/ and https://kubernetes.io/docs/reference/kubernetes-api/core/limit-range-v1/
- Kubernetes ResourceQuota compute-resource behavior — https://kubernetes.io/docs/concepts/policy/resource-quotas/#quota-for-compute-resources
- Kubernetes Horizontal Pod Autoscaling algorithm — https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/#algorithm-details
- kubectl get reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes KYAML KEP documenting YAML scalar coercion — https://github.com/kubernetes/enhancements/blob/master/keps/sig-cli/5295-kyaml/README.md
- YAML 1.1 boolean type specification — https://yaml.org/type/bool.html
- jq manual — https://jqlang.org/manual/

## Issues Found
- The two YAML examples used bare `Off` values for the string-enum fields `updatePolicy.updateMode` and `containerPolicies[].mode`. Kubernetes-compatible YAML parsing can coerce bare `Off` to boolean `false`, which does not match the VPA CRD schema. Quoted both values as `"Off"` and updated the related inline example.
- The verification text implied that the admitted request should always equal the target shown in VPA status. With `RequestsOnly`, VPA caps a recommendation above an existing container limit to that limit and can also adjust it for applicable LimitRange minimum and maximum values. Clarified that the admitted request reflects the processed recommendation and can be lower than the status target.
- The QoS summary omitted the nonzero requirement for `Guaranteed`, described `Burstable` and `BestEffort` in terms of arbitrary resources rather than CPU and memory, and did not account for the newer Pod-level resource model. Scoped the explanation to the container-level model VPA currently supports and stated the exact CPU and memory criteria.
- The LimitRange paragraph described a default limit as being injected into a Pod. Compute-resource defaults are applied to each applicable container that omits the value. Corrected the wording to identify the container-level behavior.

## Review Notes
- All commands were checked against current kubectl behavior. The jq filter is valid, the VPA CRD defines `vpa` as a short name, and `.status.qosClass` is the correct custom-column path.
- The `app=api` selector assumes the target workload applies that label to its Pods; this is an example-specific prerequisite, not a command error.
- The LimitRange ratio example is correct: a CPU limit of `1` divided by a request of `800m` is `1.25`, which exceeds `maxLimitRequestRatio.cpu: 1`.
- The HPA discussion is correct for Resource or ContainerResource metrics with a utilization target; raw average-value targets do not divide usage by requests.
- In-place VPA mode availability depends on the installed VPA and Kubernetes versions and the required feature gates. The post appropriately says to use a supported in-place mode.
- All six links in the post's Official Documentation section resolved to the intended current official pages.
