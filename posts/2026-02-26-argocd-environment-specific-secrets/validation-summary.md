# Validation Summary: How to Handle Environment-Specific Secrets in ArgoCD

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- ArgoCD / Argo CD
- Kubernetes Secrets
- Kustomize
- Bitnami Sealed Secrets
- External Secrets Operator
- AWS Secrets Manager
- HashiCorp Vault
- ArgoCD Vault Plugin
- Helm

## Sources Consulted
- Kubernetes Secrets documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secrets good practices: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- Bitnami Sealed Secrets official repository and Helm/kubeseal examples: https://github.com/bitnami-labs/sealed-secrets
- External Secrets Operator API specification: https://external-secrets.io/main/api/spec/
- External Secrets Operator getting started / Helm installation docs: https://external-secrets.io/main/introduction/getting-started/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- ArgoCD Vault Plugin configuration documentation: https://argocd-vault-plugin.readthedocs.io/en/stable/config/
- HashiCorp Vault KV command documentation: https://developer.hashicorp.com/vault/docs/commands/kv/put

## Issues Found
- The Sealed Secrets Helm install command used the `sealed-secrets/sealed-secrets` chart reference without first adding the official Helm repository. Added `helm repo add sealed-secrets https://bitnami-labs.github.io/sealed-secrets` and `helm repo update` so the command is directly runnable.
- The External Secrets Operator Helm install command used the `external-secrets/external-secrets` chart reference without first adding the official Helm repository. Added `helm repo add external-secrets https://charts.external-secrets.io` and `helm repo update`.
- External Secrets Operator manifests used `external-secrets.io/v1beta1`. Updated the SecretStore and ExternalSecret examples to `external-secrets.io/v1`, matching the current API package in the official documentation.
- The ArgoCD Vault Plugin section said placeholders are replaced "at sync time." Adjusted this to "during manifest generation before ArgoCD syncs the rendered resources," matching Argo CD Config Management Plugin behavior.
- The ArgoCD Vault Plugin example set `AVP_AUTH_TYPE` to `k8s` but omitted the required Kubernetes auth role. Added `AVP_K8S_ROLE`.
- The related-post link pointed to an environment-specific ConfigMaps slug even though the link text referenced Sealed Secrets. Updated it to the existing Sealed Secrets post URL.

## Review Notes
- The remaining examples are illustrative and assume prerequisite cluster resources such as namespaces, AWS credential Secrets, Vault Kubernetes auth configuration, and the ArgoCD Vault Plugin sidecar/config management plugin are already installed and configured.
- ArgoCD Vault Plugin honors Argo CD's `ARGOCD_ENV_` prefix for Application-supplied plugin environment variables, so the Application `plugin.env` example is still valid with current Argo CD behavior.
