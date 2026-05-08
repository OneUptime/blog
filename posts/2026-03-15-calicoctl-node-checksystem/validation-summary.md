# Validation Summary: How to Use calicoctl node checksystem with Practical Examples

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Linux kernel modules
- Kubernetes DaemonSet
- Bash

## Sources Consulted
- Calico `calicoctl node checksystem` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/checksystem
- Calico Kubernetes system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico eBPF installation and kernel requirements: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico `checksystem.go` source implementation: https://github.com/projectcalico/calico/blob/master/calicoctl/calicoctl/commands/node/checksystem.go
- Kubernetes DaemonSet concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found
- The basic command examples omitted `sudo`, but the current `calicoctl node checksystem` implementation enforces root privileges. Updated local and SSH examples to run the command with `sudo`.
- The sample output did not match current `checksystem` output. Replaced the Docker-style swap warning and non-current formatting with an abridged output that matches the command's `Checking kernel version...`, `Checking kernel modules...`, `OK`, `FAIL`, and final success message format.
- The missing-module example used a non-current `FAIL (module not loaded and not available)` format. Updated it to the warning and `FAIL` format used by the Calico implementation.
- The post stated that Calico requires Linux kernel 3.10+ and eBPF requires 5.3+. Current Calico Kubernetes documentation requires Linux kernel 5.10+ and base eBPF dataplane support requires 5.10+, with some eBPF features requiring newer kernels. Updated the kernel requirement text and troubleshooting note.
- The module persistence example implied a fixed universal list of modules. Current Calico documentation notes that required kernel dependencies vary by distribution and dataplane. Updated the text to persist only modules reported by `checksystem`, with a smaller example list.
- The DaemonSet example did not mount the host module and kernel config paths that `checksystem` uses when it checks `/lib/modules`, `/boot`, and `/usr/src`. Added read-only hostPath mounts for those paths.
- The DaemonSet image tag used Calico v3.27.0, which is outdated relative to the current Calico documentation reviewed. Updated the example to `calico/ctl:v3.32.0`.

## Review Notes
The DaemonSet example is useful for environments without SSH, but it creates pods that run the check and then restart because `restartPolicy: Always` is required for DaemonSets. For operational use, a Job-like workflow or log collection process may be easier to consume, but the snippet is technically valid as a DaemonSet-based check.
