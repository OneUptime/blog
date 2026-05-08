# Validation Summary: Configuring Encapsulation in Cilium Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- VXLAN
- Geneve
- Cilium CLI

## Sources Consulted
- Cilium routing and encapsulation documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/stable/cmdref/cilium_connectivity_test/
- Cilium CLI command reference for `cilium config view`: https://docs.cilium.io/en/stable/cmdref/cilium_config_view/
- Cilium debug CLI reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium debug CLI reference for `cilium-dbg bpf config list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_config_list/
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html

## Issues Found
- The Helm values used `tunnel: vxlan`, but current Cilium Helm values use `routingMode: tunnel` and `tunnelProtocol: vxlan`. Updated the snippet to use the documented Helm keys.
- The Helm command referenced `cilium-values.yaml`, while the snippet names the file `cilium-encapsulation-values.yaml`. Updated the command to use the same filename.
- The Helm command pinned Cilium `1.16.5`, which is older than the current stable documentation reviewed. Updated it to `1.19.3`, matching the reviewed stable docs.
- The snippet described `bpf.tproxy: true` as tunnel monitoring. Cilium documents `bpf.tproxy` as eBPF-based TPROXY for Layer 7 policy, not encapsulation or tunnel monitoring. Removed it from the encapsulation configuration.
- The BPF runtime inspection command used `cilium bpf config list`, but current in-agent diagnostics are exposed through `cilium-dbg`. Updated it to `kubectl exec -n kube-system ds/cilium -- cilium-dbg bpf config list`.
- The connectivity test command used a comma-separated `--test pod-to-pod,pod-to-service` value. Cilium documents `--test` as a repeatable regular-expression selector, with scenarios selected using paths such as `/pod-to-pod`. Updated it to `--test /pod-to-pod --test /pod-to-service`.
- The endpoint verification used `cilium endpoint list` as a top-level cluster CLI command. Current documentation exposes endpoint state either through agent-local `cilium-dbg endpoint list` or the Kubernetes `CiliumEndpoint` CRD. Updated the example to use `kubectl get ciliumendpoints --all-namespaces`.

## Review Notes
The local environment did not have `helm` or `cilium` installed, so CLI validation was performed against official Cilium documentation rather than local `--help` output. The Cilium connectivity test examples can still be skipped by Cilium when a cluster does not meet a specific test's prerequisites.
