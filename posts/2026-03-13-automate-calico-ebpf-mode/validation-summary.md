# Validation Summary: How to Automate Calico eBPF Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico eBPF data plane
- Tigera Operator Installation custom resource
- Kubernetes kube-proxy DaemonSet management
- Kubernetes ConfigMaps
- kubectl patch, debug, rollout, and exec commands
- Terraform AWS launch templates
- Linux kernel and BPF filesystem prerequisites
- GitOps delivery with Flux CD or ArgoCD

## Sources Consulted
- Calico Open Source documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Open Source documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Tigera Operator Installation API reference, https://docs.tigera.io/calico-cloud/reference/installation/api
- Kubernetes kubectl debug reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl patch reference, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes node debugging task documentation, https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The prerequisite and bootstrapping examples used kernel 5.3 as the minimum for Calico eBPF. Current Calico documentation lists v5.10 as the minimum base eBPF dataplane kernel, with a documented RHEL 8.4 backport exception. Updated the prerequisite text and kernel checks to require 5.10+ while noting the RHEL exception.
- The introduction referred to FelixConfiguration changes, but the post's operator-based examples configure the Installation resource and API server endpoint ConfigMap. Updated those references to match the actual configuration shown.
- The Installation examples set `hostPorts: Disabled`. Current Calico eBPF operator examples clear `hostPorts` with `null` when switching an existing installation. Updated both YAML and `kubectl patch` examples to use `hostPorts: null`.
- The shell script accepted a `CALICO_CIDR` argument that was never used. Removed the unused variable from the example.
- The shell script's preflight check only validated the kernel major version, allowing unsupported 5.x kernels older than 5.10. Updated it to parse and check both major and minor kernel versions.
- The shell script used an interactive TTY flag for a non-interactive `kubectl debug` preflight command. Removed `-it` while keeping the documented `kubectl debug node/... --image=... -- COMMAND` form.

## Review Notes
The direct `kube-proxy` DaemonSet patch is technically valid for clusters where kube-proxy is managed as a normal DaemonSet, but Calico documents caveats for platforms such as AKS where add-on managers may reconcile the change away. The local environment did not have `kubectl` installed, so CLI syntax was verified against the generated Kubernetes reference documentation rather than local `--help` output.
