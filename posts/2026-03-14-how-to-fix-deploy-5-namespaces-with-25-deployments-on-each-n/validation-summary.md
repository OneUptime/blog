# Validation Summary: How to Fix Deploy 5 namespaces with 25 deployments on each namespace

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Prometheus Operator
- Prometheus metrics
- Grafana

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium limiting identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The prerequisites pinned Kubernetes to v1.21+ and Cilium to v1.14+, which is not a reliable supported pairing for current Cilium releases. Changed this to require a Kubernetes version supported by the selected Cilium release.
- The Helm values example used `labels.exclude`, but Cilium documents `labels` as a space-separated string of identity label patterns. Changed it to `labels: "!pod-template-hash !controller-revision-hash !job-name"`.
- The post used `cilium endpoint list`, which is not part of the Kubernetes-facing Cilium CLI command set in current documentation. Replaced the validation example with `kubectl get ciliumendpoints --all-namespaces` using the CiliumEndpoint CRD.
- The post used `cilium health status`; current documentation exposes this as `cilium-health status` on the agent side. Changed the example to run `cilium-health status --verbose` through `kubectl exec` into the Cilium DaemonSet.
- The operator selector used `name=cilium-operator`, while Cilium tooling defaults to `io.cilium/app=operator`. Updated the selector.
- The endpoint count command depended on `cilium endpoint list -o json` and claimed the count should match pod count, but CiliumEndpoint objects can include `cilium-health` endpoints. Replaced it with a CiliumEndpoint count and clarified what is counted.
- The troubleshooting section referenced a fixed Linux kernel minimum of 4.19. Current Cilium system requirements depend on the Cilium release and list newer baseline requirements for current stable releases. Changed this to refer to the kernel requirements for the installed Cilium version.
- The troubleshooting section referenced `cilium policy get`, `cilium bpf tunnel list`, `cilium metrics list`, and `cilium endpoint get`, which are agent-side/debug commands or not appropriate Kubernetes-facing CLI commands. Replaced them with Kubernetes policy resource checks, `cilium-dbg` commands executed inside a Cilium pod where relevant, and Prometheus metric guidance.
- The troubleshooting section referenced a hard-coded `cilium-init` init container name. Replaced it with a placeholder for the actual init container name because Cilium init container names vary by version and configuration.

## Review Notes
The guide is technically relevant and broadly useful, but it remains generic: resource requests and memory thresholds are examples, not universally correct production sizing. Operators should still validate values against their cluster size, enabled Cilium features, and observed metrics.
