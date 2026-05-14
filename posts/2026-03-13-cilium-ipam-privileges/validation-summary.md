# Validation Summary: Cilium IPAM Privileges: Configure, Troubleshoot, Validate, and Monitor

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Kubernetes RBAC
- Linux capabilities
- eBPF
- Cilium IPAM
- Helm
- PrometheusRule

## Sources Consulted
- Cilium IPAM concepts: https://docs.cilium.io/en/stable/network/concepts/ipam/
- Cilium CRD-backed IPAM privileges: https://docs.cilium.io/en/stable/network/concepts/ipam/crd/
- Cilium Operator internals and IPAM responsibilities: https://docs.cilium.io/en/latest/internals/cilium_operator/
- Cilium cluster-pool IPAM documentation: https://docs.cilium.io/en/stable/network/kubernetes/ipam-cluster-pool/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium metrics reference: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium command reference for cilium-dbg ip: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_ip/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes PodSecurityPolicy removal documentation: https://kubernetes.io/docs/concepts/security/pod-security-policy/

## Issues Found
- The introduction overstated the Cilium Operator's generic IPAM role and referred to managing CiliumNode CRDs rather than CiliumNode resources. Updated the wording to distinguish operator-managed CiliumNode resources from agent status updates.
- The Helm values example used Kubernetes container securityContext syntax (`capabilities.add`) instead of Cilium Helm's `securityContext.capabilities.ciliumAgent` value. Replaced it with the current Cilium Helm value shape and default capability list.
- The RBAC guidance omitted the `ciliumnodes/status` subresource that Cilium's CRD-backed IPAM documentation identifies as part of the required CiliumNode privileges. Added the subresource to the notes and validation commands.
- The runtime capability check used `capsh --print`, which may not be available in the Cilium agent image. Replaced it with reading capability fields from `/proc/1/status`.
- The PSP troubleshooting commands assumed the removed PodSecurityPolicy API is available. Added a legacy Kubernetes caveat and an `api-resources` check before querying PSP resources.
- The validation section used one permission list for both the Cilium agent and operator service accounts. Split it into separate agent and operator checks to match their different IPAM responsibilities.
- The IPAM validation command used `cilium ip list`, but the current Cilium in-pod debug command is `cilium-dbg ip list`. Updated the command and used `cilium-dbg status --all-addresses` for the IPAM status check.
- The Prometheus alert used label `status="403"` for `cilium_k8s_client_api_calls_total`; Cilium documents the label as `return_code`. Updated the PromQL expression to use `return_code="403"`.

## Review Notes
The post remains generally accurate as a practical troubleshooting guide, but exact RBAC requirements can vary by Cilium version and IPAM mode. Future updates should call out the specific Cilium version being targeted if the guide expands into exhaustive privilege matrices.
