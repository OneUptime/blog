# Validation Summary: How to Set Up Calico eBPF Mode Step by Step

## Status
validated

## Post Type
Tutorial / step-by-step technical guide

## Technologies Covered
- Calico (Tigera Operator, Felix)
- Kubernetes (kubectl, kube-proxy, DaemonSets, ConfigMaps)
- eBPF / BPF data plane (bpftool)
- Linux kernel networking (iptables, iptables-legacy, VXLAN)
- YAML / Kubernetes CRDs (`operator.tigera.io/v1` Installation)

## Sources Consulted
- Calico eBPF install docs: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico enable eBPF guide: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico VXLAN/IPIP overlay docs: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Tigera operator CRD definitions (operator.tigera.io/v1)

## Issues Found
1. **Outdated kernel version requirement.** The post stated Linux kernel 5.3+ was the minimum. Current Calico docs require kernel **5.10+** (or RHEL with backported BPF features at 4.18.0-305+). Updated the description, introduction, prerequisites, Step 1 comment block, and conclusion to reflect 5.10+ as the minimum.
2. **Incorrect kube-proxy mode recommendation.** Step 2 Option B said "set iptables-backend to nftables", which is not a valid kube-proxy configuration field and is not recommended by Calico docs. Changed to "run it in ipvs mode to minimize iptables conflicts", which aligns with community best practice for keeping kube-proxy alongside Calico eBPF.
3. **Incorrect hostPorts claim.** Step 4 commented "hostPorts not supported with eBPF" and set `hostPorts: Disabled`. In Calico v3.20+, hostPorts ARE supported in eBPF mode. Changed to `hostPorts: Enabled` with an accurate comment indicating support.

## Review Notes
- The ConfigMap setup in Step 3 (`kubernetes-services-endpoint` in `tigera-operator` namespace with `KUBERNETES_SERVICE_HOST` / `KUBERNETES_SERVICE_PORT`) matches official Calico docs verbatim.
- The `kubectl patch ds ... nodeSelector: {"non-calico": "true"}` command to disable kube-proxy is the standard pattern documented by Calico.
- The `multiInterfaceMode: None` field is technically valid in the operator CRD but is rarely needed for OSS Calico (it defaults to None). Left as-is since it is not incorrect.
- VXLAN encapsulation is fully supported with eBPF data plane and is in fact the recommended overlay; no fix needed.
- The `iptables-legacy` verification command at the end is reasonable but may produce no output on systems that use nft-based iptables — readers should be aware. Not a technical error, just a caveat.
- The mermaid diagram is a simplified illustration; in reality the eBPF path involves TC hooks and per-interface BPF programs, but the comparison is acceptable for an introductory guide.
