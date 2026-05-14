# Validation Summary: Cilium General Configuration: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Cilium CLI and cilium-dbg
- Prometheus metrics

## Sources Consulted
- Cilium Configuration documentation: https://docs.cilium.io/en/stable/configuration/
- Cilium Kubernetes ConfigMap options: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium ConfigMap drift detection: https://docs.cilium.io/en/stable/configuration/configmap-drift-detection/
- Cilium CLI config command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config/
- Cilium CLI config view command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- cilium-dbg config command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- Corrected the explanation of `cilium-config` from authoritative live runtime configuration to desired startup configuration. Cilium documentation states many ConfigMap changes require an agent restart, and drift detection exists for unapplied ConfigMap changes.
- Corrected the claim that ConfigMap changes are picked up within seconds for live reload. The post now distinguishes ConfigMap changes from limited runtime changes made with `cilium-dbg config`.
- Fixed the Helm value `rolloutCiliumPods` to `rollOutCiliumPods`, matching the Cilium Helm reference.
- Fixed `endpointGCInterval` to `operator.endpointGCInterval`, matching the Cilium Helm reference.
- Fixed `operatorPrometheusPort` to `operator.prometheus.port`, matching the Cilium metrics documentation.
- Replaced `kubectl exec ds/cilium -- cilium config view` examples with `kubectl exec ds/cilium -- cilium-dbg config --all` where the post is inspecting active agent configuration. The Cilium CLI `cilium config view` reads cluster configuration through Kubernetes, while `cilium-dbg` is the in-agent tool for local agent state.
- Replaced the invalid `diff` example comparing `cilium config view` output to raw ConfigMap JSONPath output with commands that separately inspect active agent configuration and the ConfigMap.
- Fixed `kubectl -n kube-system get pods ds/cilium -o yaml`, which is not the right way to inspect the DaemonSet template, to `kubectl -n kube-system get ds cilium -o yaml`.
- Updated the Mermaid diagram and conclusion to avoid implying general ConfigMap live reload.

## Review Notes
Cilium configuration behavior is version-sensitive. The corrected post aligns with the current stable documentation as of 2026-05-14, but future Cilium releases may add more dynamic configuration support or rename Helm values.
