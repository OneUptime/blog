# Validation Summary: How to Set Up Kernel Self-Protection (KSPP) Settings in Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Linux kernel hardening
- Kernel Self-Protection Project (KSPP)
- Linux sysctl configuration
- talosctl
- Kubernetes node security

## Sources Consulted
- Talos Linux kernel reference: https://docs.siderolabs.com/talos/v1.12/reference/kernel
- Talos Linux talosctl CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux configuration patching guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/system-configuration/patching
- Talos Linux logging guide: https://docs.siderolabs.com/talos/v1.12/configure-your-talos-cluster/logging-and-telemetry/logging
- Talos Linux customizing the kernel guide: https://docs.siderolabs.com/talos/v1.9/build-and-extend-talos/custom-images-and-development/customizing-the-kernel
- Talos Linux philosophy/security overview: https://docs.siderolabs.com/talos/v1.10/learn-more/philosophy
- Linux kernel sysctl documentation: https://docs.kernel.org/admin-guide/sysctl/kernel.html

## Issues Found
- The post described `/proc/sys/kernel/randomize_va_space` as a KASLR check. That sysctl controls userspace ASLR, while KASLR is represented by kernel configuration such as `CONFIG_RANDOMIZE_BASE` and boot-time behavior. Updated the comment to say userspace ASLR.
- The `kptr_restrict` explanation used "non-root" as the privilege boundary. Linux documents this in terms of `CAP_SYSLOG`, so the expected-value comment now uses that capability-based wording.
- The runtime Talos configuration command used `talosctl apply-config --config-patch` without a machine config file. Talos documents live machine configuration patching with `talosctl patch machineconfig --patch`, so the command was corrected.
- The network hardening section labeled generic network sysctls as KSPP settings. The settings are valid hardening controls, but they are not specifically KSPP compile-time protections, so the section title and wording were narrowed.
- The custom kernel section referred to Image Factory for kernel configuration changes and showed an incomplete `make kernel` flow. Updated it to the documented source-build workflow using the `pkgs` repository, release branch, `kernel-menuconfig`, and `make kernel` with registry/push parameters.
- The kernel log forwarding example used `machine.logging.destinations`, which is for service logs. Talos documents kernel log forwarding via `talos.logging.kernel` or a `KmsgLogConfig` document, so the example was replaced with `KmsgLogConfig`.
- The immutability comparison overstated that workloads cannot change kernel parameters and tied runtime sysctls to the read-only filesystem. Reworded it to the more accurate claim that Talos immutability and declarative machine configuration reduce drift and that persistent machine configuration changes go through the Talos API.

## Review Notes
The post remains version-general. Talos defaults can change between releases, especially kernel configuration and boot parameters such as `init_on_free`, so future updates should verify expected values against the specific Talos version used by the reader.
