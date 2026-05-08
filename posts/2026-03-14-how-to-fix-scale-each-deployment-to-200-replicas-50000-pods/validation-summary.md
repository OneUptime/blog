# Validation Summary: How to Fix Scale each deployment to 200 replicas (50000 pods in total)

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus
- eBPF

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium identity-relevant labels documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium CLI command reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium connectivity test command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium sysdump command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Helm upgrade documentation: https://v3.helm.sh/docs/helm/helm_upgrade/

## Issues Found
- The Helm values snippet used an invalid nested `labels.exclude` structure. Cilium documents the `labels` Helm value as label-pattern configuration, with exclusions expressed as a string such as `!job-name`, so the snippet was corrected to `labels: "!job-name"`.
- Several examples used agent-local commands as if they were Kubernetes-facing `cilium` CLI commands, including `cilium endpoint list`, `cilium health status`, `cilium bpf tunnel list`, and `cilium metrics list`. These were corrected to run `cilium-dbg` or `cilium-health` inside a selected Cilium pod with `kubectl exec`.
- The troubleshooting section referenced a fixed `cilium-init` init container name. Current Cilium installations can use different init container names, so the command was changed to use `<init-container-name>`.
- The troubleshooting section stated a fixed Linux kernel version requirement. Current Cilium requirements vary by Cilium version and distribution backports, so the statement was changed to direct readers to the kernel requirement for their installed Cilium version.
- Policy inspection examples used `cilium policy get`, which is agent-local and deprecated in current command references. The post now uses Kubernetes resource inspection with `kubectl get cnp,ccnp,netpol -A` for applied policy checks.

## Review Notes
The post remains a broad operational guide rather than a complete prescription for reliably running exactly 50,000 pods. Resource limits and label filtering should still be load-tested in a staging environment because the correct values depend on node count, policy count, enabled Cilium features, identity allocation mode, and traffic patterns.
