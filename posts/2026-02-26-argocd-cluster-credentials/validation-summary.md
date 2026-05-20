# Validation Summary: How to Configure Cluster Credentials in ArgoCD

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets
- Kubernetes ServiceAccounts
- Kubernetes client certificate authentication
- Kubernetes exec credential plugins
- Amazon EKS authentication
- Google Kubernetes Engine Workload Identity
- Azure Kubernetes Service kubelogin authentication
- Sealed Secrets
- External Secrets Operator

## Sources Consulted
- Argo CD Declarative Setup, cluster secret configuration: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#clusters
- Argo CD EKS, GKE, and AKS cluster secret examples: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#eks
- Kubernetes ServiceAccounts: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes ServiceAccount token Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/#serviceaccount-token-secrets
- Kubernetes Managing ServiceAccounts: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- External Secrets Operator API documentation: https://external-secrets.io/latest/api/externalsecret/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- OneUptime EKS IRSA auth guide link: https://oneuptime.com/blog/post/2026-02-26-argocd-eks-irsa-auth/view
- OneUptime GKE Workload Identity guide link: https://oneuptime.com/blog/post/2026-02-26-argocd-gke-workload-identity/view

## Issues Found
- The post said cluster credential Secrets contain exactly three fields. Argo CD requires `name`, `server`, and `config`, but also supports optional fields such as `namespaces`, `clusterResources`, and `project`. Changed the wording to "at least three fields."
- The client certificate examples used the `system:masters` group, which grants broad cluster-admin style access and conflicts with the post's least-privilege guidance. Changed the example subject group to `argocd-managers`.
- The AWS and GKE subsection headings named tools that did not match the shown Argo CD configuration. Updated the headings to match `awsAuthConfig` and `argocd-k8s-auth` Workload Identity usage.
- The AKS example called `kubelogin` directly. Argo CD's documented AKS example uses `argocd-k8s-auth` with `args: ["azure"]` and environment variables for the kubelogin flow. Updated the snippet accordingly.
- The TLS configuration snippet included JavaScript-style comments inside JSON-like configuration, which would not be valid JSON if copied into the Argo CD `config` field. Removed the inline comments and added a short explanatory sentence below the snippet.
- The bearer token rotation script patched `/stringData/config` with a JSON patch. `stringData` is write-only input and is not present on stored Secret objects. Changed the script to preserve the existing TLS configuration and patch via a merge patch using `stringData`.
- The bearer token rotation script referenced `CA_DATA` without defining it. The updated script preserves the current `tlsClientConfig` from the existing cluster Secret instead.
- The client certificate rotation script generated new credentials but did not update the Argo CD cluster Secret. Added a focused patch step that replaces `tlsClientConfig.certData` and `tlsClientConfig.keyData`.
- The SealedSecret example placed the Argo CD cluster label on the SealedSecret metadata, which does not necessarily label the generated Secret. Moved the label under `spec.template.metadata.labels` and added the encrypted Argo CD Secret keys.
- The ExternalSecret example used the older `external-secrets.io/v1beta1` API version and did not show how the required Argo CD Secret keys would be populated. Updated it to the current `external-secrets.io/v1` API and added a minimal `secretStoreRef`, target template data, and remote references for `name`, `server`, and `config`.

## Review Notes
The post is accurate after the fixes. Kubernetes long-lived ServiceAccount token Secrets are still supported, but Kubernetes documentation recommends TokenRequest-based short-lived tokens where possible; this is worth calling out more strongly in a future security-focused revision.
