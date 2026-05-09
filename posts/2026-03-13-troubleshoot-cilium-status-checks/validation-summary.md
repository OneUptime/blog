# Validation Summary: Troubleshoot Cilium Status Checks

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Prometheus metrics
- kubectl

## Sources Consulted
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg debuginfo` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_debuginfo/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg endpoint get` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium Monitoring & Metrics reference: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium API reference for status fields: https://docs.cilium.io/en/stable/api/

## Issues Found
- The workstation `cilium status` example used agent-local flags such as `--all-addresses`, `--all-controllers`, `--all-nodes`, and `--all-redirects`. These are documented for `cilium-dbg status`, not the Kubernetes-facing `cilium status` command. I changed the workstation command to `cilium status --verbose`.
- The commands executed inside the Cilium DaemonSet used `cilium status`, `cilium debuginfo`, `cilium endpoint list`, and `cilium endpoint get`. Current Cilium documentation exposes these local agent diagnostics through `cilium-dbg`, so I updated those examples to use `cilium-dbg`.
- The endpoint synchronization section described an across-cluster endpoint check but used an agent-local endpoint list command. I changed the cluster-wide listing and not-ready check to use the `CiliumEndpoint` CRD through `kubectl get ciliumendpoints --all-namespaces`.
- The key-field list referenced `BPF Maps` as a simple `Ok` status field. The Cilium status API exposes BPF map details, while the common status output reports daemon health under `Cilium`. I changed the guidance to check `Cilium: Ok` for datapath initialization problems, including BPF filesystem or map issues.
- The best-practice note recommended `cilium debuginfo` for GitHub issues, but the Kubernetes-facing CLI provides `cilium sysdump` for collecting troubleshooting data. I updated the recommendation to `cilium sysdump`.
- The post suggested `cilium_k8s_client_api_calls_total` for API server throttling indicators. That metric counts API calls by host, method, and return code; Cilium documents `k8s_client_rate_limiter_duration_seconds` for Kubernetes client rate limiter latency. I updated the recommendation to `cilium_k8s_client_rate_limiter_duration_seconds`.

## Review Notes
The post is now technically valid for current Cilium CLI behavior. Some examples still assume the Cilium agent DaemonSet is named `cilium` and uses the default `kube-system` namespace, which is consistent with the post prerequisites but may need adjustment for custom installations.
