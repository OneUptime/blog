# Validation Summary: Troubleshooting Cilium Networking Architecture

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- eBPF/BPF
- kubectl
- bpftool

## Sources Consulted
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium cilium-dbg monitor command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium cilium-dbg BPF CT list command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium policy verdict documentation: https://docs.cilium.io/en/stable/security/policy-creation/
- Cilium BPF debugging and bpftool documentation: https://docs.cilium.io/en/stable/reference-guides/bpf/debug_and_test/
- Kubernetes kubectl debug documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The Cilium operator log selector used `app.kubernetes.io/name=cilium-operator`, while Cilium CLI and sysdump defaults target operator pods with `io.cilium/app=operator`. Updated the selector to match the documented default.
- Several commands executed inside Cilium agent pods used `cilium` for local agent debugging. Current Cilium documentation uses `cilium-dbg` for local agent commands such as `monitor`, `endpoint list`, `metrics list`, and `bpf ct list`. Updated those commands.
- The BPF program inspection example used `cilium bpf tunnel list`, which is not a current command for listing loaded BPF programs. Replaced it with `bpftool prog`, which Cilium documents for BPF program introspection.
- The endpoint health verification used `cilium endpoint list` from the local Cilium CLI, but endpoint inspection is a `cilium-dbg` agent command. Updated it to execute `cilium-dbg endpoint list` inside the Cilium DaemonSet.
- The policy-verdict Hubble example used a less accurate filter form. Updated it to the documented `hubble observe flows --type policy-verdict --last 20` pattern.
- The BPF map troubleshooting note referenced `cilium bpf ct list global` and a generic conntrack table size setting. Updated it to `cilium-dbg bpf ct list` and the documented Helm/config keys `bpf-ct-global-any-max` and `bpf-ct-global-tcp-max`.
- The performance troubleshooting note referenced a non-current `cilium bpf prog list` command and claimed it shows complexity. Updated it to use `bpftool prog`, which reports loaded programs and translated/JIT-compiled sizes.

## Review Notes
The post is version-neutral, so commands were checked against current Cilium stable/latest documentation as of 2026-05-08. Some examples, such as `kubectl exec -n kube-system ds/cilium`, are acceptable for simple clusters but may only inspect endpoints or flows local to the selected Cilium agent pod in multi-node clusters.
