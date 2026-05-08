# Validation Summary: How to Configure Solution in Cilium configuration

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Hubble
- Prometheus and Grafana
- eBPF

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium CLI command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting.html
- Cilium command cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui.html

## Issues Found
- The Helm value for label exclusion used `labels.exclude`, which is not the current Cilium chart format. Changed it to the documented `labels` string syntax with exclusion patterns.
- The advanced BPF snippet used `bpf.ctTcpTimeout` and `bpf.ctAnyTimeout`, which are not current Cilium Helm chart values. Replaced them with supported connection-tracking map sizing values, `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The identity garbage collection value was shown as top-level `identityGCInterval`. Changed it to the documented `operator.identityGCInterval`.
- The verification command used `cilium health status`, but the documented health client command is `cilium-health status`. Updated the command.
- Several troubleshooting examples used agent-side commands through the host `cilium` CLI, such as `cilium endpoint list`, `cilium policy get`, `cilium bpf tunnel list`, and `cilium metrics list`. Updated these to run `cilium-dbg` through the Cilium DaemonSet with `kubectl exec`.
- The troubleshooting note referenced a fixed `cilium-init` init container and Linux kernel 4.19. Updated it to instruct readers to inspect actual init container names and to follow Cilium's current kernel requirements.
- The ServiceMonitor example assumed the required Prometheus Operator CRDs were available. Added that caveat to the prerequisites.
- The prerequisites implied a fixed Kubernetes 1.21+ and Cilium 1.14+ compatibility rule. Replaced it with guidance to use a Kubernetes version supported by the selected Cilium release, because Cilium's supported Kubernetes versions are release-specific.

## Review Notes
The post remains a high-level operational guide. The exact supported Kubernetes versions and kernel requirements vary by Cilium release, so production readers should check the version-specific Cilium requirements page before applying the examples.
