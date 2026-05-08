# Validation Summary: How to Troubleshoot cilium-agent completion fish

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- kubectl
- Helm
- eBPF
- Fish shell completion
- Prometheus and Grafana

## Sources Consulted
- Cilium command reference for `cilium-agent completion fish`: https://docs.cilium.io/en/stable/cmdref/cilium-agent_completion_fish/
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium command reference for `cilium-dbg` commands: https://docs.cilium.io/en/stable/cmdref/
- Cilium command reference for `cilium-health status`: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium system requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/

## Issues Found
- Several commands used the Kubernetes-facing `cilium` CLI for local agent operations that are documented under `cilium-dbg`, such as identity, policy, endpoint, BPF, and metrics inspection. Updated those examples to run `cilium-dbg` inside the Cilium DaemonSet with `kubectl exec`.
- `cilium health status` is not the documented command for node health checks. Updated it to run `cilium-health status` inside a Cilium pod.
- The operator label selector `name=cilium-operator` did not match the selector used in current Cilium CLI/sysdump defaults. Updated it to `io.cilium/app=operator`.
- The Helm value `labels.exclude` is not the documented identity label configuration format. Updated the example to use the documented `labels` value with exclusion patterns.
- The troubleshooting note cited a fixed kernel minimum of 4.19. Current Cilium system requirements are version-specific and currently document Linux kernel 5.10 or equivalent, such as 4.18 on RHEL 8.10. Updated the text to refer to the minimum required for the deployed Cilium version.
- The init container log example used `cilium-init`, which is not the current Cilium init container name in standard Helm deployments. Updated it to `config`.

## Review Notes
The post title and introduction mention Fish shell completion, but most of the body is a general Cilium agent troubleshooting guide. The `cilium-agent completion fish` command itself is valid according to the official command reference, but future revisions should align the article scope more closely with the title.
