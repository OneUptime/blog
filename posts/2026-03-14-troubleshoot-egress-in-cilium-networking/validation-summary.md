# Validation Summary: Troubleshooting Egress in Cilium Networking

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Cilium egress gateway
- Cilium network policy
- Hubble
- Kubernetes
- eBPF/BPF debugging
- Linux networking

## Sources Consulted
- Cilium Egress Gateway documentation: https://docs.cilium.io/en/stable/network/egress-gateway/egress-gateway/
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium-dbg bpf egress list` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_egress_list/
- Cilium `cilium-dbg monitor` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `cilium-dbg metrics list` reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium connectivity test` reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The post used in-agent commands such as `cilium bpf tunnel list`, `cilium monitor`, `cilium endpoint list`, and `cilium metrics list`. Current Cilium documentation exposes these daemon/debug operations through `cilium-dbg`, so these commands were updated to `cilium-dbg` equivalents.
- The BPF tunnel command was not an appropriate current egress troubleshooting command. It was replaced with `cilium-dbg bpf egress list`, which lists egress policy entries.
- The pod-to-service connectivity test used plain HTTP against port 443. It was changed to HTTPS against the Kubernetes service version endpoint.
- The external connectivity test used `http://1.1.1.1`, which is less reliable as an HTTP endpoint. It was changed to `https://example.com`.
- The verification command used `cilium endpoint list` outside the agent pod. It was changed to run `cilium-dbg endpoint list` inside a Cilium agent pod.
- Troubleshooting notes referenced outdated or unavailable Cilium BPF commands, including `cilium bpf ct list global` and `cilium bpf prog list`. These were corrected to current `cilium-dbg bpf ct list` usage and `bpftool prog show` for loaded BPF programs.
- The cleanup comment could lead readers to delete the diagnostic pod before running the following Hubble examples. It now clarifies that cleanup should happen after any Hubble checks.

## Review Notes
The Hubble commands and high-level egress gateway explanation matched official Cilium documentation. The post remains version-neutral, so the fixes align it with current stable Cilium documentation without adding version-specific requirements.
