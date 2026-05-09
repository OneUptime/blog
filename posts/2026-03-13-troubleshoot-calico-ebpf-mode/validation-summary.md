# Validation Summary: How to Troubleshoot Calico eBPF Mode

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes
- kube-proxy
- Tigera Operator Installation resources
- Linux eBPF, BPF maps, and bpftool
- kubectl debug and kubectl exec

## Sources Consulted
- Calico Open Source documentation: Enabling the eBPF data plane: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Open Source documentation: Install in eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico Open Source documentation: Troubleshoot eBPF mode: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Open Source documentation: Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes generated kubectl reference: kubectl exec: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post described unsupported kernels as "silently" falling back to iptables. Current Calico troubleshooting documentation says Felix logs an error and disables BPF mode, so the wording was corrected.
- The expected Felix log output did not match the documented current log message. It was updated to the documented "BPF enabled, starting BPF endpoint manager and map manager." text.
- The `calico-node` diagnostic commands used old-style flags (`-bpf-list-progs` and `-bpf-nat-dump`). They were changed to the current documented `calico-node -bpf help` and `calico-node -bpf nat dump` forms.
- The decision tree used a `>=5.3` kernel baseline. Current Calico Open Source documentation requires Linux kernel v5.10 or above, with a Red Hat v4.18.0-305 exception, so the decision tree was updated to `>=5.10`.
- The API server ConfigMap guidance implied that the value should simply be an endpoint IP. Calico documentation requires a stable direct API server host, such as a load balancer or stable control-plane address, not the Kubernetes service ClusterIP. The text was adjusted to avoid recommending an unstable endpoint in HA clusters.
- The `kubectl debug node` examples operated on the debug container's environment too loosely for host-level mount checks. They now use `--profile=sysadmin`, `/host`, and `nsenter` for host mount namespace operations.
- The kernel config grep missed `CONFIG_NET_CLS_BPF` and `CONFIG_NET_ACT_BPF`; the regex was expanded to include those entries.

## Review Notes
The guide is now technically aligned with current Calico Open Source 3.32 documentation. The examples still assume the Tigera Operator namespace layout (`calico-system` and `tigera-operator`); manifest-based installs commonly use `kube-system`, so a future post revision could add a short caveat for that installation style.
