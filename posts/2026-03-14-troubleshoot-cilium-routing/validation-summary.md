# Validation Summary: Troubleshooting Cilium Routing

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- eBPF/BPF datapath tooling
- Linux networking

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium BPF debugging documentation: https://docs.cilium.io/en/stable/reference-guides/bpf/debug_and_test/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The Cilium pod listing used `app.kubernetes.io/part-of=cilium`, while Cilium's troubleshooting documentation uses the stable `k8s-app=cilium` label for agent pods. Changed the command to `kubectl get pods -n kube-system -l k8s-app=cilium -o wide`.
- The Cilium operator log command used `app.kubernetes.io/name=cilium-operator`, while Cilium's tooling defaults to the `io.cilium/app=operator` selector for operator pods. Updated the log command to use that selector.
- Several commands executed inside Cilium agent pods used `cilium` for agent-local datapath operations. Current Cilium documentation uses `cilium-dbg` for local agent status, BPF, monitor, endpoint, and metrics commands. Updated those examples to `cilium-dbg`.
- The Kubernetes service connectivity test used plain HTTP against port 443. Changed it to `curl -k https://kubernetes.default.svc:443` so the command tests the HTTPS API service endpoint correctly.
- The endpoint health verification used `cilium endpoint list`, which is an agent-local command in current Cilium tooling. Changed it to run `cilium-dbg endpoint list` inside the Cilium DaemonSet.
- The troubleshooting note for full BPF maps used the older `cilium bpf ct list global` form. Updated it to `cilium-dbg bpf ct list | wc -l` to match current command reference.
- The troubleshooting note for BPF program inspection used `cilium bpf prog list`, which is not present in current Cilium command references. Updated it to recommend `bpftool prog`, consistent with Cilium's BPF debugging documentation.

## Review Notes
- The guide remains version-neutral. Cilium command availability can vary by release, but the revised commands align with the current stable Cilium documentation as of the validation date.
