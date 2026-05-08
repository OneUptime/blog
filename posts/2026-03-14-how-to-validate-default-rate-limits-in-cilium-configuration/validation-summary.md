# Validation Summary: How to Validate Default Rate Limits in Cilium configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI
- CiliumNetworkPolicy
- Cilium metrics
- eBPF
- Helm
- Prometheus and Grafana

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium Helm reference for `apiRateLimit`: https://docs.cilium.io/en/stable/helm-reference/
- Cilium metrics reference for API limiter metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium policy documentation for Kubernetes namespace behavior and CiliumNetworkPolicy examples: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium endpoint and lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html

## Issues Found
- The prerequisites specified Kubernetes v1.21+ for Cilium v1.14+. Cilium support is version-specific, and current Cilium documentation lists supported Kubernetes versions per Cilium release. Changed this to require a Kubernetes version supported by the installed Cilium release.
- Several examples used the Kubernetes-facing `cilium` CLI for node-local agent commands such as `endpoint list`, `identity list`, `metrics list`, `policy get`, `bpf tunnel list`, and `endpoint get`. Current Cilium documentation exposes these local inspection functions through `cilium-dbg` inside an agent pod or through Kubernetes CRDs. Updated the examples to use `kubectl get ciliumendpoints`, `kubectl get ciliumidentities`, `kubectl get ciliumnetworkpolicies`, and `kubectl exec ... cilium-dbg ...` as appropriate.
- The verification step used `cilium health status`, but the documented command is `cilium-health status`. Updated the example to run `cilium-health status` inside a Cilium agent pod.
- The post title and description focus on default rate limits, but the validation commands did not directly check rate-limit configuration or API limiter metrics. Added checks for configured rate-limit values and `cilium_api_limiter_rate_limit` metrics.
- The endpoint-count example used `cilium endpoint list -o json`, which is not part of the Kubernetes-facing `cilium` CLI. Replaced it with `kubectl get ciliumendpoints --all-namespaces -o json`.
- The troubleshooting section cited a fixed Linux kernel minimum of 4.19 and a specific `cilium-init` container. Current Cilium system requirements vary by release and container names can vary by installation. Reworded this to point to the requirements for the installed Cilium version and to use the actual init container name.

## Review Notes
The policy YAML is syntactically valid for `cilium.io/v2` `CiliumNetworkPolicy`, and the `kubectl run`, `kubectl expose`, `cilium status`, `cilium connectivity test`, and `cilium sysdump --output-filename` examples align with documented command behavior. The guide remains a high-level validation guide; in the future it could be improved by showing expected sample output for the API rate-limit metrics.
