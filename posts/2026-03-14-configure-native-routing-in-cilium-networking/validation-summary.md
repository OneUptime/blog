# Validation Summary: Configuring Native Routing in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Cilium CLI
- Linux native routing and eBPF datapath configuration

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium 1.16.5 Helm values: https://raw.githubusercontent.com/cilium/cilium/v1.16.5/install/kubernetes/cilium/values.yaml
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium connectivity test documentation: https://docs.cilium.io/en/stable/contributing/testing/e2e.html
- Cilium `cilium-dbg bpf config list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_config_list.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Kubernetes workload and Service API conventions: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ and https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The native routing explanation said Cilium directly programs routes into the Linux kernel routing table. Cilium native routing delegates non-local endpoint traffic to the Linux routing subsystem, while route programming depends on the deployment model. Updated the wording to say it uses the Linux kernel routing table.
- The Helm values included `tunnel: disabled` alongside `routingMode: native`. For Cilium 1.16.5, the official chart uses `routingMode` and `tunnelProtocol`; `tunnel` is not present in the official 1.16.5 values. Removed the obsolete value and kept `routingMode: native`.
- The `autoDirectNodeRoutes` comment implied routes are always added to all other nodes. Official Cilium documentation scopes this to nodes sharing a common L2 network. Updated the comment accordingly.
- The Helm command referenced `cilium-values.yaml`, but the example file was named `cilium-native-routing-values.yaml`. Updated the command to use the matching filename.
- The BPF configuration command used `cilium bpf config list`, but the documented in-pod debug command is `cilium-dbg bpf config list`. Updated the command.
- The connectivity test command used a comma-separated `--test pod-to-pod,pod-to-service` selector. Official examples use one `--test` flag per selected test. Updated the command to repeat `--test`.
- The endpoint command used `cilium endpoint list`, which is not part of the current Cilium CLI command set. Updated it to execute the documented `cilium-dbg endpoint list` command in a Cilium pod.

## Review Notes
The guide assumes Cilium 1.16.5. The core values are valid for that chart version, but operators should still confirm that `ipv4NativeRoutingCIDR`, `ipam.operator.clusterPoolIPv4PodCIDRList`, and `autoDirectNodeRoutes` match their real cluster CIDRs and L2/routing topology before applying them.
