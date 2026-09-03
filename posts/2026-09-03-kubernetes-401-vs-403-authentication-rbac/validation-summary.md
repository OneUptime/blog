# Validation Summary: 401 or 403? How to Separate Kubernetes API Authentication Failures from RBAC Denials

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes API server
- Kubernetes authentication and anonymous authentication
- Kubernetes authorization and RBAC
- Kubernetes admission control
- `kubectl` (`config`, `auth whoami`, and `auth can-i`)
- Kubernetes audit logging

## Sources Consulted
- [Kubernetes: Controlling Access to the Kubernetes API](https://kubernetes.io/docs/concepts/security/controlling-access/)
- [Kubernetes: Authenticating](https://kubernetes.io/docs/reference/access-authn-authz/authentication/)
- [Kubernetes: Authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes: Using RBAC Authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [Kubernetes: Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/admission-controllers/)
- [Kubernetes: Dynamic Admission Control](https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/)
- [Kubernetes: `kubectl auth can-i`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes: `kubectl auth whoami`](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_whoami/)
- [Kubernetes: Auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [Kubernetes: Audit Annotations](https://kubernetes.io/docs/reference/labels-annotations-taints/audit-annotations/)
- Local `kubectl auth can-i --help` and `kubectl auth whoami --help` output

## Issues Found
- The list of common 401 causes included an unreachable token-authentication webhook. A webhook that explicitly rejects a token can result in failed authentication, but a webhook call failure is an authentication-system error and is not reliably a 401 credential rejection. Removed “unreachable” so the example accurately describes a 401 investigation.

## Review Notes
- The 401/403 distinction is correctly presented as a useful first split rather than an absolute rule, with appropriate caveats for anonymous authentication and fronting proxies.
- The `kubectl auth can-i` resource, subresource, non-resource URL, namespace, and impersonation examples match the current command reference and local CLI help.
- `kubectl auth whoami` is present in current Kubernetes documentation but is still described there as experimental; older kubectl releases may not provide it.
- Admission rejection is correctly distinguished from authorization denial. Admission applies after authentication and authorization and only to applicable operations; admission webhooks can return a 403 status.
- RBAC binding scope, `resourceNames`, API groups, subresources, and audit annotation explanations are technically correct.
