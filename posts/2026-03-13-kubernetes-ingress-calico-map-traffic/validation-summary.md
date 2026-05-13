# Validation Summary: How to Map Kubernetes Ingress with Calico to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Kubernetes Services and `externalTrafficPolicy`
- Calico NetworkPolicy
- Calico GlobalNetworkPolicy
- Calico Felix
- Calico standard Linux dataplane and eBPF dataplane
- iptables
- calicoctl

## Sources Consulted
- Calico documentation: Tier policy evaluation, https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico documentation: NetworkPolicy resource and rule actions, https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Use log rules to test network policy, https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico documentation: FelixConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: eBPF dataplane behavior, https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Service external traffic policy with Calico, https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico documentation: WorkloadEndpoint resource, https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico documentation: calicoctl get command, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes documentation: Network Policies, https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes documentation: Using Source IP, https://kubernetes.io/docs/tutorials/services/source-ip/

## Issues Found
- The post claimed that GlobalNetworkPolicies are always evaluated before namespace-scoped policies. Updated this to Calico's tier-based model: tiers are evaluated by tier order, then policies by order within each tier; `Allow` and `Deny` are final, and `Pass` continues to the next applicable tier. Also clarified that Kubernetes NetworkPolicies are additive allow policies.
- The scenario 1 sequence implied a fixed GlobalNetworkPolicy-first check. Updated the sequence to describe checking applicable tiers and policies.
- The post described ingress enforcement as happening "at Felix." Updated the wording to state that Felix programs enforcement on the receiving node, which is more precise for iptables and eBPF dataplanes.
- The external traffic section grouped `externalTrafficPolicy: Local` and Calico eBPF mode too broadly. Updated it to distinguish standard Linux dataplane source preservation through `externalTrafficPolicy: Local` from Calico eBPF native service handling.
- The policy logging command patched `policySyncPathPrefix`, which is used for communicating policy changes to external services and does not enable policy decision logging. Replaced it with a Calico `Log` action policy example and a node log watch command.
- The post said `calicoctl get workloadendpoint` shows which policies are applied to a pod. Updated this to say it shows endpoint labels, profiles, and interface details used by policy selectors.

## Review Notes
The Kubernetes NetworkPolicy cross-namespace selector snippet is syntactically valid as a partial rule, assuming it is placed inside a complete `networking.k8s.io/v1` NetworkPolicy. The iptables chain inspection example is dataplane-specific and may vary by Calico version and backend, but the general guidance is valid for standard Linux dataplane troubleshooting.
