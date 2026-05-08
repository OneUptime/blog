# Validation Summary: How to Troubleshoot Kubernetes in Cilium Observability

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Cilium
- Cilium in-agent CLI (`cilium-dbg`)
- Kubernetes
- Kubernetes EndpointSlice API
- CiliumEndpoint and CiliumIdentity CRDs
- Hubble CLI
- Python JSON parsing for CLI output

## Sources Consulted
- Cilium Command Reference: `cilium-dbg` CLI: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium Command Reference: `cilium-dbg status`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium Command Reference: `cilium-dbg endpoint get`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium Command Reference: `cilium-dbg identity list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list.html
- Cilium Command Reference: `cilium-dbg troubleshoot`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_troubleshoot/
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble Observability documentation: https://docs.cilium.io/en/stable/observability/hubble/index.html
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Kubernetes EndpointSlices documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Endpoints deprecation notice: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/

## Issues Found
- The post used `cilium` inside Cilium DaemonSet pods for agent-local commands. Current Cilium documentation uses `cilium-dbg` for the in-agent CLI, so those commands were updated.
- The API server connectivity example used a direct `wget` call to the Kubernetes service health endpoint, which is less reliable across Cilium images and Kubernetes authentication/TLS setups. It was replaced with the documented `cilium-dbg troubleshoot` command.
- The Kubernetes service endpoint check used the deprecated Endpoints API. It was updated to query EndpointSlices with the `kubernetes.io/service-name=kubernetes` label.
- The endpoint lookup parsed `cilium endpoint list` labels to infer the pod endpoint. It was changed to use the documented `cilium-dbg endpoint get pod-name:<namespace>:<pod>` identifier form.
- The endpoint identity parsing assumed only one JSON shape. It now accepts either a list or object response.
- The post recommended `cilium endpoint regenerate`, which is not present in the current `cilium-dbg endpoint` command reference. It was replaced with recreating the affected workload pod when it is controller-managed.
- The controller status examples used an unsupported `cilium status controllers` form. They were updated to use `cilium-dbg status --all-controllers`.
- The CRD list was presented as a complete expected list, but Cilium CRDs vary by version and enabled features. It was changed to describe common core CRDs and note that other CRDs are version/feature dependent.
- The CiliumEndpoint status check grepped for a pod-style `1/1` readiness value, but CiliumEndpoint output reports endpoint state instead. It now reads the CiliumEndpoint JSON status and reports entries whose state is not `ready`.
- The orphaned CiliumEndpoint example only printed all CiliumEndpoint names instead of checking for matching Pods. It now checks each CiliumEndpoint against a same-namespace Pod and skips the documented `cilium-health-*` endpoint exception.
- The troubleshooting note for `Kubernetes: Disabled` pointed to `k8s.requireIPv4PodCIDR`, which is an IPAM-specific setting rather than the primary Kubernetes API connection setting. It now points to Kubernetes API Helm values such as `k8sServiceHost`, `k8sServicePort`, and `k8s.apiServerURLs`.

## Review Notes
The guide is technically relevant and remains useful as a troubleshooting checklist. Some commands are still operational diagnostics that depend on cluster configuration, enabled Cilium features, and available RBAC, but the corrected forms now match current official Cilium and Kubernetes documentation.
