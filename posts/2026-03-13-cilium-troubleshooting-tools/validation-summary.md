# Validation Summary: Cilium Troubleshooting Tools

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Hubble
- Cilium CLI
- cilium-dbg
- cilium-bugtool

## Sources Consulted
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg bpf nat list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_nat_list/
- Cilium `cilium-dbg bpf lb list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list/
- Cilium `cilium-dbg bpf policy list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_list/
- Cilium `cilium-bugtool` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-bugtool/

## Issues Found
- The post used `cilium endpoint list`, `cilium endpoint get`, `cilium policy get`, and `cilium bpf` as current troubleshooting commands. Current Cilium documentation distinguishes the Kubernetes-facing `cilium` CLI from the agent-local `cilium-dbg` CLI, so endpoint and BPF inspection examples were updated to run `cilium-dbg` inside a Cilium agent pod.
- The policy inspection section used `cilium policy get --revision`, but that flag is not present in the current command reference, and `cilium-dbg policy get` is marked deprecated. The section was changed to list configured Cilium/Kubernetes network policy resources with `kubectl get cnp,ccnp,netpol -A` and inspect realized endpoint policy data with `cilium-dbg endpoint get`.
- The BPF map section used `cilium bpf list`, which is not a current documented command. It was changed to `cilium-dbg map list`.
- The conntrack example used `cilium bpf ct list global`, but the current documented syntax is `cilium-dbg bpf ct list [cluster <identifier>]`. The example was changed to `cilium-dbg bpf ct list`.
- The endpoint-specific policy map command used `cilium bpf policy get <endpoint-id>`, but the current command reference documents `cilium-dbg bpf policy list` for dumping policy maps. The example was updated accordingly.
- The bugtool copy and extraction commands assumed a `.tar.gz` archive, but `cilium-bugtool` defaults to a tar archive. The commands were corrected to copy `*.tar` and extract with `tar xvf`.

## Review Notes
The guide is technically relevant and remains a valid troubleshooting workflow after the command corrections. Future revisions could add version-specific notes because Cilium command surfaces differ between the external `cilium` CLI and the agent-local debug tooling.
