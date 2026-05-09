# Validation Summary: How to Troubleshoot Calico eBPF Troubleshooting Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico
- Kubernetes
- eBPF
- bpftool
- kubectl
- Linux tc

## Sources Consulted
- Calico eBPF troubleshooting documentation: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico FelixConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix logging configuration documentation: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes debugging nodes documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod
- bpftool manual page: https://manpages.ubuntu.com/manpages/noble/man8/bpftool.8.html

## Issues Found
- The command for selecting a node used `kubectl get pod ... ds/calico-node`, which is not a valid way to read a DaemonSet pod's `spec.nodeName`. Changed it to select the first `calico-node` pod by label and read `.items[0].spec.nodeName`.
- The Felix BPF example used `/usr/local/bin/calico-node -bpf-nat-dump`, but Calico documents the syntax as `calico-node -bpf nat dump`. Updated the example and related wording.
- The calicoctl fallback implied `calicoctl` could be used for BPF operations. Replaced it with `calico-node -bpf help`, matching Calico's documented embedded BPF tool.
- The node debug command created a non-privileged debug container, which may still fail for BPF inspection. Added `--profile=sysadmin`, as Kubernetes documents this profile for privileged node debugging.
- The debug-pod package install used `linux-tools-$(uname -r)`, which is distribution and kernel-package dependent. Changed it to install the `bpftool` package directly.
- The `ip link show` fallback was described as a way to see BPF-attached queueing disciplines. Replaced it with `tc filter show dev eth0 egress`, which is the relevant tool for showing tc filters.

## Review Notes
The examples still assume Calico pods are labeled `k8s-app=calico-node` and that the relevant host interface is `eth0`. Those are common defaults, but clusters with custom labels or interface names should adjust the commands.
