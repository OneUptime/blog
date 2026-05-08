# Validation Summary: Configuring Network Requirements for Cilium

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Hubble
- Cilium CLI
- cilium-dbg CLI
- VXLAN, Geneve, and native routing

## Sources Consulted
- Cilium 1.16.5 Helm chart values from the official Cilium Helm repository: https://helm.cilium.io/cilium-1.16.5.tgz
- Cilium 1.16 system requirements: https://raw.githubusercontent.com/cilium/cilium/v1.16.5/Documentation/operations/system_requirements.rst
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- cilium-dbg BPF config command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_config/
- cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/

## Issues Found
- The introduction said all modes require TCP port 4244 for Hubble. Cilium only needs Hubble ports when Hubble is enabled, and the official port list distinguishes the Hubble server on TCP 4244 from Hubble Relay on TCP 4245. Updated the wording.
- The configuration comments called TCP 4244 the Hubble Relay port. Updated the comments to list TCP 4244 for the Hubble server and TCP 4245 for Hubble Relay.
- The Helm values used `tunnel: vxlan`, which is not a valid Cilium 1.16.5 chart value. Replaced it with `routingMode: tunnel` and `tunnelProtocol: vxlan`.
- The `healthPort` comment described it as the health checking port. In the official chart values, `healthPort` is the Cilium agent health status API port and is not the cilium-health TCP 4240 port. Updated the comment.
- The Helm command referenced `cilium-values.yaml`, but the snippet filename was `cilium-network-requirements.yaml`. Updated the command to use the shown file.
- The validation command used local `ss`, which would check the machine running the command rather than necessarily checking Kubernetes nodes. Replaced it with `cilium config view` to verify the active Cilium routing settings through the Cilium CLI.
- The BusyBox `wget` example used the long `--timeout` option. Replaced it with the common BusyBox-compatible `-T 5` option.
- The BPF configuration command used `cilium bpf config list`. Official current command references use `cilium-dbg bpf config list`, so the command was updated.
- The Cilium connectivity test passed `pod-to-pod,pod-to-service` as a single test regex. The CLI accepts repeatable `--test` values, so this was changed to two `--test` flags.
- The endpoint listing command used `cilium endpoint list`, which is an agent debug command rather than a top-level Cilium Kubernetes CLI command. Updated it to run `cilium-dbg endpoint list` inside the Cilium DaemonSet.

## Review Notes
The post now matches Cilium 1.16.5 Helm values and current official command references for the reviewed examples. Future updates should consider whether to move the Helm version from 1.16.5 to a currently supported Cilium release before publication.
