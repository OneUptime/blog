# Validation Summary: Validate a New Cilium Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Cilium CLI
- Kubernetes
- Kubernetes NetworkPolicy
- eBPF networking

## Sources Consulted
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium debug CLI command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium debug endpoint command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium debug node command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_node_list/
- Cilium troubleshooting documentation for node-to-node connectivity and tunnel map checks: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post used `kubectl exec ... -- cilium status --verbose` inside the Cilium DaemonSet. Current Cilium agent pods expose the local agent debug CLI as `cilium-dbg`, so this was changed to `cilium-dbg status --verbose`.
- The post used `cilium endpoint list` and `cilium bpf tunnel list` inside the Cilium DaemonSet. These local agent inspection commands are documented under `cilium-dbg`, so they were changed to `cilium-dbg endpoint list` and `cilium-dbg bpf tunnel list`.
- The tunnel-map check was described as generally validating node routes. Cilium's troubleshooting docs scope `cilium-dbg bpf tunnel list` to encapsulation mode, so the comment was narrowed to that case.
- The post used `cilium node list` to verify node-to-node health probes. The documented health-probe command is `cilium-health status --verbose`, so the command was updated.
- The post used `cilium connectivity test --cleanup-on-completion`, which is not a documented current flag. It was replaced with `cilium connectivity test --cleanup`, the documented command for cleaning up connectivity test artifacts without rerunning tests.
- The NetworkPolicy YAML was syntactically valid and consistent with Kubernetes default-deny ingress and egress policy examples. The follow-up endpoint inspection command was updated to use `cilium-dbg endpoint list`.

## Review Notes
- The deny-all NetworkPolicy example is technically valid, but applying it in the `default` namespace can disrupt existing workloads. In a future revision, consider using a dedicated test namespace or relying on the built-in Cilium connectivity test policy scenarios.
