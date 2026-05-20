# Validation Summary: How to Configure ArgoCD Proxy Settings

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes
- Helm
- Git
- HTTP/HTTPS proxies
- TLS certificates
- OpenSSH and netcat

## Sources Consulted
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo Helm chart values and README: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml and https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/README.md
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl create configmap reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_configmap/
- Local OpenSSH and OpenBSD netcat help output for `GIT_SSH_COMMAND` proxy options.
- OneUptime linked related posts: https://oneuptime.com/blog/post/2026-02-26-argocd-firewall-rules/view and https://oneuptime.com/blog/post/2026-02-26-argocd-http2-configuration/view

## Issues Found
- The API server component table said proxy access may be needed for webhook validation. Argo CD webhook validation is not an outbound proxy use case, so this was changed to OIDC authentication when configured directly against an external provider.
- The application controller example used only deployment environment variables for remote-cluster proxying. Argo CD documents `proxyUrl` in the cluster Secret configuration for the Kubernetes client, so the example was replaced with a cluster Secret using `proxyUrl`.
- The built-in TLS certificate management example used an arbitrary `proxy-ca.crt` key in `argocd-tls-certs-cm`. Argo CD requires the ConfigMap data key to be the repository server hostname, so the command now uses a hostname key.
- The Git proxy section showed repository proxy settings under `argocd-cm` `repositories`. Current Argo CD documentation uses repository Secrets with `proxy` and `noProxy`, so the snippet was corrected to a repository Secret.
- The `NO_PROXY` guidance omitted Argo CD's caveat that tools such as Helm and Kustomize may not all support identical wildcard or CIDR syntax. A short note was added to use full hostnames or tool-supported syntax if needed.

## Review Notes
The deployment environment variable examples are syntactically valid Kubernetes manifest fragments for patching existing workloads, but a production guide could be clearer by showing the exact `kubectl patch` or Kustomize patch command used to apply them.
