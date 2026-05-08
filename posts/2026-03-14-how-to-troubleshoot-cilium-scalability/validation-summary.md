# Validation Summary: How to Troubleshoot Cilium Scalability

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Helm
- kubectl
- Prometheus and Grafana

## Sources Consulted
- Cilium command reference: https://docs.cilium.io/en/latest/cmdref/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/

## Issues Found
- The prerequisites used a fixed Kubernetes minimum version (`v1.21+`) for a broad `Cilium v1.14+` range. Current Cilium documentation publishes compatibility by Cilium release, so I changed this to require a Kubernetes version supported by the installed Cilium release.
- Several agent-local diagnostic commands used the local `cilium` CLI form (`cilium identity list`, `cilium metrics list`, `cilium bpf lb list`, `cilium policy get`, and `cilium endpoint list`). Current Cilium documentation exposes these diagnostics as `cilium-dbg` commands executed in the Cilium agent context, so I changed those examples to run `cilium-dbg` through `kubectl exec ds/cilium`.
- The Helm example used `labels.exclude`, which is not the documented Helm value for Cilium identity-relevant label tuning. I changed it to the documented `labels` Helm value with an inclusion example from the official identity-relevant labels documentation.
- The troubleshooting section stated a fixed Linux kernel minimum of 4.19. Current Cilium documentation lists the kernel requirement by release and currently recommends Linux 5.10 or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel, so I changed the text to refer to the minimum for the user's Cilium release.
- Some log examples omitted `-c cilium-agent` in contexts where a Cilium pod may contain multiple containers. I added the explicit container selector for consistency with the rest of the post.
- The inter-node health command used `cilium health status`, which is documented as `cilium-health status`. I updated the command to run `cilium-health status` from the Cilium DaemonSet.

## Review Notes
The post is technically relevant and usable after the corrections. The identity-relevant labels example is intentionally conservative but still requires production review before use because narrowing identity labels can affect policy selector behavior.
