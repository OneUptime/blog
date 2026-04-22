# Validation Summary: How to Configure Seccomp Profiles in Rancher

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Rancher
- Kubernetes
- Linux seccomp
- Pod Security Standards and Pod Security Admission
- Kubernetes security contexts
- Rancher Monitoring
- Prometheus Operator PrometheusRule resources
- kube-state-metrics
- jq

## Sources Consulted
- Kubernetes: Configure a Security Context for a Pod or Container - https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes: Restrict a Container's Syscalls with seccomp - https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes: Pod Security Standards - https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes: Enforce Pod Security Standards with Namespace Labels - https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Rancher: Pod Security Admission Configuration Templates - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/psa-config-templates
- Rancher: Enable Monitoring - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Prometheus Operator API Reference: PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- kube-state-metrics pod metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics namespace metrics - https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/namespace-metrics.md
- OCI Runtime Spec: Linux seccomp configuration - https://github.com/opencontainers/runtime-spec/blob/main/config-linux.md#seccomp

## Issues Found
- The audit command used `securityContext.runAsRoot`, which is not a Kubernetes API field. Replaced it with checks for `runAsUser: 0` and privileged containers across regular, init, and ephemeral containers.
- The generic `security-feature-config.yaml` ConfigMap did not configure Kubernetes or Rancher seccomp behavior. Replaced it with a valid OCI seccomp audit profile and the correct kubelet seccomp profile path guidance.
- The Deployment manifest was invalid for `apps/v1` because it omitted `spec.selector` and matching pod template labels. Added the required selector, labels, and an explicit replica count.
- The Helm example referenced a fake chart repository and chart. Replaced it with Rancher Monitoring UI installation guidance and verification commands for the PrometheusRule CRD and monitoring namespace.
- The Prometheus rules referenced kube-state-metrics metrics that are not exposed by current kube-state-metrics documentation. Replaced them with rules based on documented `kube_pod_info`, `kube_namespace_status_phase`, and `kube_namespace_labels` metrics.
- The verification script did not check explicit seccomp profile coverage and used a fragile namespace custom-columns expression. Added an explicit seccomp check and replaced the namespace check with `kubectl get namespaces -L pod-security.kubernetes.io/enforce`.
- The prerequisites listed Helm but the corrected guide no longer uses Helm commands. Replaced it with `kubectl` and `jq`, and updated the Rancher prerequisite to v2.7.2+ to match Rancher's PSA template availability.

## Review Notes
- The example `audit.json` profile logs syscalls for discovery; it is not a restrictive enforcement profile. The workload example uses `RuntimeDefault`, with a commented `Localhost` alternative for tested profiles distributed to every node.
- The namespace label Prometheus rule depends on kube-state-metrics exposing the `pod-security.kubernetes.io/enforce` namespace label, so the guide now includes the required `metricLabelsAllowlist` chart value.
- `latest` is a valid Pod Security Admission version label, but production clusters may prefer pinning to a Kubernetes minor version for predictable upgrade behavior.
- Local `kubectl`, `helm`, and `promtool` binaries were not installed in this environment, so command behavior was verified against official documentation. Bash syntax and JSON syntax were checked locally with `bash -n` and `jq`.
