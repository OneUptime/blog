# Validation Summary: How to Troubleshoot Default Rate Limits in Cilium configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Helm
- Cilium CLI and cilium-dbg
- Prometheus and Grafana

## Sources Consulted
- Cilium command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium command reference for `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list.html
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint.html
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post used several node-local Cilium agent commands through the Kubernetes-facing `cilium` CLI, such as `cilium identity list`, `cilium metrics list`, `cilium bpf tunnel list`, `cilium bpf lb list`, `cilium policy get`, and `cilium endpoint get`. Updated these examples to execute `cilium-dbg` inside a selected Cilium pod, matching the current Cilium command reference and troubleshooting documentation.
- The verification step used `cilium health status`, but current Cilium health inspection is provided by `cilium-health status`. Updated the example to run `cilium-health status --verbose` inside a Cilium pod.
- The Helm example used the non-existent `labels.exclude` value. Updated it to the documented `labels` Helm value for identity-relevant label configuration.
- The original label exclusion example targeted `pod-template-hash` and `controller-revision-hash`, which Cilium already excludes by default. Updated the example to show a documented inclusive identity label configuration.
- The prerequisite stated Kubernetes `v1.21+` with Cilium `v1.14+`, which is too broad because supported Kubernetes versions are release-specific. Updated it to require a Kubernetes version supported by the installed Cilium release.
- The troubleshooting note stated a fixed Linux kernel requirement of 4.19 or later. Current Cilium kernel requirements are version- and distribution-specific, so the note now points readers to the requirements for their Cilium version.
- The operator pod selector used `name=cilium-operator`. Updated it to `io.cilium/app=operator`, which is used by current Cilium tooling as the operator selector.
- The endpoint verification command attempted to count `cilium endpoint list -o json` output and compare it to the pod count, but endpoint inspection via `cilium-dbg` is node-local. Replaced it with `kubectl get ciliumendpoints --all-namespaces` for cluster-level endpoint CRD inspection.
- The "not running" pod check used `grep -v Running`, which can produce misleading output. Replaced it with a Kubernetes field selector for pods whose phase is not `Running`.

## Review Notes
The post is technically relevant and contains executable troubleshooting commands. It still reads more like a general Cilium troubleshooting guide than a focused guide to Cilium rate limit defaults; a future content pass could add explicit coverage of `k8sClientRateLimit`, CiliumEndpointSlice rate limits, and BPF event rate limiting defaults.
