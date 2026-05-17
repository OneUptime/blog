# Validation Summary: How to Check What Version of Kubernetes Runs on Talos Linux

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- kubectl CLI
- talosctl CLI
- containerd (CRI runtime)
- Kubernetes machine configuration (v1alpha1 schema)

## Sources Consulted
- Kubernetes issue tracking removal of `kubectl version --short`: https://github.com/kubernetes/kubernetes/issues/122455
- Kubespray issue confirming removal in 1.28: https://github.com/kubernetes-sigs/kubespray/issues/10654
- Talos v1.12 CLI reference (talosctl containers, gen config): https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos v1.9 cluster config reference (apiServer/controllerManager/scheduler/proxy image fields): https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/
- Talos talosctl version flag reference: https://www.talos.dev/v1.3/reference/cli/

## Issues Found
- **`kubectl version --short` is deprecated and removed.** The `--short` flag was deprecated and then removed in kubectl v1.28 (returns "unknown flag: --short"). Short output is now the default for `kubectl version`. Replaced three occurrences of `kubectl version --short 2>/dev/null || kubectl version`, `kubectl version --short 2>/dev/null` patterns with plain `kubectl version`, since modern kubectl already produces concise output by default.

## Review Notes
- `talosctl version --short` is still valid — Talos has not removed this flag, unlike kubectl. Left as-is.
- `talosctl get kubeletspec` correctly returns the KubeletSpec resource (CLI accepts lowercase form) and the resource does include an `image` field.
- `talosctl containers -k` (short for `--kubernetes`) is valid and lists containers in the `k8s.io` containerd namespace.
- `talosctl gen config ... --kubernetes-version` is a documented and supported flag.
- The cluster YAML structure for overriding `apiServer`, `controllerManager`, `scheduler`, and `proxy` images matches the Talos v1alpha1 schema.
- Example versions used (Kubernetes v1.30.1, Talos v1.7.0, containerd 1.7.15) are illustrative and plausible for the era; readers should consult current release notes for the latest version compatibility matrix.
