# Validation Summary: Validating Implementation Modes in Cilium Networking

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium agent debug CLI (`cilium-dbg`)
- Hubble
- Kubernetes
- Helm
- YAML

## Sources Consulted
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- CiliumEndpoint documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble overview documentation: https://docs.cilium.io/en/stable/observability/hubble/

## Issues Found
- The post used `cilium endpoint list` for endpoint inspection. Current Cilium documentation exposes endpoint inspection inside Cilium agent pods through `cilium-dbg endpoint list`, while cluster-wide endpoint objects should be inspected with `kubectl get ciliumendpoints --all-namespaces`. Updated the commands accordingly.
- The post described endpoint count as matching running pod count. That can be inaccurate because Cilium creates health endpoints and does not manage `hostNetwork` pods. Updated the language and command to present it as a rough comparison against running non-`hostNetwork` pods.
- The post used `cilium metrics list` from inside Cilium pods. Current Cilium documentation exposes this as `cilium-dbg metrics list`; updated the metrics and troubleshooting commands.
- The post included `cilium connectivity test --test dns-resolution`. The official CLI documents `--test` as a regular-expression matcher over test names/scenarios; `dns-resolution` is not documented as a named category. Updated the example to use `--test dns`.
- The Hubble command assumes Hubble is enabled. Added that prerequisite while keeping the observability section otherwise intact.

## Review Notes
The routing-mode explanation is accurate: Cilium defaults to tunnel routing with VXLAN as the default tunnel protocol, supports Geneve, and supports native routing when the network can route pod CIDRs. The workload YAML uses valid Kubernetes APIs. The anti-affinity rule is preferred rather than required, so it improves cross-node coverage but does not guarantee it on small clusters.
