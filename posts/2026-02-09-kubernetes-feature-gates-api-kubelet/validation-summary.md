# Validation Summary: How to Enable and Use Kubernetes Feature Gates on API Server, kubelet,

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes feature gates
- kube-apiserver
- kubelet
- kube-controller-manager
- kubeadm configuration
- Kubernetes Job TTL cleanup
- Kubernetes resource management features

## Sources Consulted
- Kubernetes Feature Gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes Feature Gates removed reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes Enable Or Disable Feature Gates task: https://kubernetes.io/docs/tasks/administer-cluster/configure-feature-gates/
- kubeadm Configuration v1beta4 reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4
- Kubernetes TTL-after-finished controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes CPU Management Policies documentation: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Kubernetes Topology Manager documentation: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes Swap Memory Management documentation: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/

## Issues Found
- Several examples enabled feature gates that are now GA and removed or no longer needed in current Kubernetes releases, including `EphemeralContainers`, `TTLAfterFinished`, `SizeMemoryBackedVolumes`, `CPUManager`, `TopologyManager`, `NodeSwap`, and `ServerSideFieldValidation`. Updated the text to state that these features are stable and removed the obsolete gate flags.
- kubeadm examples used deprecated `kubeadm.k8s.io/v1beta3` and map-style `extraArgs`. Updated examples to `kubeadm.k8s.io/v1beta4` and structured `extraArgs` entries with `name` and `value`.
- Controller manager examples used removed gates such as `CronJobTimeZone` and `JobTrackingWithFinalizers`. Replaced them with currently listed beta gates.
- The metrics check used `feature_gate`, but current Kubernetes feature-gate metrics are exposed as `kubernetes_feature_enabled`. Updated the command.
- The TTL-after-finished test created a Job but did not set `ttlSecondsAfterFinished`, so the verification grep would not find the field. Added a patch command to set the TTL field before verification.
- Invalid `kubeletConfiguration:` wrapper fragments were replaced with valid `KubeletConfiguration` YAML documents.
- The deprecated feature example used `LegacyServiceAccountTokenNoAutoGeneration`, whose feature gate has been removed. Replaced it with the currently deprecated `GitRepoVolumeDriver` gate.

## Review Notes
The post is now accurate for current Kubernetes documentation as of 2026-06-04. Feature-gate availability remains version-sensitive, so future updates should re-check the Kubernetes feature-gates reference before recommending specific gate names.
