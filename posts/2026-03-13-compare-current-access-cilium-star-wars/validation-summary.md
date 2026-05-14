# Validation Summary: Comparing Default Access Models Across Kubernetes CNI Plugins

## Status
validated

## Post Type
Technical comparison / guide

## Technologies Covered
- Kubernetes NetworkPolicy
- CNI plugins
- Flannel
- Calico
- Weave Net
- Cilium
- Hubble
- eBPF
- Envoy

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes Weave Net NetworkPolicy provider documentation: https://kubernetes.io/docs/tasks/administer-cluster/network-policy-provider/weave-network-policy/
- Flannel network policy controller documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/netpol.md
- Flannel project README: https://github.com/flannel-io/flannel
- Calico NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico application-layer policy for Istio documentation: https://docs.tigera.io/calico/latest/network-policy/istio/app-layer-policy
- Cilium Kubernetes network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy.html
- Cilium Envoy proxy documentation: https://docs.cilium.io/en/stable/security/network/proxy/envoy/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/

## Issues Found
- Flannel was described as having no policy support at all. Current Flannel documentation says Flannel can be deployed with the `kube-network-policies` controller via Helm, so the post now distinguishes base Flannel from Flannel with the optional policy controller.
- The post described Cilium L7 support as "Native eBPF" and "native L7 enforcement." Cilium uses eBPF for datapath redirection and an integrated Envoy proxy for L7 policy enforcement, so the wording was corrected.
- Calico L7 policy was described as requiring an Envoy sidecar or DaemonSet. Current Calico Open Source docs describe Istio/Envoy integration with Calico's Dikastes sidecar for application-layer policy, so the wording was corrected.
- The Hubble command sequence omitted the local Hubble Relay access step. The example now uses `hubble observe -P`, which matches Cilium's documented automatic port-forward option.
- The description mentioned "built-in default-deny" models, which conflicted with the post's main point that the compared CNIs are permissive by default. It now describes the comparison as ranging from simple connectivity to rich policy enforcement.

## Review Notes
The local environment did not have `kubectl`, `cilium`, or `hubble` installed, so CLI flags and commands were verified against official documentation rather than local `--help` output. The example files `sw_l3_l4_policy.yaml` and `sw_l3_l4_l7_policy.yaml` are referenced by name but are not included in this post, so their contents could not be validated here.
