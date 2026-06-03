# Validation Summary: How to Use RBAC for ServiceAccounts with Pod-Level Security Context Constraints

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes RBAC
- Kubernetes Pod and container security contexts
- Kubernetes Pod Security Standards and Pod Security Admission
- kubectl
- jq

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes RBAC API reference: https://kubernetes.io/docs/reference/kubernetes-api/rbac/
- Kubernetes Pod API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/pod-v1/
- Kubernetes ServiceAccount API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-account-v1/
- Kubernetes security context task documentation: https://kubernetes.io/docs/tasks/configure-pod-container/security-context/
- Kubernetes Pod Security Standards documentation: https://kubernetes.io/docs/concepts/security/pod-security-standards/
- Kubernetes namespace label enforcement for Pod Security Standards: https://kubernetes.io/docs/tasks/configure-pod-container/enforce-standards-namespace-labels/
- Kubernetes EndpointSlice API reference: https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/
- Kubernetes core API reference for deprecated Endpoints: https://kubernetes.io/docs/reference/kubernetes-api/core/
- Kubernetes events.k8s.io/v1 Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/events/event-v1/

## Issues Found
- The read-only ClusterRole used the legacy core `endpoints` resource. Replaced it with `endpointslices` in the `discovery.k8s.io` API group because Kubernetes marks core Endpoints as legacy/deprecated in favor of EndpointSlice.
- The event-writing RBAC rules used core API group `events`. Updated them to `events.k8s.io` for current event API permissions.
- The Pod Security Standards section said pods using the service account must comply with the restricted standard. Corrected this to say pods created in the namespace must comply, because Pod Security Admission is enforced by namespace labels, not by ServiceAccount.
- The comments above the restricted Deployment security contexts said the whole blocks were required by the restricted standard. Adjusted them to say the settings satisfy restricted requirements, because `readOnlyRootFilesystem`, `fsGroup`, and a specific nonzero `runAsUser` are useful hardening settings but not all strictly required by the Restricted profile.
- The audit command comments overstated what the jq filters detect. Updated them to clarify they find service accounts that have not disabled token automounting, pods explicitly configured with UID 0, and pods explicitly allowing privilege escalation.
- The test pod did not set `readOnlyRootFilesystem`, so the root filesystem write test would not reliably fail. Added `readOnlyRootFilesystem: true`.
- The test pod used `busybox` but then used HTTPS API access without a CA-aware command. Switched the example to `curlimages/curl` and used the mounted ServiceAccount CA certificate with `curl`.

## Review Notes
- The YAML snippets were parsed successfully with PyYAML.
- The bash snippets passed `bash -n` syntax checks.
- `kubectl` was not installed in the local environment, so command semantics were verified against official Kubernetes documentation rather than local CLI help.
- RBAC rules that use `resourceNames` with `watch` require clients to include a matching field selector when watching the resource.
