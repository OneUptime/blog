# Validation Summary: How to Enforce Pod Security Standards on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (machine config, `talosctl`)
- Kubernetes Pod Security Standards (PSS): Privileged, Baseline, Restricted
- Kubernetes Pod Security Admission (PSA) controller
- `kubectl` (namespace labels, dry-run)
- `PodSecurityConfiguration` admission config (`pod-security.admission.config.k8s.io/v1`)
- Kyverno / OPA Gatekeeper (mentioned as complementary tools)

## Sources Consulted
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Enforce standards with namespace labels: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Configure admission controller for PSS: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/
- PSA stable announcement (1.25): https://kubernetes.io/blog/2022/08/25/pod-security-admission-stable/
- Talos machine config reference: https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/
- Talos config patching guide: https://www.talos.dev/v1.6/talos-guides/configuration/patching/
- `talosctl` CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/

## Issues Found

1. **Restricted PSS misdescribed as requiring read-only root filesystem.**
   The original opening said Restricted "Requires pods to run as non-root, with read-only root filesystems, drop all capabilities, and use specific seccomp profiles." `readOnlyRootFilesystem` is **not** part of the Restricted standard — the post itself even notes this correctly later in the reference table ("Recommended but not required by PSS"). Rewrote the sentence to list the actual Restricted-specific controls (non-root, drop ALL capabilities, restricted volume types, RuntimeDefault/Localhost seccomp).

2. **"Adding any capabilities" misstated.**
   The list of fields not allowed under Restricted said "Adding any capabilities". Under Restricted, `NET_BIND_SERVICE` may be added back — it is the only capability explicitly permitted. Updated the bullet to reflect this.

3. **`kubectl auth can-i` is not a PSA compliance check.**
   The "Quick compliance check using dry-run" example used `kubectl auth can-i create pods ... --as system:serviceaccount:...`, which only checks RBAC authorization and does not exercise the PSA admission controller at all. Also, despite the comment saying "dry-run", the command did not actually use `--dry-run`. Replaced with two correct server-side dry-run patterns: `kubectl apply --dry-run=server -f pod.yaml` for a specific manifest, and `kubectl label --dry-run=server --overwrite ns --all pod-security.kubernetes.io/enforce=restricted` for migration-style auditing of existing workloads.

## Review Notes

- The `PodSecurityConfiguration` apiVersion (`pod-security.admission.config.k8s.io/v1`) is correct for Kubernetes 1.25+. On clusters older than 1.25 it would need to be `v1beta1`, but the post targets the modern stable PSA so `v1` is appropriate.
- The Talos `cluster.apiServer.admissionControl` path and structure (`name: PodSecurity` + `configuration:` block) are valid against the Talos v1.x machine config schema.
- The `talosctl machineconfig patch`, `talosctl apply-config`, and `talosctl logs kube-apiserver` commands are all syntactically correct.
- The `restricted-pod.yaml` example includes `readOnlyRootFilesystem: true`. This is not required by Restricted but is a defensible hardening choice and is consistent with the volume mounts the example provides for nginx (tmp, cache, run). Left as-is.
- Talos has been moving its default PSA configuration over time; teams running very new Talos versions should double-check whether default `admissionControl` entries already include PSA before applying this patch, to avoid duplicate entries.
- The `talosctl logs kube-apiserver | grep "PodSecurity"` step will surface warn-mode warnings (which the apiserver logs), but full PSA audit-event capture requires an audit policy to be configured on the apiserver. This is a reasonable simplification for the post's scope.
