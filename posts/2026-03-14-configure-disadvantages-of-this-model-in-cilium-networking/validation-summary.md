# Validation Summary: Configuring Disadvantages of Native Routing in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Cilium CLI
- Cilium native routing
- Cilium cluster-pool IPAM

## Sources Consulted
- Cilium routing concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium cluster-pool IPAM documentation: https://docs.cilium.io/en/latest/network/concepts/ipam/cluster-pool/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI `config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium CLI `status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg bpf config list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_config_list.html
- Cilium `cilium-dbg endpoint list` and endpoint CRD documentation: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html and https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html

## Issues Found
- The Helm values did not actually enable native routing. Added `routingMode: native` and `ipv4NativeRoutingCIDR: "10.42.0.0/16"` because Cilium documents both as required native routing configuration.
- The IPAM example used `ipam.operator.clusterPoolIPv4PodCIDRList` without making the cluster-pool mode explicit. Added `ipam.mode: cluster-pool` so the operator pool setting applies clearly.
- The `autoDirectNodeRoutes` comment implied routes are always auto-created between nodes. Updated the comment to clarify that this applies when nodes share a single L2 network.
- The health checking comment described route validation. Changed it to Cilium connectivity health checking, matching the Helm value's documented behavior.
- The overlay fallback used `tunnel: vxlan`, which is not the current Helm value name. Replaced it with `routingMode: tunnel` and `tunnelProtocol: vxlan`.
- The Helm command referenced `cilium-values.yaml` even though the snippet filename was `cilium-native-routing-mitigations.yaml`. Updated the command to use the same file.
- The route validation command checked `proto bird`, which is associated with BIRD-based routing rather than Cilium's configuration. Replaced it with `cilium config view` filtered for the relevant Cilium settings.
- The BPF config command used `cilium bpf config list`; current Cilium command documentation uses `cilium-dbg bpf config list`. Updated the command accordingly.
- The connectivity test passed a comma-separated test selector. Replaced it with repeated `--test` flags, matching the documented `--test strings` option.
- The endpoint check used `cilium endpoint list`, which is an agent debug command in current documentation. Replaced it with `kubectl get ciliumendpoints --all-namespaces`, which is documented for cluster-wide endpoint inspection.

## Review Notes
The guide still has awkward phrasing around "configuring disadvantages," but that is editorial rather than technical. The Cilium version in the Helm command is fixed at 1.16.5; future updates should re-check chart value names and CLI command names against the target Cilium version.
