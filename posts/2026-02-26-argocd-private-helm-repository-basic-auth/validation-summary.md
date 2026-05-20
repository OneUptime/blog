# Validation Summary: How to Add a Private Helm Repository with Basic Auth in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Helm chart repositories
- Kubernetes Secrets and ConfigMaps
- External Secrets Operator
- Bitnami Sealed Secrets / kubeseal
- HTTP basic authentication
- TLS certificate trust configuration

## Sources Consulted
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repo list` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repo_list/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- Bitnami Sealed Secrets README: https://github.com/bitnami-labs/sealed-secrets
- Kubernetes `kubectl label` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The External Secrets Operator example used `apiVersion: external-secrets.io/v1beta1`. Current official External Secrets Operator documentation uses the stable `external-secrets.io/v1` API for `ExternalSecret`. Updated the manifest to `apiVersion: external-secrets.io/v1`.

## Review Notes
- Argo CD repository Secret labels, Helm repository fields (`type`, `name`, `url`, `username`, `password`), repo credential templates, Helm Application source fields, `CreateNamespace=true`, and `argocd-tls-certs-cm` hostname-based certificate entries match the current Argo CD documentation.
- The `insecure: "true"` repository setting is suitable only for testing as stated in the post; trusting the repository certificate through `argocd-tls-certs-cm` remains the production-safe approach.
