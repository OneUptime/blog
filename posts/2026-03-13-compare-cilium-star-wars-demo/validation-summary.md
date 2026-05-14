# Validation Summary: Comparing the Cilium Star Wars Demo to Other CNI Policy Models

## Status
validated

## Post Type
Technical comparison / guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Cilium and CiliumNetworkPolicy
- Cilium Star Wars demo
- eBPF
- Envoy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico Enterprise application layer policy
- Flannel

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Cilium Star Wars demo documentation: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7.html
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium security identities documentation: https://docs.cilium.io/en/stable/internals/security-identities/
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Enterprise application layer policy documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/application-layer-policies/alp
- Calico eBPF dataplane documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Flannel project documentation: https://github.com/flannel-io/flannel

## Issues Found
- The post described Cilium L7 enforcement as happening directly in an eBPF program at the TC hook and as "native in-kernel." This was incorrect. Cilium uses eBPF for the datapath and redirects L7 policy traffic to a Cilium-managed Envoy proxy. Updated the wording and performance table accordingly.
- The post described Cilium's policy model as "pure label identity." Cilium derives security identities from labels, but it also supports CIDR/IP-based policy constructs. Updated the comparison matrix to avoid overstating the model.
- The Calico L7 discussion implied a simple, universal sidecar model. Calico application-layer policy is an optional Calico Enterprise feature and uses an L7 proxy model, including sidecar injection for opted-in workloads in sidecar mode. Updated the text and table to reflect that caveat.
- The Calico section title referred only to GlobalNetworkPolicy while the YAML example used a namespaced Calico NetworkPolicy. Updated the heading to cover both.
- The performance comparison made unsupported absolute claims such as Cilium having the "Lowest" latency for L7 because enforcement was "native in-kernel." Reworded the table to distinguish L3/L4 dataplane overhead from L7 proxy processing.
- The conclusion overstated that Cilium enforces identity "natively in the kernel" and extends to L7 without architectural complexity. Updated it to accurately describe label-derived identities, the eBPF datapath, and no application sidecars for L7.

## Review Notes
The Kubernetes NetworkPolicy, Calico NetworkPolicy, and CiliumNetworkPolicy YAML examples are syntactically consistent with the documented APIs. A future revision could add a separate Calico GlobalNetworkPolicy example if the author wants to emphasize cluster-wide policy.
