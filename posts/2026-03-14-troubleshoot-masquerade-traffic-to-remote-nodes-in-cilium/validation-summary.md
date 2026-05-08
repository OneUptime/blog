# Validation Summary: Troubleshooting Masquerade Traffic to Remote Nodes in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- eBPF/BPF datapath inspection
- Linux networking tools

## Sources Consulted
- Cilium masquerading documentation: https://docs.cilium.io/en/stable/network/concepts/masquerading/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Kubernetes `kubectl debug` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes node debugging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The introduction described remote-node masquerading as pod-to-pod traffic between nodes. Cilium's remote-node masquerade option applies to endpoint traffic directed to remote node addresses, not normal endpoint-to-endpoint traffic between pods on different nodes. Updated the explanation to distinguish these cases and note the BPF masquerading requirement.
- Several in-agent commands used the older `cilium` binary name for local agent debugging commands. Current Cilium documentation uses `cilium-dbg` inside Cilium pods for BPF maps, monitor, endpoints, and metrics. Updated those commands.
- The tunnel map command was labeled as a BPF program status check. Updated the description to say it checks the tunnel endpoint map when running in encapsulation mode.
- The Kubernetes service connectivity check used `http://kubernetes.default.svc:443`, which targets the HTTPS API server port with HTTP. Changed it to `https://kubernetes.default.svc:443` with `curl -k`.
- The endpoint health verification used `cilium endpoint list`, which is not part of the current external Cilium CLI command set. Changed it to run `cilium-dbg endpoint list` inside the Cilium DaemonSet.
- The troubleshooting notes referenced `cilium bpf prog list`, which is not a current documented Cilium CLI command. Replaced it with `bpftool prog show` plus Cilium agent log inspection for verifier or attachment errors.

## Review Notes
The Hubble examples are broadly consistent with Cilium's documented Hubble CLI usage, but exact output and available filters can vary by Cilium/Hubble version and whether Hubble Relay is enabled. The guide intentionally remains version-neutral.
