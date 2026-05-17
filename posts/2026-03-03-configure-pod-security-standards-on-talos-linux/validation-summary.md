# Validation Summary: How to Configure Pod Security Standards on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine configuration, talosctl)
- Kubernetes Pod Security Standards (Privileged, Baseline, Restricted)
- Kubernetes Pod Security Admission (PSA) controller
- `pod-security.admission.config.k8s.io/v1` PodSecurityConfiguration
- kubectl namespace labeling and dry-run testing
- Pod/Deployment securityContext (seccompProfile, capabilities, runAsNonRoot, allowPrivilegeEscalation)
- nginx unprivileged container image

## Sources Consulted
- Kubernetes — Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes — Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes — Enforce Pod Security Standards with Namespace Labels and Admission Controller: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- pod-security-admission API types (upstream): https://github.com/kubernetes/pod-security-admission/blob/master/admission/api/v1/types.go
- Talos Linux — Pod Security: https://www.talos.dev/v1.8/kubernetes-guides/configuration/pod-security/
- Talos Linux — v1alpha1 config reference: https://www.talos.dev/v1.8/reference/configuration/v1alpha1/config/
- nginx unprivileged image: https://github.com/nginx/docker-nginx-unprivileged

## Issues Found

1. **Wildcard in `exemptions.usernames` is not supported.** The original cluster-wide exemptions example used `system:serviceaccount:kube-system:*`. The PSA admission controller does exact-string matching on the authenticated username (no wildcard/glob support), so this entry would never match any request. Replaced with two concrete service-account usernames and added a comment noting that wildcards are unsupported.

2. **Audit-mode violation log location was inaccurate.** The original snippet implied that PSA audit-mode violations appear in the regular kube-apiserver stdout/stderr log via `talosctl logs kube-apiserver | grep "pod-security"`. In reality, audit-mode violations are recorded as audit annotations (`pod-security.kubernetes.io/audit-violations`) on the Kubernetes audit log, which requires an audit policy configured to capture pod-creating requests at Metadata level or higher. Rewrote the section to clarify this distinction; kept the kube-apiserver log grep for enforce-mode rejections/warnings, which do show up there.

## Review Notes
- The Talos `cluster.apiServer.admissionControl[]` syntax with `name: PodSecurity` and inline `configuration:` block is correct for v1alpha1 machine config; Talos wires this through `--admission-control-config-file`.
- `pod-security.admission.config.k8s.io/v1` is the GA API (since Kubernetes 1.25); `latest` is a valid value for `enforce-version`/`warn-version`/`audit-version`.
- The Restricted-compliant pod uses `nginx:1.27-unprivileged` (listens on 8080, baked image user is UID 101). The example overrides `runAsUser: 1000`, which is still valid for PSS compliance but may cause runtime permission issues on directories owned by UID 101. This is an illustrative YAML and would typically be tightened to `runAsUser: 101` for the unprivileged nginx image in real deployments. Left as-is since it does not violate the Restricted policy.
- The Baseline description ("Capabilities beyond the default set") is a reasonable simplification — Baseline allows the default container capability set and permits adding only NET_BIND_SERVICE.
- The Restricted-compliant Deployment correctly drops ALL capabilities, sets `readOnlyRootFilesystem`, and mounts emptyDir volumes for writable paths — all valid under the Restricted volume-type allowlist.
- Exempting `kube-system` at the cluster level is standard practice and matches the upstream Kubernetes recommendation for clusters that ship PSA on by default.
