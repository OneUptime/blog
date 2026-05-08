# Validation Summary: Validating Native Routing in Cilium

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium CLI
- Hubble
- Helm
- kubectl
- Linux routing

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium CLI `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Cilium CLI `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium end-to-end connectivity testing documentation: https://docs.cilium.io/en/stable/contributing/testing/e2e.html
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- CiliumEndpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble observability documentation: https://docs.cilium.io/en/stable/observability/hubble/
- Kubernetes workload and Service API conventions: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ and https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The connectivity test examples used broad names without the scenario selector syntax and used `dns-resolution`, which is not the documented Cilium connectivity test name. Updated the examples to use `'/pod-to-pod'`, `'/pod-to-service'`, and `dns-only`.
- The BusyBox `wget` examples used `--timeout=5`, which is less portable across BusyBox builds. Updated them to use `-T 5`.
- The endpoint health section used `cilium endpoint list`, but current Cilium documentation exposes endpoint inspection through the in-agent `cilium-dbg endpoint` commands and the cluster-wide CiliumEndpoint CRD. Updated the examples to use `kubectl get ciliumendpoints.cilium.io --all-namespaces`.
- The endpoint count compared one agent's local endpoint list to all running pods in the cluster, which can be misleading and includes pods that may not be Cilium-managed. Replaced it with a count of CiliumEndpoint resources.
- The metrics examples used `cilium metrics list`, but the in-agent command documented by Cilium is `cilium-dbg metrics list`. Updated the metrics and troubleshooting examples accordingly.

## Review Notes
The core explanation of native routing is accurate: Cilium native routing uses `routing-mode: native`, delegates non-local endpoint traffic to the Linux routing subsystem, and requires the network or nodes to route PodCIDRs. The guide does not pin a Cilium version, so commands were validated against current stable/latest Cilium documentation available on 2026-05-08.
