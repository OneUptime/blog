# Validation Summary: How to Manage Secrets with ArgoCD and HashiCorp Vault

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Argo CD Config Management Plugins
- Argo CD Vault Plugin
- External Secrets Operator
- HashiCorp Vault
- Vault Kubernetes authentication
- Vault KV v2 secrets
- Vault Database secrets engine
- Kubernetes Secrets and manifests
- Helm

## Sources Consulted
- External Secrets Operator HashiCorp Vault provider documentation: https://external-secrets.io/latest/provider/hashicorp-vault/
- External Secrets Operator VaultDynamicSecret generator documentation: https://external-secrets.io/v2.5.0/api/generator/vault/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD Vault Plugin installation documentation: https://argocd-vault-plugin.readthedocs.io/en/latest/installation/
- Argo CD Vault Plugin configuration documentation: https://argocd-vault-plugin.readthedocs.io/en/stable/config/
- Argo CD Vault Plugin Vault backend documentation: https://argocd-vault-plugin.readthedocs.io/en/stable/backends/
- HashiCorp Vault Kubernetes auth API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- HashiCorp Vault PostgreSQL database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases/postgresql
- HashiCorp Vault database secrets engine documentation: https://developer.hashicorp.com/vault/docs/secrets/databases

## Issues Found
- The description and challenge diagram referenced Vault Agent and CSI driver even though the post covers External Secrets Operator, Argo CD Vault Plugin, and Vault dynamic secrets. Updated those references to match the actual approaches in the post.
- External Secrets Operator examples used `external-secrets.io/v1beta1`. Updated them to the current `external-secrets.io/v1` API shown in current ESO documentation.
- The ESO KV v2 `remoteRef.key` values incorrectly included `secret/data/...` while the `ClusterSecretStore` already sets `path: secret` and `version: v2`. Updated the keys to `production/my-app`.
- The Vault policy only allowed KV reads, but the dynamic database credentials example needs access to `database/creds/my-app`. Added the required read policy path.
- The Vault Kubernetes auth examples did not include an audience. Added `audience=vault` to the Vault role and matching `audiences` entries in ESO service account references for current Vault/ESO guidance.
- The AVP installation snippet mixed the older repo-server binary mount style with the current sidecar CMP model. Updated it to show the plugin sidecar using `argocd-cmp-server`, the CMP ConfigMap mount, and the AVP binary mount in the sidecar.
- The AVP discovery command looked for `<secret`, which would not match the provided placeholder example. Updated it to match AVP path placeholders and `avp.kubernetes.io` annotations.
- The AVP credentials mount referenced the repo-server container, but the plugin runs in the sidecar. Updated it to mount environment variables in the `avp` sidecar.
- The AVP Helm command used shell process substitution under `sh`, which is not portable. Replaced it with a POSIX-compatible temporary values file.
- The dynamic database credentials ESO example used a plain `dataFrom.extract` against `database/creds/my-app`, which is not the current ESO pattern for Vault dynamic secrets. Replaced it with a `VaultDynamicSecret` generator and an `ExternalSecret` that references that generator.
- The monitoring section referenced Vault agent logs, but the post does not configure a Vault Agent sidecar. Updated the command to check the AVP plugin sidecar logs.

## Review Notes
All YAML snippets were parsed successfully, and all bash snippets passed `bash -n` syntax checks. The Argo CD repo-server deployment example is still presented as a patch-style excerpt, consistent with the official AVP and Argo CD documentation examples.
