# Validation Summary: Why Did VPA Change Its Recommendation but Not Recreate the Pod? Understanding Bounds and Eviction Thresholds

## Status

validated

## Post Type

Troubleshooting Guide

## Technologies Covered

- Kubernetes
- Vertical Pod Autoscaler (VPA) 1.7.x
- VPA recommender, updater, and admission controller
- VPA update modes and CPU Startup Boost
- Kubernetes in-place Pod resize
- Pod eviction and PodDisruptionBudgets
- kubectl and JSONPath

## Sources Consulted

- Kubernetes Vertical Pod Autoscaling documentation — https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes in-place Pod resize documentation — https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/
- Kubernetes API-initiated Eviction documentation — https://kubernetes.io/docs/concepts/scheduling-eviction/api-eviction/
- Kubernetes disruptions and PodDisruptionBudget documentation — https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes kubectl JSONPath documentation — https://kubernetes.io/docs/reference/kubectl/jsonpath/
- Kubernetes kubectl get reference — https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- VPA API reference — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/api.md
- VPA feature documentation — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/features.md
- VPA installation and version-compatibility documentation — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/installation.md
- VPA component flags and defaults — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/docs/flags.md
- VPA recommendation capping processor — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/vpa/capping.go
- VPA actual-request and Pod-spec fallback helper — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/utils/resources/resourcehelpers.go
- VPA updater priority calculation — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/priority/priority_processor.go
- VPA updater age, threshold, bounds, and quick-OOM logic — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/priority/update_priority_calculator.go
- VPA scaling-direction admission logic — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/priority/scaling_direction_pod_eviction_admission.go
- VPA updater candidate routing — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/logic/updater.go
- VPA eviction and replica-group restrictions — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/restriction/pods_eviction_restriction.go and https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/pkg/updater/restriction/pods_restriction_factory.go
- VPA CPU Startup Boost AEP — https://github.com/kubernetes/autoscaler/blob/master/vertical-pod-autoscaler/enhancements/7862-cpu-startup-boost/README.md
- VPA 1.7.1 release — https://github.com/kubernetes/autoscaler/releases/tag/vertical-pod-autoscaler-1.7.1

## Issues Found

No technical issues found.

## Review Notes

- The review checked VPA 1.7.1 and upstream master commit `22115908908a2fc94a4f3c47f28f1fb754fe585a` from 2026-08-24. The post's mode names, version requirements, default flag values, API fields, YAML, commands, and linked URLs are current for that scope.
- The updater's 12-hour test is measured from `pod.status.startTime`; describing this as Pod age is accurate shorthand.
- The `0.1` threshold applies to the sum of per-resource relative differences after requests and processed targets are aggregated across considered containers. It is not a per-container 10% rule, as the post correctly explains.
- `InPlacePodVerticalScaling` is enabled by default in Kubernetes 1.33 and 1.34 and is stable from Kubernetes 1.35. The post's requirement that it be enabled remains accurate.
- With the default `--in-place-skip-disruption-budget=false`, replica minimum and tolerance checks also constrain in-place updates. Enabling that flag can skip those checks for qualifying non-disruptive in-place resizes; this does not affect the post's default-path explanation.
- The upstream deployment and Lease names shown by the diagnostic commands are defaults. The post correctly warns that component names and namespaces can vary by installation.
