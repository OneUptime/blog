# Validation Summary: How to Diagnose Install Kubernetes v3 with EndpointSlice feature enabled

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes EndpointSlice
- Cilium and CiliumEndpointSlice
- Cilium CLI, cilium-dbg, and cilium-health
- Kubernetes NetworkPolicy and Cilium policy CRDs
- eBPF and Cilium BPF maps
- Prometheus metrics

## Sources Consulted
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/tasks/administer-cluster/enabling-endpointslices/
- Kubernetes Service and EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Cilium CiliumEndpointSlice documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpointslice/
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium cilium-dbg command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium cilium-dbg endpoint list documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium cilium-health status documentation: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium sysdump command documentation: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium connectivity test command documentation: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test.html
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium system requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements.html

## Issues Found
- The introduction implied that Cilium's Kubernetes EndpointSlice integration requires special configuration. Updated it to clarify that Kubernetes EndpointSlices are stable in Kubernetes v1.21 and normally created automatically, while CiliumEndpointSlice is a separate Cilium feature.
- Several commands used the standalone `cilium` CLI for node-local agent diagnostics such as endpoint listing, BPF map inspection, policy inspection, metrics, and health checks. Updated those examples to use Kubernetes CRDs where cluster-wide data is appropriate and `kubectl exec ... cilium-dbg` or `cilium-health` where Cilium documents node-local diagnostics.
- The identity-count examples used `cilium identity list`; updated them to query the `ciliumidentities` Kubernetes resource so the commands work from an operator workstation with `kubectl`.
- The Cilium operator selector used `name=cilium-operator`, which does not match the current documented default selector. Updated it to `io.cilium/app=operator`.
- The troubleshooting guidance cited Linux kernel 4.19 or later as a general requirement. Updated it to advise checking the requirements for the deployed Cilium version and noted Linux 5.10 or later for current Cilium releases.
- The policy troubleshooting examples used the deprecated/local `cilium policy get` flow. Updated them to inspect Kubernetes NetworkPolicy, CiliumNetworkPolicy, and CiliumClusterwideNetworkPolicy resources.

## Review Notes
The post is technically relevant and contains real operational commands. It remains a general diagnostic guide rather than a complete EndpointSlice or CiliumEndpointSlice enablement walkthrough; future revisions could add version-specific Helm values and validation commands if the intended topic is specifically CiliumEndpointSlice enablement.
