# Validation Summary: How to Debug Kubernetes NetworkPolicy Issues with Calico for IPv4

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Calico (CNI plugin, calicoctl, GlobalNetworkPolicy, WorkloadEndpoint)
- Kubernetes (kubectl, NetworkPolicy)
- iptables
- Tigera Operator (calico-system namespace)
- Linux kernel logging (dmesg, journalctl)

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl install reference: https://docs.tigera.io/calico/latest/operations/calicoctl/install
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Tigera Operator install (calico-system namespace, k8s-app=calico-node label)
- Kubernetes NetworkPolicy docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- BusyBox wget option behavior (Alpine image)

## Issues Found

1. **Step 1 — incorrect label selector for Tigera Operator install.** The post used `kubectl get pods -n calico-system -l app=calico-node`. With the Tigera Operator install, the calico-node DaemonSet labels its pods with `k8s-app: calico-node`, not `app: calico-node`. Fixed to `-l k8s-app=calico-node` and clarified that this namespace applies to Tigera Operator-based installs.

2. **Step 6 — non-recommended apiVersion for GlobalNetworkPolicy.** The post used `apiVersion: crd.projectcalico.org/v1`. While the underlying CRD exists at that group/version, the Calico-documented apiVersion for applying GlobalNetworkPolicy resources (via `kubectl` or `calicoctl`) is `projectcalico.org/v3`. Updated to `projectcalico.org/v3`.

3. **Step 7 — connection-refused vs timeout symptoms reversed.** The post said: `# If blocked: "Connection refused" (policy) or "timeout" (no route)`. NetworkPolicy denies cause silent packet drops, which present to the client as a timeout. "Connection refused" indicates no process is listening on the port (TCP RST). Fixed the comment to: `# If blocked: "timeout" (policy silently dropping packets) or "Connection refused" (no listener on the port)`.

## Review Notes
- The iptables chain naming convention (`cali-fw-<ENDPOINT_ID>` for from-workload, with `cali-tw-` for to-workload) is correct. Mentioning `cali-tw-` could help readers diagnose ingress vs egress drops, but this is an enhancement, not a correctness issue.
- `calicoctl get ... --all-namespaces` is supported (also as `-A`).
- `calicoctl node diags` and `calicoctl node status` are valid subcommands.
- The `wget --timeout=5` long option works on modern BusyBox (Alpine) builds; on older BusyBox, `-T 5` is the safer form.
- On clusters using eBPF dataplane instead of iptables, the iptables-based steps (Step 5) will not show Calico's policy rules — readers using eBPF should use `calico-bpf policy dump` instead. Worth noting in a future revision.
- The post does not cover `Reject` (vs `Deny`) actions which actively send TCP RST and would surface as "Connection refused"; this is an edge case not necessary for the core debugging flow.
