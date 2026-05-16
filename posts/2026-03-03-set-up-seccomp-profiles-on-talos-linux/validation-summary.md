# Validation Summary: How to Set Up Seccomp Profiles on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux machine configuration
- Kubernetes seccomp profiles
- containerd RuntimeDefault seccomp behavior
- Security Profiles Operator
- Linux seccomp syscall filtering
- kubectl and talosctl commands

## Sources Consulted
- Kubernetes seccomp tutorial: https://kubernetes.io/docs/tutorials/security/seccomp/
- Kubernetes seccomp reference: https://kubernetes.io/docs/reference/node/seccomp/
- Kubernetes Pod Security Standards: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Talos Seccomp Profiles guide: https://docs.siderolabs.com/kubernetes-guides/security/seccomp-profiles
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.13/reference/configuration/v1alpha1/config
- Talos CLI reference: https://docs.siderolabs.com/talos/v1.13/reference/cli
- Security Profiles Operator installation and usage: https://github.com/kubernetes-sigs/security-profiles-operator/blob/main/installation-usage.md
- Docker seccomp documentation for the common default-profile syscall discussion: https://docs.docker.com/engine/security/seccomp/
- containerd 2.0 documentation noting default seccomp profile changes: https://containerd.io/docs/2.1/containerd-2.0/

## Issues Found
- The original RuntimeDefault enablement snippet configured Kubernetes PodSecurity admission, which does not enable kubelet seccomp defaulting. Replaced it with Talos `machine.kubelet.defaultRuntimeSeccompProfileEnabled: true`, matching Talos and Kubernetes seccomp defaulting docs.
- The post stated containerd blocks around 44 syscalls and presented RuntimeDefault as a fixed block list. Changed the wording to explain that RuntimeDefault is runtime-defined and can change between containerd releases.
- The Talos custom profile deployment used `machine.files` to write directly to `/var/lib/kubelet/seccomp/profiles`. Replaced it with Talos `machine.seccompProfiles`, the documented mechanism for creating profiles under that directory.
- The audit profile example included architecture and empty syscall fields that were unnecessary for a log-only profile and less portable. Simplified it to the documented `defaultAction: SCMP_ACT_LOG` form.
- The Security Profiles Operator installation command omitted the documented cert-manager prerequisite for non-OpenShift clusters. Added the cert-manager install and readiness wait commands before applying the SPO operator manifest.
- Clarified where SPO installs generated profiles so readers know the localhost profile path differs from Talos-managed `profiles/<name>.json` paths.

## Review Notes
The example custom syscall allowlist remains illustrative. Real workloads should generate and test profiles per application and per architecture, because required syscalls vary by runtime, language, libc, container image, and kernel/containerd version.
