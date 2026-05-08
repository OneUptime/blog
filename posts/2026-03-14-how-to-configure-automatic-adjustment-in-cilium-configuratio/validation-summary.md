# Validation Summary: How to Configure Automatic Adjustment in Cilium configuration

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Hubble
- Prometheus and Grafana

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Kubernetes Requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium eBPF Maps documentation: https://docs.cilium.io/en/stable/network/ebpf/maps/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium Monitoring and Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium CLI command reference for `cilium config view`, `cilium status`, and `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/
- Cilium command reference for `cilium-dbg` and `cilium-health`: https://docs.cilium.io/en/stable/cmdref/
- Cilium v1.19.3 Helm chart values: https://github.com/cilium/cilium/blob/v1.19.3/install/kubernetes/cilium/values.yaml

## Issues Found
- The prerequisite claimed Kubernetes `v1.21+` generically. Updated it to require a Kubernetes version supported by the reader's Cilium release, because supported Kubernetes versions are Cilium-release-specific.
- The identity label configuration used an invalid nested Helm shape, `labels.exclude`. Replaced it with the documented `labels` string format using exclusion patterns.
- The advanced BPF configuration used invalid Helm keys, `bpf.ctTcpTimeout` and `bpf.ctAnyTimeout`. Replaced them with valid connection-tracking map capacity keys, `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The identity garbage collection setting was placed at the chart root as `identityGCInterval`. Moved it under `operator.identityGCInterval`, which is the documented Helm value.
- Several troubleshooting and verification commands used `cilium` CLI subcommands that are not part of the Kubernetes-facing Cilium CLI. Updated endpoint, policy, metrics, BPF, and health checks to use `cilium-dbg` or `cilium-health` via `kubectl exec` against the Cilium DaemonSet.
- The init container log command hard-coded `cilium-init`, which is not a stable current init container name. Replaced it with `<init-container-name>`.

## Review Notes
- The label exclusions shown are already part of Cilium's default excluded labels in current documentation, but the corrected syntax is valid and keeps the author's intended example.
- `cilium connectivity test --single-node` is valid for single-node validation, but multi-node production clusters should also run connectivity tests without `--single-node` where practical.
