# Validation Summary: How to Configure Admission Controllers on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration (cluster.apiServer.extraArgs, extraVolumes, machine.files)
- Kubernetes admission controllers (built-in plugins and webhook-based)
- Pod Security Admission (replacement for PodSecurityPolicy)
- ValidatingWebhookConfiguration / MutatingWebhookConfiguration (admissionregistration.k8s.io/v1)
- AdmissionConfiguration / PodSecurityConfiguration (apiserver.config.k8s.io/v1, pod-security.admission.config.k8s.io/v1)
- LimitRange and ResourceQuota
- talosctl and kubectl CLI

## Sources Consulted
- Talos v1alpha1 configuration reference: https://www.talos.dev/v1.9/reference/configuration/v1alpha1/config/
- Talos talosctl CLI reference (logs, patch, apply-config): https://www.talos.dev/v1.9/reference/cli/
- Kubernetes Admission Controllers reference: https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes Dynamic Admission Control (webhooks): https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Existing consistent posts in this blog series (set-up-extra-volumes-for-the-api-server-in-talos, configure-api-server-extra-args-in-talos-linux)

## Issues Found
1. **Invalid `name` field and wrong casing in `extraVolumes`.** The Pod Security defaults example used `name: admission-config` and `readOnly: true` under `cluster.apiServer.extraVolumes`. The Talos `VolumeMountConfig` schema has only `hostPath`, `mountPath`, and `readonly` (lowercase 'o'); there is no `name` field. Removed the `name` line and changed `readOnly` to `readonly`, matching the convention used throughout the rest of this blog series.

2. **Ambiguous file permission literal.** `permissions: 0644` is parsed as decimal 644 by YAML 1.2 (which Talos's Go yaml.v3 parser follows), not octal. Changed to `permissions: 0o644` (Go-style octal prefix, also used in the official Talos docs and other posts in this series).

3. **Wrong talosctl subcommand for applying a patch.** The "Apply to all control plane nodes" snippet used `talosctl apply-config --patch @admission-controllers.yaml`. `talosctl apply-config` requires `-f/--file` to send a full machine config; `--patch` alone patches that file, it does not patch a running node's config. Changed to `talosctl patch mc --nodes ... --patch @admission-controllers.yaml`, which is the canonical way to apply a patch to running nodes (and matches the related post `set-up-extra-volumes-for-the-api-server-in-talos`).

4. **Missing `-k` flag on `talosctl logs kube-apiserver`.** kube-apiserver runs as a static pod in the `k8s.io` containerd namespace, not as a Talos system service, so reading its logs through `talosctl` requires the `-k`/`--kubernetes` flag. Without it, talosctl resolves the name against the Talos service list and fails. Updated the troubleshooting command to `talosctl -n 192.168.1.10 logs -k kube-apiserver | grep ...`.

## Review Notes
- The simplified pipeline diagram (`Request -> Authentication -> Authorization -> Admission Controllers -> Persistence`) omits the schema-validation step that occurs between mutating and validating admission, but this is a fair pedagogical simplification.
- The "Default admission controllers (Kubernetes 1.29+)" list is accurate; `NodeRestriction` and `ValidatingAdmissionPolicy` are both enabled by default in 1.29+, and the list is given in alphabetical order matching the upstream registry.
- `pod-security.kubernetes.io/enforce-version: latest` is valid but pins to whichever version of the Pod Security Standards is bundled with the apiserver — users may want to pin to a specific minor version (e.g., `v1.29`) in production to avoid policy drift on upgrade. Not a correctness issue.
- Webhook examples correctly use `admissionregistration.k8s.io/v1` with `admissionReviewVersions: ["v1"]` and the required `sideEffects` field.
- The default webhook `timeoutSeconds` of 10 stated in the Performance section is correct for `admissionregistration.k8s.io/v1`.
