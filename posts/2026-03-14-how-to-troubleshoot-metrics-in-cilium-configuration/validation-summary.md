# Validation Summary: How to Troubleshoot Metrics in Cilium configuration

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF/BPF maps
- Prometheus metrics
- Helm
- kubectl

## Sources Consulted
- Cilium Monitoring & Metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium CLI command reference for `cilium status`: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium CLI command reference for `cilium sysdump`: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium debug command reference for `cilium-dbg metrics list`: https://docs.cilium.io/en/stable/cmdref/
- Cilium debug command reference for `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list.html
- Cilium health command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium identity-relevant label filtering documentation: https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels.html
- Cilium Helm values reference and values.yaml: https://docs.cilium.io/en/stable/helm-values/ and https://github.com/cilium/cilium/blob/v1.19.3/install/kubernetes/cilium/values.yaml
- Cilium Kubernetes and system requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html and https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium policy documentation: https://docs.cilium.io/en/stable/security/policy/

## Issues Found
- Several examples used the Kubernetes-facing `cilium` CLI for agent-local commands such as `metrics list`, `identity list`, `bpf tunnel list`, `bpf lb list`, and endpoint inspection. Updated these examples to run `cilium-dbg` through `kubectl exec ds/cilium -c cilium-agent`, matching the current Cilium command reference.
- The Helm example used `labels.exclude`, which is not a documented Cilium Helm value. Replaced it with the documented `labels` Helm value using exclusion patterns.
- The post used `cilium policy get`, but direct agent policy import/inspection is deprecated in the documented Kubernetes policy workflow. Replaced policy checks with `kubectl get cnp,ccnp,netpol -A`.
- The verification step used `cilium health status`, but the documented health client is `cilium-health status`. Updated the command to run `cilium-health` from the Cilium DaemonSet.
- The endpoint count example used agent-local endpoint JSON from the old CLI style. Replaced it with a cluster-wide `kubectl get ciliumendpoints -A --no-headers | wc -l` check.
- The troubleshooting section stated that kernel 4.19 or later is sufficient. Updated it to the current documented baseline of Linux kernel 5.10 or an equivalent vendor kernel such as RHEL 8.10's 4.18 kernel.
- One Cilium agent log command omitted the `cilium-agent` container name. Added `-c cilium-agent` for consistency with multi-container Cilium pods.

## Review Notes
The remaining commands are operational diagnostics and depend on cluster configuration, Cilium version, and whether the traditional Helm repository or OCI chart reference is used. The `helm upgrade cilium cilium/cilium` form remains valid when the Cilium Helm repository has been added, though Cilium's current installation guide recommends OCI chart references for new installs.
