# Validation Summary: How to Validate Metrics in Cilium configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium CLI
- Cilium daemon debug CLI (`cilium-dbg`)
- CiliumNetworkPolicy
- Kubernetes
- kubectl
- Prometheus metrics
- eBPF

## Sources Consulted
- Cilium Command Reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg identity list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Kubernetes compatibility documentation: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Cilium system requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium network policy language documentation: https://docs.cilium.io/en/stable/security/policy/language/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes `kubectl expose` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/

## Issues Found
- The prerequisites used a broad fixed Kubernetes/Cilium version range (`v1.21+` with Cilium `v1.14+`). Cilium support is release-specific, so this was changed to require a Kubernetes version supported by the installed Cilium release.
- Several daemon-local inspection commands were written as top-level `cilium` CLI commands (`cilium endpoint list`, `cilium identity list`, `cilium metrics list`, `cilium policy get`, `cilium bpf tunnel list`). Current Cilium documentation exposes these under `cilium-dbg`, so the examples were changed to execute `cilium-dbg` inside a Cilium agent pod.
- The verification step used `cilium health status`, but the documented health client is `cilium-health status`. The command was corrected and run through the Cilium agent pod.
- The operator health check used the label selector `name=cilium-operator`. The current Cilium tooling documents `io.cilium/app=operator` as the operator selector, so the selector was updated.
- The packet-drop check said it verified no drops while only listing matching metrics. The wording was changed to "Inspect drop and error metrics" to match what the command actually does.
- The troubleshooting note used a fixed Linux kernel minimum and a fixed init container name. This was changed to reference the documented minimum for the user's Cilium release and to discover the actual init container name before fetching logs.

## Review Notes
The CiliumNetworkPolicy example is syntactically valid for `cilium.io/v2` and the `kubectl run` / `kubectl expose` examples are consistent with current Kubernetes command behavior. Prometheus scraping still requires metrics to be enabled in the Cilium deployment, but the post frames Prometheus and Grafana as recommended tooling rather than a mandatory configuration path.
