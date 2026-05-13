# Validation Summary: Explaining Current Access in the Cilium Star Wars Demo

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes networking
- Kubernetes Services and DNS
- Kubernetes NetworkPolicy
- Cilium
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- eBPF service load balancing and policy enforcement

## Sources Consulted
- Kubernetes Services, Load Balancing, and Networking: https://kubernetes.io/docs/concepts/services-networking/
- Kubernetes Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Cilium Star Wars demo: https://docs.cilium.io/en/stable/gettingstarted/demo/
- Cilium Policy Enforcement: https://docs.cilium.io/en/stable/security/network/policyenforcement/
- Cilium Policy Enforcement Modes: https://docs.cilium.io/en/latest/security/policy/intro/
- Cilium Kubernetes networking introduction: https://docs.cilium.io/en/stable/network/kubernetes/intro/
- Cilium Kubernetes without kube-proxy: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium command reference, cilium-dbg endpoint list: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference, cilium-dbg bpf policy get: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/
- Cilium command reference, cilium-dbg monitor: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/policy/language/

## Issues Found
- The post used `cilium policy get`, which is documented as deprecated in current Cilium command reference. I changed the default policy check to use `kubectl get networkpolicy,ciliumnetworkpolicy,ciliumclusterwidenetworkpolicy -A`.
- The post used `cilium` for agent debug commands inside the Cilium DaemonSet. Current Cilium documentation uses `cilium-dbg` for these commands, so I updated the BPF policy, endpoint list, and monitor examples.
- The post said BPF policy maps "should show allow-all without policies." That wording was too specific for a low-level map inspection, so I changed the command comment to simply say it checks BPF policy maps.
- The post described per-endpoint policy enforcement as "`disabled` or `default-allow` policy enforcement mode." Cilium documents `default`, `always`, and `never` as policy enforcement modes, with default mode leaving endpoints unrestricted until selected by policy. I updated the explanation to match that model.
- The post checked endpoint policy mode by grepping for `policy-enforcement`, which is not supported by the documented `cilium-dbg endpoint list` output. I changed it to display the endpoint list directly.
- The post referred only to `NetworkPolicy` and `CiliumNetworkPolicy` in several places. I added `CiliumClusterwideNetworkPolicy` where the claim was about all policy resources that could affect default access.
- The DNS section described Cilium creating "identity-aware DNS policies." I changed this to "DNS-aware policy and FQDN-based egress policy" to match Cilium's documented DNS and `toFQDNs` policy behavior.

## Review Notes
The main technical explanation is correct: Kubernetes pods are non-isolated by default, normal Service DNS names resolve to ClusterIPs, the Star Wars demo intentionally starts with both `xwing` and `tiefighter` able to reach `deathstar`, and Cilium default policy enforcement allows unrestricted endpoint traffic until policies select endpoints. The diagnostic commands assume a current Cilium installation where `cilium-dbg` is present in the Cilium agent container.
