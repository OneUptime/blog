# Validation Summary: How to Troubleshoot ztunnel Connectivity Issues in Ambient Mode

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- Istio CNI
- Kubernetes
- kubectl
- istioctl
- AuthorizationPolicy
- HBONE and mTLS

## Sources Consulted
- Istio ambient overview: https://istio.io/latest/docs/ambient/overview/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio ztunnel troubleshooting guide: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio add workloads to ambient mesh: https://istio.io/latest/docs/ambient/usage/add-workloads/
- Istio verify mTLS in ambient mode: https://istio.io/latest/docs/ambient/usage/verify-mtls-enabled/
- Istio L4 security policy in ambient mode: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio application requirements and ports: https://istio.io/latest/docs/ops/deployment/application-requirements/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes node debugging with kubectl: https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/

## Issues Found
- The pod network namespace inspection command used a Kubernetes container ID prefix as the `nsenter` target PID. Updated it to resolve the container's host PID with `crictl inspect` from a privileged node debug container before running `nsenter`.
- The istiod reachability command attempted to fetch an HTTPS debug URL from port 15012. Istiod port 15012 is the TLS/mTLS gRPC XDS and CA port, not a plain HTTPS debug endpoint. Replaced it with endpoint inspection plus a TCP reachability check to port 15012 from a temporary debug pod.
- The HBONE port check used `wget` over HTTP against port 15008. HBONE uses HTTP/2 with mTLS, so a plain HTTP request is not a valid reachability test. Replaced it with a TCP `nc -vz` check from an ephemeral debug container attached to the source ztunnel pod.
- The common fixes table mapped "Connections refused" to AuthorizationPolicy blocking. AuthorizationPolicy denials are better identified through RBAC denial logs or access denied behavior, while connection refused usually points to a backend listener or port problem. Updated the symptom to "RBAC access denied."

## Review Notes
The remaining commands and claims align with current Istio ambient mode behavior: ztunnel is the per-node L4 proxy, ambient enrollment uses `istio.io/dataplane-mode=ambient`, `istioctl ztunnel-config workloads/certificates/policies` are valid diagnostics, ztunnel enforces L4 AuthorizationPolicy on the destination side, and port 15008 is the HBONE tunnel port.
