# Validation Summary: How to Fix Deploy 25 more deployments on each namespace in Cilium performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Prometheus and Prometheus Operator
- Grafana

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Limiting Identity-Relevant Labels: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/index_cilium_cli/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium cilium-dbg endpoint get command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium cilium-dbg metrics list command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Running Prometheus and Grafana: https://docs.cilium.io/en/stable/observability/grafana/

## Issues Found
- The prerequisites listed a broad Kubernetes v1.21+ and Cilium v1.14+ requirement. Current Cilium documentation defines supported Kubernetes versions per Cilium release, so this was changed to require a Kubernetes version supported by the installed Cilium release.
- The Helm values snippet used `labels.exclude` as an object/list. Cilium documents the `labels` Helm/ConfigMap value as a space-separated label pattern string, with exclusions prefixed by `!`, so it was changed to `labels: "!pod-template-hash !controller-revision-hash !job-name"`.
- Several examples used node-local commands such as `cilium endpoint list`, `cilium policy get`, `cilium bpf tunnel list`, and `cilium metrics list` as if they were Kubernetes-facing Cilium CLI commands. Current Cilium documentation exposes these diagnostics through `cilium-dbg` inside the Cilium agent, so the examples were changed to use `kubectl exec -n kube-system ds/cilium -c cilium-agent -- cilium-dbg ...` where applicable.
- The verification command used `cilium health status`, but Cilium documents cluster health checks through `cilium-health status`, so the command was updated to execute `cilium-health status` in the Cilium agent pod.
- The endpoint count command used `cilium endpoint list -o json`, which is not the documented Kubernetes-facing way to enumerate all Cilium endpoints. It was changed to count `CiliumEndpoint` CRD objects via `kubectl get ciliumendpoints --all-namespaces -o json`.
- The troubleshooting note said to verify Linux kernel version 4.19 or later. Current Cilium system requirements depend on the release and, for current stable Cilium, document Linux kernel 5.10 or an equivalent vendor kernel, so this was changed to refer to the kernel requirements for the deployed Cilium release.
- Policy troubleshooting used deprecated or node-local policy commands. It now checks Kubernetes `NetworkPolicy` and `CiliumNetworkPolicy` resources with `kubectl`.

## Review Notes
The guide is technically relevant and usable after the corrections. The title and description remain awkward, but they were not changed because they are editorial rather than technical correctness issues.
