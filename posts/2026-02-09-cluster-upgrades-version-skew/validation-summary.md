# Validation Summary: How to Plan Kubernetes Cluster Upgrades with Version Skew Policies

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Kubernetes version skew policy
- kubectl
- kube-apiserver
- kubelet
- kube-proxy
- kube-controller-manager
- kube-scheduler
- cloud-controller-manager
- kind
- jq
- YAML

## Sources Consulted
- Kubernetes Version Skew Policy: https://kubernetes.io/releases/version-skew-policy/
- kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/
- Kubernetes Node API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/node-v1/
- Kubernetes v1.31 release notes for kubeProxyVersion deprecation: https://v1-34.docs.kubernetes.io/blog/2024/08/13/kubernetes-v1-31-release/
- Kubernetes kubeadm upgrade documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade
- kind quick start documentation: https://kind.sigs.k8s.io/docs/user/quick-start/

## Issues Found
- The post stated that kubelet can be up to two minor versions older than kube-apiserver. Updated this to the current Kubernetes policy: kubelet 1.25 and newer can be up to three minor versions older, while older kubelet versions are limited to two.
- The post did not describe kube-proxy skew policy. Added kube-proxy rules from the official skew policy.
- The post used `kubectl version --short`, which is not listed in the current generated `kubectl version` reference. Replaced it with `kubectl version`.
- The post used `.status.nodeInfo.kubeProxyVersion`, which is deprecated and unreliable. Updated examples to get kube-proxy version information from the kube-proxy DaemonSet image instead.
- The skew validation script emitted multi-line JSON objects into `while read`, which would break parsing. Changed the relevant jq invocations to compact JSON with `jq -c`.
- The skew validation script did not catch components that were newer than kube-apiserver. Added checks for negative skew.
- The skew validation script enforced the old two-minor kubelet skew limit. Updated it to enforce the current three-minor limit for kubelet and kube-proxy 1.25 and newer, with the older two-minor rule for pre-1.25 versions.
- The sample rollback plan claimed control-plane downgrades were supported. Changed it to a restore/provider-specific rollback plan and marked Kubernetes downgrade support as false.
- The example versions used unsupported 1.26 through 1.28 releases. Updated the upgrade scenario and schedules to 1.34 through 1.36, which matches the currently supported minor-release set in the Kubernetes version skew documentation.
- The placeholder `kubectl get <your-crds>` would be interpreted by the shell as redirection if copied literally. Replaced it with `kubectl get crd`.

## Review Notes
Verified the edited skew-check shell script with `bash -n`. Verified both YAML snippets parse successfully with PyYAML. The kind image tag should still be checked against the installed kind release notes in a real environment because kind publishes recommended node image tags per kind release.
