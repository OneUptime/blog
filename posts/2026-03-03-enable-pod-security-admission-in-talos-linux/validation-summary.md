# Validation Summary: How to Enable Pod Security Admission in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Kubernetes Pod Security Admission (PSA)
- Kubernetes Pod Security Standards (Privileged, Baseline, Restricted)
- kubectl (namespace labels, run with overrides)
- Prometheus / PrometheusRule (monitoring.coreos.com/v1)

## Sources Consulted
- Kubernetes: Enforce Pod Security Standards with the Admission Controller — https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- Kubernetes: Pod Security Standards — https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes: Pod Security Admission — https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Talos v1alpha1 Configuration Reference — https://www.talos.dev/v1.8/reference/configuration/v1alpha1/config/
- Talos Configuration Patches — https://www.talos.dev/v1.9/talos-guides/configuration/patching/
- Sidero Labs PSA guide — https://www.talos.dev/v1.8/kubernetes-guides/configuration/pod-security/
- Talos Static Pods — https://www.talos.dev/v1.6/advanced/static-pods/
- Kubernetes Metrics Reference — https://kubernetes.io/docs/reference/instrumentation/metrics/
- kubernetes/apiserver admission metrics source (`apiserver_admission_controller_admission_duration_seconds`)

## Issues Found
- **Incorrect `talosctl` command for applying a partial machine config patch.** The post defined a partial YAML containing only the `cluster.apiServer.admissionControl` snippet, then applied it with `talosctl apply-config --file talos-config-psa.yaml`. `apply-config` expects a complete machine configuration, so this would fail validation. Changed the command to `talosctl patch machineconfig --patch @talos-config-psa.yaml`, which is the documented way to apply a strategic merge patch to an existing machine configuration. Added a one-line comment to clarify why a patch is used.

All other technical content was verified as correct:
- `cluster.apiServer.admissionControl` structure with `name` and `configuration` matches the Talos v1alpha1 schema.
- `pod-security.admission.config.k8s.io/v1` is the correct, GA apiVersion (stabilized in Kubernetes 1.25).
- `defaults` and `exemptions` fields (`enforce`, `enforce-version`, `warn`, `warn-version`, `audit`, `audit-version`, `namespaces`, `runtimeClasses`, `usernames`) all match the upstream `PodSecurityConfiguration` schema.
- Namespace labels (`pod-security.kubernetes.io/enforce`, `/warn`, `/audit`, `*-version`) are correct.
- `/etc/kubernetes/manifests/` is the correct location for control-plane static-pod manifests in Talos.
- `apiserver_admission_controller_admission_duration_seconds_count` is the auto-derived `_count` series of the documented histogram; it exposes `name` and `rejected` labels, so the PromQL filter is valid.
- `kubectl get --raw /metrics` is the documented way to fetch kube-apiserver metrics.
- Violation error messages and remediation YAML snippets accurately reflect Baseline and Restricted profile rules (privileged containers, host namespaces, runAsNonRoot, capability dropping).

## Review Notes
- The static-pod manifest filename in `/etc/kubernetes/manifests/` is managed and prefixed by Talos; the `talosctl read … grep -A5 "admission"` command will still surface admission plugin info because the kube-apiserver manifest is present there, but the file is read-only and should not be hand-edited.
- `enforce-version: v1.31` pins the Baseline profile to the 1.31 ruleset; if the cluster is on an older Kubernetes minor, switch to `latest` or the matching minor. The post mixes a pinned `v1.31` with `latest` elsewhere, which is intentional but worth noting for readers pinning versions.
- The `apiserver_admission_webhook_rejection_count` metric referenced in a comment is webhook-specific and does not apply to the built-in `PodSecurity` admission plugin; the PrometheusRule itself correctly uses the `apiserver_admission_controller_admission_duration_seconds_count` histogram count, so this is informational only.
- For multi-control-plane rollouts, applying the patch sequentially with health checks (as the post does) is appropriate, since each kube-apiserver static pod will be restarted by Talos when its rendered manifest changes.
