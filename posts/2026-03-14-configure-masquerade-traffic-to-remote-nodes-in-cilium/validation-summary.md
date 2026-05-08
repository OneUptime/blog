# Validation Summary: Configuring Masquerade Traffic to Remote Nodes in Cilium

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF masquerading
- VXLAN overlay networking

## Sources Consulted
- Cilium Masquerading documentation: https://docs.cilium.io/en/stable/network/concepts/masquerading/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium upgrade guide for the `enable-remote-node-masquerade` option: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium CLI `connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg bpf config list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_config_list/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/generated/

## Issues Found
- The introduction incorrectly described remote node masquerading as pod-to-pod traffic between remote nodes. Updated it to state that Cilium's remote node masquerade option affects endpoint traffic destined to remote node addresses, not pod-to-pod endpoint traffic.
- The Helm values used the old `tunnel: vxlan` setting and did not include the actual remote node masquerade configuration. Replaced it with `routingMode: tunnel`, `tunnelProtocol: vxlan`, `bpf.masquerade: true`, and `extraConfig.enable-remote-node-masquerade: "true"`.
- The example used Cilium chart version `1.16.5`, but `enable-remote-node-masquerade` was introduced later. Updated the Helm command to use Cilium `1.19.3`.
- The Helm command referenced `cilium-values.yaml` even though the snippet was named `cilium-remote-masquerade-values.yaml`. Updated the command to use the matching filename.
- The BPF configuration command used `cilium bpf config list`, but BPF debug commands are exposed by `cilium-dbg` inside the Cilium agent pod. Updated the command to `kubectl exec -n kube-system ds/cilium -- cilium-dbg bpf config list`.
- The endpoint health command used `cilium endpoint list`, which is not part of the Kubernetes-facing Cilium CLI. Updated it to run `cilium-dbg endpoint list` inside the Cilium DaemonSet.

## Review Notes
The test workload verifies general service connectivity after the configuration change, but it does not directly prove that endpoint-to-remote-node-address traffic is being SNATed. A future improvement could add a targeted packet capture or Hubble flow check for traffic from a pod to a remote node InternalIP.
