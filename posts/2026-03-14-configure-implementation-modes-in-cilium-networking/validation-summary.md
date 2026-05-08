# Validation Summary: Configuring Implementation Modes in Cilium Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- VXLAN
- Geneve
- Native routing
- kubectl

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.16.5 Helm values: https://raw.githubusercontent.com/cilium/cilium/v1.16.5/install/kubernetes/cilium/values.yaml
- Cilium CLI `cilium config view` reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium CLI `cilium connectivity test` reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg bpf config list` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_config_list/
- Cilium `cilium-dbg endpoint list` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The Helm values used the obsolete `tunnel` key. Updated the examples to use `routingMode: tunnel` with `tunnelProtocol: vxlan` or `geneve`, and `routingMode: native` for native routing.
- The native routing example mixed `tunnel: disabled` with `routingMode: tunnel`. Updated it to use `routingMode: native` with `ipv4NativeRoutingCIDR` and `autoDirectNodeRoutes`.
- The MTU Helm value was written as lowercase `mtu`; Cilium v1.16.5 uses `MTU`. Updated the snippet.
- The Helm command referenced `cilium-values.yaml`, but the snippet names the file `cilium-tunnel-mode-values.yaml`. Updated the command to match.
- The BusyBox `wget` test used `--timeout=5`; changed it to the BusyBox-compatible `-T 5`.
- The BPF config and endpoint inspection commands used `cilium` subcommands that are exposed through `cilium-dbg` in current Cilium command references. Updated the commands to run `cilium-dbg` inside a Cilium pod.
- The filtered connectivity test used a comma-separated `--test` value that is not the documented form. Replaced it with the standard `cilium connectivity test` command.

## Review Notes
Cilium v1.16.5 is no longer the newest Cilium release as of 2026-05-08, but the post pins that version explicitly. The corrected Helm values are accurate for v1.16.5 and remain consistent with the current Cilium Helm reference.
