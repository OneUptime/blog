# Validation Summary: How to Troubleshoot cilium-agent completion powershell

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- cilium CLI
- cilium-dbg
- cilium-health
- Kubernetes
- Helm
- eBPF

## Sources Consulted
- Cilium cilium-agent completion powershell command reference: https://docs.cilium.io/en/stable/cmdref/cilium-agent_completion_powershell/
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium cilium-dbg identity list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium cilium-dbg endpoint list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium cilium-dbg endpoint get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium cilium-dbg bpf policy get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_get/
- Cilium cilium-dbg bpf lb list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list/
- Cilium cilium-health status command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/

## Issues Found
- The post title, description, introduction, and conclusion described PowerShell completion, but the body was a cilium-agent troubleshooting guide. I corrected the visible post topic to cilium-agent troubleshooting so the technical content matches the guide.
- Several examples used daemon-local commands as top-level `cilium` CLI commands, including `cilium identity list`, `cilium metrics list`, `cilium bpf lb list`, `cilium policy get`, and `cilium endpoint list/get`. Current Cilium command references expose daemon-local commands through `cilium-dbg`, and `cilium-dbg policy get` is now deprecated, so I updated the examples to use `cilium-dbg` inside a Cilium agent pod, Kubernetes policy-resource checks, and `cilium-dbg bpf policy get --all` for local policy maps.
- The post used `cilium health status`, which is not the documented current health client command. I replaced it with `cilium-health status --verbose` executed inside a Cilium agent pod.
- The post used `cilium bpf tunnel list`, which is not present in the current Cilium command reference. I replaced the tunnel check with the documented `cilium-health status --verbose` inter-node health check.
- The operator log and pod examples used the selector `name=cilium-operator`. Current Cilium CLI defaults use `io.cilium/app=operator`, so I updated the selector.
- The Helm label exclusion example used `labels.exclude`, which is not the documented Cilium Helm value. Cilium documents identity-relevant label patterns through the `labels` value, so I changed it to `--set 'labels=!pod-template-hash !controller-revision-hash'`.
- The troubleshooting section stated that Cilium requires kernel 4.19 or later. Current Cilium system requirements are release-specific and list Linux kernel >= 5.10 or an equivalent distribution kernel for the current stable release, so I changed the text to reference the minimum for the installed Cilium release.
- The endpoint-count verification implied a cluster-wide count but queried one agent. I clarified that the example counts endpoints on the selected Cilium agent.

## Review Notes
- The guide now validates as a Cilium agent troubleshooting guide, not a PowerShell completion tutorial.
- `kubectl exec -n kube-system ds/cilium ...` inspects one selected Cilium agent pod. For node-specific issues, run the same `cilium-dbg` or `cilium-health` command against the Cilium pod on the affected node.
