# Validation Summary: How to Build Kubernetes Feature Gates

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes feature gates
- kube-apiserver
- kubelet
- kube-controller-manager
- kube-scheduler
- Pod Security Admission
- PrometheusRule monitoring configuration

## Sources Consulted
- Kubernetes Feature Gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates/
- Kubernetes removed Feature Gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes feature gate configuration task: https://kubernetes.io/docs/tasks/administer-cluster/configure-feature-gates/
- Kubernetes kube-apiserver command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-apiserver/
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kube-controller-manager command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-controller-manager/
- Kubernetes kube-scheduler command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-scheduler/
- Kubernetes kubelet configuration file task: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/
- Kubernetes Pod Security Admission documentation: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Admission controller configuration task: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes Metrics Reference: https://kubernetes.io/docs/reference/instrumentation/metrics/
- Kubernetes Deprecation Policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/

## Issues Found
- Several examples used feature gates that are GA and removed in current Kubernetes, including `PodSecurity`, `APIListChunking`, `APIPriorityAndFairness`, `PodTopologySpread`, `DefaultPodTopologySpread`, `CPUManager`, `MemoryManager`, `TopologyManager`, `TTLAfterFinished`, and `JobTrackingWithFinalizers`. Replaced those examples with current feature gates documented in Kubernetes v1.36 component references.
- The Pod Security Admission walkthrough incorrectly enabled `PodSecurity` as a feature gate. Updated it to configure the stable `PodSecurity` admission plugin with `--enable-admission-plugins=PodSecurity` and the admission configuration file.
- The Pod Security verification step used `kubectl api-resources`, but Pod Security Admission is an admission plugin and does not add a new API resource. Replaced this with namespace label verification.
- The version tracking example treated old gates as still configurable for an inaccurate upgrade window. Updated it to use a version pair and actions that match the documented feature gate removal windows.
- The monitoring example used an undocumented `kubernetes_feature_enabled` metric. Updated it to clarify that the alert applies only if the organization exports feature gate inventory as a custom metric.
- The troubleshooting section recommended editing a static Pod mirror object with `kubectl edit pod`. Replaced it with editing the static Pod manifest on disk.
- The troubleshooting section described `--feature-gates FeatureName=true` as invalid because it lacked an equals sign. Updated the example to show an actually invalid key/value separator.
- The shell snippets for inspecting feature gates were made more reliable by selecting kube-apiserver pods by label and avoiding unnecessary `cat` usage.

## Review Notes
The post is now technically accurate for current Kubernetes documentation. Feature gate availability changes frequently between minor releases, so readers should still check the Feature Gates reference for the exact Kubernetes version they run.
