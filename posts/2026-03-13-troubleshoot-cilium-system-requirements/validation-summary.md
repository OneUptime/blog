# Validation Summary: Troubleshoot Cilium System Requirements

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Linux eBPF
- Linux kernel configuration
- systemd mount units
- BPF filesystem

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes configuration, including BPFFS systemd mount unit: https://docs.cilium.io/en/latest/network/kubernetes/configuration/
- Cilium CLI `install` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_install/
- Cilium BPF debugging and testing reference for `RLIMIT_MEMLOCK`: https://docs.cilium.io/en/stable/reference-guides/bpf/debug_and_test/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg sysdump` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_sysdump.html

## Issues Found
- The kernel version table used outdated and unsupported feature thresholds such as a 4.9.17 baseline. Updated it to the current Cilium documented baseline of Linux kernel 5.10 or equivalent, plus the advanced-feature kernel requirements documented by Cilium.
- The kernel configuration checker used option names that do not match Cilium's documented base requirements and only accepted built-in `=y` values. Updated the option list to Cilium's documented base kernel configuration options and changed the check to accept either built-in or module values where applicable.
- The memory-limit remediation used `/etc/security/limits.conf`, which does not reliably apply to a systemd-managed Cilium service. Updated the example to use a systemd override with `LimitMEMLOCK=infinity` for native `cilium-agent` deployments.
- The filesystem section stated that debugfs is required by Cilium. Updated the wording to clarify that BPFFS is required, while debugfs is useful for low-level diagnostic commands.
- The best-practices section referred generically to running `cilium-dbg` to capture full system state. Updated it to the documented `cilium sysdump` command.

## Review Notes
The post is technically relevant and includes actionable commands. The Cilium system requirements are version-sensitive, so the kernel baseline and advanced feature table should be rechecked when the target Cilium version changes.
