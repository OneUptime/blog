# Validation Summary: How to Troubleshoot Automatic Adjustment in Cilium configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Helm
- Prometheus and Grafana
- Cilium CLI and cilium-dbg

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html

## Issues Found
- The post described "automatic adjustment" and "self-tuning" behavior as if it were a named Cilium configuration feature. I changed the title, description, introduction, and conclusion to describe Cilium configuration troubleshooting instead.
- Several examples used the external `cilium` Kubernetes CLI for local agent commands that belong to `cilium-dbg`, including identity, metrics, BPF map, policy, and endpoint commands. I updated those examples to run `cilium-dbg` through `kubectl exec` against a Cilium agent pod.
- The Helm example used the invalid value `labels.exclude`. Cilium documents the `labels` Helm value for identity-relevant label patterns, so I replaced it with a valid `--set-string labels=...` example and added a caution about policy labels.
- The operator selector used `name=cilium-operator`, while current Cilium defaults document `io.cilium/app=operator`. I updated the log and health-check examples to use the current selector.
- The troubleshooting section hard-coded Linux kernel 4.19 and a `cilium-init` init container name. Current Cilium system requirements vary by release and document newer kernel baselines, so I changed the guidance to check the kernel required by the installed Cilium release and to inspect the relevant init container.

## Review Notes
The post is technically relevant and now uses the correct split between the `cilium` CLI and agent-local `cilium-dbg` tooling. Operators should still verify label-filter changes in staging because narrowing identity-relevant labels can affect policies that depend on ignored labels.
