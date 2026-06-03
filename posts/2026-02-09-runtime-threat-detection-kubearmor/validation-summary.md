# Validation Summary: How to Implement Runtime Threat Detection with KubeArmor

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- KubeArmor
- KubeArmorPolicy custom resources
- Helm
- karmor CLI
- Linux Security Modules and eBPF

## Sources Consulted
- KubeArmor Getting Started documentation: https://docs.kubearmor.io/kubearmor/getting-started/deployment_guide
- KubeArmor Policy Spec for Containers: https://docs.kubearmor.io/kubearmor/specification/security_policy_specification
- KubeArmor Cluster Policy Spec for Containers: https://docs.kubearmor.io/kubearmor/documentation/cluster_security_policy_specification
- KubeArmor Security Posture documentation: https://docs.kubearmor.io/kubearmor/documentation/default_posture
- KubeArmor Visibility documentation: https://docs.kubearmor.io/kubearmor/documentation/kubearmor_visibility
- KubeArmor FAQ: https://docs.kubearmor.io/kubearmor/documentation/faq
- kubearmor-client README and logs command source: https://github.com/kubearmor/kubearmor-client
- KubeArmor Helm chart repository and v1.7.3 chart values: https://kubearmor.github.io/charts/index.yaml

## Issues Found
- Replaced `kubectl get kubearmor -n kubearmor` with `kubectl get daemonset,deployment -n kubearmor` because KubeArmor does not expose a `kubearmor` Kubernetes resource for status.
- Removed per-match `action` fields from process, file, network, and syscall examples. KubeArmor policy actions are defined at the policy level.
- Corrected the file access allow-list example to use `action: Allow` plus `kubearmor-file-posture=block`, which matches KubeArmor's documented default posture behavior.
- Corrected the network policy example by removing unsupported `port` matching and changing the explanation to protocol/source-path TCP blocking.
- Changed the syscall section from blocking to auditing because KubeArmor documentation states syscall monitoring currently supports audit mode only.
- Updated the karmor installation command to the official `get.kubearmor.io` installer.
- Replaced the nonexistent `--logFile` option with the supported `--logPath` option.
- Replaced unsupported Prometheus Helm values and invented PromQL metric names with supported relay stdout logging values.
- Fixed the patch command from `kubectl patch kubearmor` to `kubectl patch kubearmorpolicy`.

## Review Notes
Helm and kubectl were not installed in the local workspace, so CLI validation was done against official documentation, the upstream karmor source, and the upstream Helm chart values instead of local `--help` output.
