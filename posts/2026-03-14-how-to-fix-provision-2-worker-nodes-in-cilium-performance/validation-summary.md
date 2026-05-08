# Validation Summary: How to Fix Provision 2 worker nodes in Cilium performance

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Prometheus / PrometheusRule
- kubectl

## Sources Consulted
- Cilium CLI command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium limiting identity-relevant labels: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium troubleshooting guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Kubernetes compatibility: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes resource management documentation: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Prometheus Operator API documentation: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm values snippet used `labels.exclude`, but Cilium's Helm `labels` value is a space-separated string of label patterns. Changed it to `labels: "!pod-template-hash !controller-revision-hash !job-name"` so it matches the documented format for excluding identity-relevant labels.
- Several examples used daemon-local commands through the Kubernetes-facing `cilium` CLI, such as `cilium endpoint list`, `cilium policy get`, `cilium bpf tunnel list`, and `cilium metrics list`. Updated these examples to execute `cilium-dbg` inside a Cilium agent pod with `kubectl exec`.
- The verification command used `cilium health status`, but the documented health client is `cilium-health status`. Updated the command to run `cilium-health status` inside a Cilium agent pod.
- The operator health check used the selector `name=cilium-operator`, while current Cilium tooling documents `io.cilium/app=operator` as the default operator pod selector. Updated the selector.
- The troubleshooting notes stated a fixed Linux kernel requirement of 4.19 or later. Current Cilium releases document Linux kernel 5.10 or a distribution-equivalent kernel such as RHEL 8.10's 4.18. Replaced the fixed version with a version-aware reference to Cilium system requirements.
- The startup troubleshooting text assumed an init container named `cilium-init`. Cilium init container names vary by installation and version, so the command now uses a placeholder for the actual init container name shown by `kubectl describe pod`.

## Review Notes
- Commands that use `$CILIUM_POD` require selecting a Cilium agent pod first, for example with `kubectl -n kube-system get pods -l k8s-app=cilium`.
- `cilium connectivity test --single-node` is valid, but it intentionally limits coverage to tests that can run on a single node. For a guide focused on two worker nodes, a future revision could add a multi-node connectivity test path.
