# Validation Summary: How to Validate Kube-Proxy Replacement with Calico eBPF

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico eBPF dataplane
- Kubernetes Services and kube-proxy
- FelixConfiguration and Tigera Operator Installation resources
- iptables service chains
- Direct Server Return (DSR)

## Sources Consulted
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Troubleshoot eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Calico documentation: calicoctl patch, https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Kubernetes documentation: kubectl exec, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes documentation: kubectl patch, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes documentation: DaemonSet, https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/

## Issues Found
- The prerequisites listed Linux kernel 5.3+ and 5.8+ for full features. Current Calico documentation requires kernel 5.10+ for the eBPF dataplane, with RHEL 4.18.0-305+ as the supported exception, and recommends kernel 6.6+ for all current eBPF features. Updated the prerequisite.
- The post did not mention that Calico must reach the Kubernetes API server directly before kube-proxy is disabled. Added this prerequisite because Calico cannot rely on the Kubernetes service IP after replacing kube-proxy.
- The post did not mention the IPVS migration requirement. Added the official caveat to switch kube-proxy from IPVS to iptables mode and restart nodes before enabling eBPF.
- The eBPF enablement command only covered manifest-based installs. Added the current operator-based `Installation` patch and kept the Felix `bpfEnabled` patch as the manifest-based alternative.
- The `calicoctl patch` examples used `--type merge`, but the official `calicoctl patch` reference documents strategic merge as the default and JSON merge patch as not implemented. Removed `--type merge` from the `calicoctl` examples.
- The validation command checked all `KUBE` strings in the nat table, which is broader than kube-proxy service routing chains. Narrowed the check to kube-proxy service chains such as `KUBE-SERVICES`, `KUBE-SVC`, `KUBE-SEP`, and `KUBE-NODEPORTS`.
- The BPF NAT dump command used `calico-node -bpf-nat-dump`, which does not match the documented Calico command. Replaced it with `calico-node -bpf nat dump` run from a named `calico-node` pod.
- The DSR explanation described LoadBalancer services too narrowly and implied the backend pod directly replies using the load balancer node path. Updated the wording to match Calico's external service DSR behavior and network requirements.
- The Mermaid diagram said `O1` instead of `O(1)`. Corrected the notation.

## Review Notes
The post is now technically valid as a concise validation guide. Future improvements could add distribution-specific examples for creating the `kubernetes-service-endpoint` ConfigMap or using operator `kubeProxyManagement`, but that would be additional detail rather than a required correction.
