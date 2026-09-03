# Validation Summary: How to Confirm Kubernetes API Anonymous Access After a kube-hunter Finding

## Status
validated

## Post Type
Security validation guide

## Technologies Covered
- Kubernetes API server
- Kubernetes authentication and anonymous requests
- Kubernetes authorization and RBAC
- kubectl authorization checks and impersonation
- curl and TLS certificate validation
- kube-hunter
- Kubernetes audit logging

## Sources Consulted
- [Kubernetes authentication: anonymous requests](https://kubernetes.io/docs/reference/access-authn-authz/authentication/#anonymous-requests)
- [Kubernetes authorization](https://kubernetes.io/docs/reference/access-authn-authz/authorization/)
- [Kubernetes RBAC](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [kubectl auth can-i reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [Kubernetes API health endpoints](https://kubernetes.io/docs/reference/using-api/health-checks/)
- [Kubernetes auditing](https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/)
- [curl command-line reference](https://curl.se/docs/manpage.html)
- [kube-hunter API server discovery source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/discovery/apiserver.py)
- [kube-hunter API server hunters source](https://github.com/aquasecurity/kube-hunter/blob/main/kube_hunter/modules/hunting/apiserver.py)
- [kube-hunter documentation](https://github.com/aquasecurity/kube-hunter/blob/main/docs/index.md)

## Issues Found
- The curl examples did not disable curl's default configuration file. Even with `env -i`, curl can locate a user's home directory through the operating system account database and load `.curlrc`; that file can supply authentication, cookie, client-certificate, proxy, or other options that invalidate a credential-free test. Added `-q` as the first curl argument in both examples, as required by curl to prevent loading the default configuration file.

## Review Notes
- Endpoint-scoped anonymous authentication through `AuthenticationConfiguration` is stable in Kubernetes v1.34 and later. The post correctly warns readers to consult the documentation and feature state for their cluster release.
- `/healthz` remains available but has been deprecated since Kubernetes v1.16; `/livez` and `/readyz` are the preferred health endpoints.
- The direct request and `kubectl auth can-i` examples are intentionally complementary: impersonation checks authorization, while the credential-free curl request validates the end-to-end authentication and authorization path.
