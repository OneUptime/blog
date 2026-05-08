# Validation Summary: Validating Masquerade Traffic to Remote Nodes in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI
- Cilium agent debug CLI (`cilium-dbg`)
- Hubble
- Helm

## Sources Consulted
- Cilium masquerading documentation: https://docs.cilium.io/en/latest/network/concepts/masquerading/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium endpoint debug command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium metrics debug command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html

## Issues Found
- The introduction described remote-node masquerading as affecting pod-to-pod traffic between nodes. Cilium documents `enable-remote-node-masquerade` as affecting endpoint traffic to remote node addresses, not traffic between endpoints on different nodes. Updated the explanation to distinguish pod-to-node traffic from cross-node pod-to-pod traffic.
- The configuration grep was too broad and omitted the specific remote-node masquerade setting and required BPF/IP masquerade settings. Updated it to check `enable-remote-node-masquerade`, `enable-bpf-masquerade`, IPv4/IPv6 masquerade settings, native routing CIDRs, and tunnel mode.
- The DNS connectivity test example used `--test dns-resolution`, which is not a documented test name. Updated it to use `client-egress-to-coredns`, a Cilium connectivity test scenario name.
- The custom workload test only exercised pod-to-pod and service traffic, which does not validate remote-node masquerading. Added a remote-node InternalIP traffic generation loop so the test actually targets remote node addresses.
- The endpoint health commands used `cilium endpoint list` and compared a single agent's local endpoint list against all running pods. Current Cilium docs use `cilium-dbg endpoint list` inside agent pods, and cluster-wide endpoint data should come from `CiliumEndpoint` objects. Updated the examples accordingly and excluded host-network pods from the rough pod count comparison.
- The metrics commands used `cilium metrics list` inside the agent pod. Current Cilium command reference documents this as `cilium-dbg metrics list`. Updated metrics and troubleshooting examples.

## Review Notes
The remote-node InternalIP test generates traffic toward node addresses, but observing the actual SNAT result still requires datapath visibility such as Hubble flows, node-side packet capture, or BPF/NAT map inspection in a real cluster. The local review could not execute Cilium or Kubernetes commands because the CLI tools and a cluster context were not available in this workspace.
