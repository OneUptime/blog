# Validation Summary: How to Configure Admission Control Pod Security Policies in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes Pod Security Admission (PSA)
- Pod Security Standards (PSS)
- talosctl CLI
- kubectl
- YAML machine configuration

## Sources Consulted
- [Talos Pod Security guide](https://docs.siderolabs.com/kubernetes-guides/security/pod-security)
- [Talos CLI reference (apply-config)](https://docs.siderolabs.com/talos/v1.9/reference/cli/talosctl_apply-config/)
- [Talos Configuration Patches docs](https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching)
- [Kubernetes Pod Security Admission Configuration](https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-admission-controller/)
- [Kubernetes Pod Security Standards](https://kubernetes.io/docs/concepts/security/pod-security-standards/)

## Issues Found
- **Incorrect `talosctl` command for patching a running cluster**: The post originally used `talosctl apply-config --nodes ... --patch @file.yaml`. The `apply-config` command requires a base config file via `-f/--file` and uses `--patch` only as an additional overlay on top of that base. For applying just a patch to a running node, the correct command is `talosctl patch mc` (shorthand for `patch machineconfig`). Fixed by changing the example to `talosctl patch mc --nodes 192.168.1.100 --patch @machine-config-patch.yaml`.

## Review Notes
- The `pod-security.admission.config.k8s.io/v1` apiVersion is correct for Kubernetes 1.25+. Talos clusters running on older Kubernetes versions (1.23-1.24) would need `v1beta1`, and 1.22 would need `v1alpha1`, but since the post discusses modern Talos / Kubernetes, `v1` is appropriate.
- The Talos machine config structure (`cluster.apiServer.admissionControl` with `name` and `configuration` per plugin) is correct. Talos handles wrapping these as an `AdmissionConfiguration` resource automatically.
- The PSP deprecation (1.21) and removal (1.25) timeline is accurate.
- The Pod Security Standards levels (privileged, baseline, restricted) and modes (enforce, audit, warn) are correctly described.
- The namespace labels (`pod-security.kubernetes.io/enforce`, `/warn`, `/audit`, and the `-version` variants) are correctly named.
- Pinning to `v1.28` in the upgrade example is reasonable; readers on newer clusters should bump to a version they have validated against.
- The verification command `kubectl get pod kube-apiserver-... -o yaml | grep -A 5 "admission-control"` will surface API server flags including `--admission-control-config-file`; this is a reasonable spot-check though `talosctl get admissioncontrolconfig` would be more idiomatic for Talos users.
