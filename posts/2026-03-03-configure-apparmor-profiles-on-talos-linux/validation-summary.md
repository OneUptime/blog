# Validation Summary: How to Configure AppArmor Profiles on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.10+)
- AppArmor (Linux Security Module)
- SELinux (referenced as the default Talos LSM)
- Kubernetes (1.30+ AppArmor securityContext field, beta annotation)
- containerd / kubectl / talosctl
- Talos Image Factory and Unified Kernel Images (UKI)
- nginx (sample workload)

## Sources Consulted
- Talos SELinux documentation: https://docs.siderolabs.com/talos/v1.10/security/selinux
- Talos 1.10 "What's New" release notes: https://docs.siderolabs.com/talos/v1.10/getting-started/what's-new-in-talos
- Talos 1.9.0 release notes on GitHub: https://github.com/siderolabs/talos/releases/tag/v1.9.0
- siderolabs/pkgs issue on CONFIG_LSM AppArmor/SELinux ordering: https://github.com/siderolabs/pkgs/issues/1040
- talosctl CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos MachineConfig reference: https://docs.siderolabs.com/talos/v1.10/reference/configuration/v1alpha1/config
- Kubernetes AppArmor tutorial: https://kubernetes.io/docs/tutorials/security/apparmor/

## Issues Found
1. **Incorrect Talos version for SELinux default.** The post stated "since Talos v1.9 the default Linux Security Module is SELinux (enabled in permissive mode on v1.10 images)". Per Talos release notes, SELinux support was added in v1.9 but was *not* enabled by default — the changelog explicitly says "chore: move enabling SELinux by default to 1.10". SELinux only became the default LSM (in permissive mode) starting with Talos v1.10. Fixed the sentence to: "since Talos v1.10 the default Linux Security Module is **SELinux** (enabled in permissive mode)".

## Review Notes
- The `talosctl patch machineconfig --patch-file` flag is valid per the v1.10 CLI reference (alongside `--patch @file`), so the example command is correct as written.
- The `google/apparmor-loader` image still works for the DaemonSet pattern but is no longer actively maintained upstream; readers building production deployments may want to switch to a maintained loader (e.g. the AppArmor support in Security Profiles Operator) or use Talos system extensions, both of which the post already mentions in passing.
- The `container.apparmor.security.beta.kubernetes.io/<container>` annotation is deprecated as of Kubernetes 1.30 in favor of `securityContext.appArmorProfile`; AppArmor support went stable in Kubernetes v1.31. Both forms shown in the post still work in 1.30+ — readers on 1.31+ should prefer the native field.
- The AppArmor profile syntax (includes, network rules, file globs, deny rules, flag set `attach_disconnected,mediate_deleted`) is valid AppArmor 3.x syntax.
- The kernel argument example `lsm=lockdown,capability,yama,apparmor,bpf apparmor=1` is a valid way to switch the active LSM; on Talos this still requires rebuilding the UKI via Image Factory because of immutable kernel command lines.
- The `kubectl run apparmor-check --image=busybox --rm -it --restart=Never` command will leave the pod hanging waiting for stdin on most shells; readers should typically drop `-it` for non-interactive checks or pipe a command directly. Not a technical error, just an ergonomics note.
