# Validation Summary: How to Configure Bearer Token Auth for Remote Clusters in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes ServiceAccounts
- Kubernetes ServiceAccount tokens and TokenRequest API
- Kubernetes RBAC
- Kubernetes Secrets
- kubectl
- Argo CD CLI

## Sources Consulted
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD declarative cluster Secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#clusters
- Argo CD getting started cluster registration documentation: https://argo-cd.readthedocs.io/en/release-3.4/getting_started/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes ServiceAccount concepts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes `kubectl create token` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Argo CD `argocd cluster get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/

## Issues Found
- The opening description stated that a bearer token is always a long-lived ServiceAccount credential. Updated it to clarify that ServiceAccount bearer tokens can also be time-bound tokens issued through the TokenRequest API.
- The sequence diagram showed RBAC validating the bearer token. Updated it so the Kubernetes API server validates the bearer token and RBAC performs the authorization check.
- The time-bound token example said it creates a token that expires in exactly one year. Updated the wording because `kubectl create token --duration` requests a lifetime, and the API server may return a shorter or longer lifetime.
- The note recommended the Secret-based token approach as better for long-lived credentials. Updated it to match Kubernetes guidance: manually created ServiceAccount token Secrets are the non-expiring persisted-token mechanism, but should be used only when time-bound tokens are not suitable.
- The Argo CD CLI example used unsupported or misleading flags: `argocd cluster add` does not support `--bearer-token`, and `--server` is the Argo CD API server address, not the remote Kubernetes API server. Replaced the example with a valid `argocd cluster add` invocation using `--service-account` and `--system-namespace`.

## Review Notes
The declarative Argo CD cluster Secret format, Kubernetes ServiceAccount token Secret manifest, TokenRequest command shape, RBAC API versions, and `argocd cluster get` usage were consistent with the official documentation. Long-lived ServiceAccount token Secrets remain supported, but Kubernetes documentation recommends time-bound TokenRequest tokens or other authentication mechanisms when practical because static bearer tokens carry higher security risk.
