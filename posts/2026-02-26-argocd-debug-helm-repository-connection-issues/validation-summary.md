# Validation Summary: How to Debug Helm Repository Connection Issues in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Helm chart repositories
- Kubernetes Secrets and NetworkPolicies
- TLS certificates
- kubectl, argocd CLI, curl, openssl

## Sources Consulted
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/private-repositories/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD repo CLI command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD repo list CLI command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_list/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD official install manifests: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Helm chart repository documentation: https://helm.sh/docs/topics/chart_repository/
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/

## Issues Found
- The repo-server pod lookup used `app.kubernetes.io/component=repo-server`, but the official Argo CD install manifests label repo-server pods with `app.kubernetes.io/name=argocd-repo-server`. Updated the pod lookup, NetworkPolicy pod selector, and diagnostic script to use the pod label that works with the official manifests.
- The proxy example used unsupported `reposerver.http.proxy`, `reposerver.https.proxy`, and `reposerver.no.proxy` keys in `argocd-cmd-params-cm`. Current Argo CD documentation configures repository proxy settings with `proxy` and `noProxy` fields on the repository Secret, or standard proxy environment variables on the repo-server. Replaced the ConfigMap example with a repository Secret example.

## Review Notes
The remaining commands and configuration snippets are consistent with current Argo CD, Helm, and Kubernetes documentation. The diagnostic script's repository Secret URL column displays the base64-encoded Secret data value; that is technically valid for inspecting Secret data, but decoding it would make the script output easier to read in a future editorial pass.
