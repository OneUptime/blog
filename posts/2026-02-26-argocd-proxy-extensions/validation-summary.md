# Validation Summary: How to Use Proxy Extensions in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD proxy extensions
- Argo CD RBAC
- Kubernetes ConfigMaps, Deployments, Services, and NetworkPolicies
- Go net/http backend service
- TypeScript fetch API
- kubectl troubleshooting commands

## Sources Consulted
- Argo CD proxy extensions documentation: https://argo-cd.readthedocs.io/en/stable/developer-guide/extensions/proxy-extensions/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes kubectl quick reference: https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Go net/http package documentation: https://pkg.go.dev/net/http

## Issues Found
- The post used `/api/extensions/<name>` as the proxy route. Argo CD documents proxy extensions under `/extensions/<extension-name>`, so all route examples, Mermaid flow text, fetch calls, and troubleshooting notes were corrected.
- The post omitted the required `server.enable.proxy.extension` setting in `argocd-cmd-params-cm`. Added the enablement ConfigMap snippet before the `argocd-cm` proxy configuration.
- The multi-backend cluster routing example only specified `cluster.name`. Argo CD recommends specifying both cluster name and server when multiple services are configured for one extension, so `cluster.server` values were added.
- The Authorization header example used `Bearer $ext.metrics.production.token`, which would be treated as a literal value rather than a direct Argo CD secret-key reference. Changed it to `$ext.metrics.production.token`.
- The UI fetch example did not include Argo CD's required proxy extension request headers. Added `Argocd-Application-Name` and `Argocd-Project-Name`.
- The RBAC example only granted `extensions, invoke`; Argo CD extension RBAC also works with application read permission for the originating application. Added corresponding `applications, get` permissions to the example roles.
- The custom header example implied `$argocd.session.username` could be templated into configured headers. Argo CD instead automatically decorates backend requests with user headers such as `Argocd-Username`, while configured `$...` values reference keys in `argocd-secret`. Replaced that example with a secret-backed Authorization header.

## Review Notes
Proxy extensions are documented as a beta feature since Argo CD 2.7, but the current stable documentation still says the feature must be explicitly enabled. Backend services should still validate incoming headers and request parameters because Argo CD forwards authorized requests to the service.
