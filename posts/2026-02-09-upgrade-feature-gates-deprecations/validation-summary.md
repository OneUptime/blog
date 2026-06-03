# Validation Summary: How to Upgrade Kubernetes With Feature Gate Changes and Deprecations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes feature gates
- kubeadm configuration
- kubelet configuration
- kubectl
- kind
- Bash
- Prometheus-style Kubernetes metrics

## Sources Consulted
- Kubernetes Feature Gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes Removed Feature Gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes kubeadm Configuration v1beta3 reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3
- Kubernetes Kubelet Configuration v1beta1 reference: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- kind Configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics
- Kubernetes Deprecation Policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/
- Kubernetes Configure Feature Gates task: https://kubernetes.io/docs/tasks/administer-cluster/configure-feature-gates/

## Issues Found
- The 1.29 graduation list incorrectly said `CSIStorageCapacity` and `PodSecurity` graduated to GA in Kubernetes 1.29. `CSIStorageCapacity` and `PodSecurity` had already graduated and their gates were removed before 1.29, so the example was updated to list feature gates that actually reached GA in 1.29.
- The new alpha feature examples included `SELinuxMountReadWriteOncePod` and `StrictCostEnforcementForVAP`, which were not accurate examples of new Kubernetes 1.29 alpha gates. They were replaced with 1.29 alpha gates from the Kubernetes feature-gates reference.
- The deprecated-gate example included `DynamicKubeletConfig`, which was deprecated and removed before Kubernetes 1.29, plus a placeholder `SomeOldFeature`. The list was replaced with `SkipReadOnlyValidationGCE`, a real gate marked deprecated starting in 1.29.
- The kind test-cluster example used a placeholder `MyNewFeature` gate that would fail if run. It was replaced with the real Kubernetes 1.29 alpha gate `VolumeAttributesClass`.
- The kubeadm configuration example used `CSIStorageCapacity` even though that gate was already removed before 1.29. The example was updated to use `ReadWriteOncePod` and to configure kubelet feature gates with the official `KubeletConfiguration` `featureGates` field.
- The graduated-gate removal commands deleted an entire `--feature-gates` manifest line when `ReadWriteOncePod` appeared, which could remove unrelated gates. The commands now remove only the `ReadWriteOncePod` entry from the comma-separated flag value.
- The monitoring example searched for `feature_enabled`, but Kubernetes exposes feature gate state using the `kubernetes_feature_enabled` metric. The metric name was corrected.
- The strategy document listed `CSIStorageCapacity` as graduating to GA in 1.29. That entry was removed because the feature gate had already been removed before 1.29.

## Review Notes
The examples assume a kubeadm-style cluster where control plane components run as static pods under `/etc/kubernetes/manifests/`. Managed Kubernetes services may not expose or allow direct modification of these component flags.
