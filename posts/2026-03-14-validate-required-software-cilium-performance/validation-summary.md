# Validation Summary: Validating Required Software for Cilium Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Linux kernel and eBPF/BPF filesystem
- bpftool, ethtool, perf
- iperf3, netperf, jq
- Bash

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium CLI `cilium status` reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes drain documentation: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes volumes documentation for `hostPath`: https://kubernetes.io/docs/concepts/storage/volumes/
- Linux kernel BPF documentation: https://www.kernel.org/doc/html/v5.17/bpf/index.html

## Issues Found
- The kernel version check used `bc` to compare values such as `5.10`, which treats them as decimal numbers and can incorrectly classify versions such as `5.4`. Changed the check to use `sort -V` against a `5.10` minimum.
- The Cilium health check used `cilium status | grep -q "OK"`, which is brittle because the Cilium CLI provides status wait semantics. Changed it to `cilium status --wait --wait-duration 5m`.
- The tools validation omitted benchmark tools used later in the post. Added `iperf3`, `jq`, and `netperf` to the tool checks.
- The Kubernetes Job checked container-visible kernel modules and BPF mounts without mounting the relevant host paths. Added `hostPID`, mounted `/proc` and `/sys/fs/bpf` from the host, and updated the module and BPF checks to read those host paths.

## Review Notes
- Current Cilium documentation lists Linux kernel `>= 5.10` or an equivalent distribution kernel, such as RHEL 8.10's `4.18`, for supported Cilium releases. The script intentionally validates the generic `>= 5.10` baseline and does not attempt distribution-specific equivalence detection.
- The statistical analysis snippet uses GNU awk's `asort()` function. It is valid in GNU awk environments, but would need adjustment for minimal awk implementations.
