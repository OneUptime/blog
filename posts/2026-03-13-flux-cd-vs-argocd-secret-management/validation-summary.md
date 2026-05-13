# Validation Summary: Flux CD vs ArgoCD: Which Has Better Secret Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Argo CD
- SOPS
- age
- Kubernetes Secrets
- External Secrets Operator
- HashiCorp Vault
- Vault Secrets Operator
- argocd-vault-plugin
- Kustomize

## Sources Consulted
- Flux Kustomization decryption documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux SOPS guide: https://fluxcd.io/flux/guides/mozilla-sops/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD Vault Plugin backend documentation: https://argocd-vault-plugin.readthedocs.io/en/stable/backends/
- Argo CD Vault Plugin usage documentation: https://argocd-vault-plugin.readthedocs.io/en/stable/usage/
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/
- HashiCorp Vault Secrets Operator documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/vso
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found
- The description said the post covered Sealed Secrets, but the body covers External Secrets Operator instead. I changed the description to match the actual technical content.
- The Argo CD SOPS example used the old `argocd-cm` `configManagementPlugins` format. Argo CD documentation says that ConfigMap-based plugin installation was deprecated in Argo CD 2.4 and removed in Argo CD 2.8, so I replaced it with the current sidecar Config Management Plugin `plugin.yaml` format.
- The Argo CD SOPS text described `argocd-vault-plugin` as the recommended SOPS approach. The plugin can use SOPS as a backend, but native SOPS-style Kustomize decryption is normally handled through a Config Management Plugin such as KSOPS or a custom repo-server plugin, so I corrected the wording.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Current External Secrets Operator documentation uses `external-secrets.io/v1`, so I updated the manifest API version.
- The comparison table implied argocd-vault-plugin handles rotation like ESO refresh. The plugin documentation says updated secret-manager values require an Argo CD hard refresh and sync, so I clarified that row.

## Review Notes
The Flux SOPS `spec.decryption.provider: sops`, `secretRef`, age key filename, and Kubernetes `kubectl create secret generic --from-file` command are consistent with the official docs. The Argo CD Config Management Plugin snippet is intentionally partial: current Argo CD also requires mounting this `plugin.yaml` into an `argocd-repo-server` sidecar that runs `argocd-cmp-server`.
