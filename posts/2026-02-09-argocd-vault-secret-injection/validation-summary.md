# Validation Summary: How to implement ArgoCD with Vault for dynamic secret injection during sync

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- ArgoCD
- argocd-vault-plugin
- HashiCorp Vault
- Vault Kubernetes authentication
- Vault Agent Injector
- Vault Secrets Store CSI Provider
- External Secrets Operator
- Secrets Store CSI Driver
- Stakater Reloader
- Kubernetes Secrets and manifests
- Helm and kubectl

## Sources Consulted
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/config-management-plugins/
- Argo CD v2.4 to v2.5 upgrade notes for argocd-cm CMP deprecation: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.4-2.5/
- argocd-vault-plugin installation documentation: https://argocd-vault-plugin.readthedocs.io/en/stable/installation/
- argocd-vault-plugin configuration documentation: https://argocd-vault-plugin.readthedocs.io/en/latest/config/
- argocd-vault-plugin placeholder documentation: https://argocd-vault-plugin.readthedocs.io/en/stable/howitworks/
- HashiCorp Vault Kubernetes auth documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Agent Injector annotations documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/injector/annotations
- HashiCorp Vault Secrets Store CSI provider installation documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi/installation
- HashiCorp Vault Secrets Store CSI provider configuration documentation: https://developer.hashicorp.com/vault/docs/deploy/kubernetes/csi/configurations
- External Secrets Operator Vault provider documentation: https://external-secrets.io/v2.0.0/provider/hashicorp-vault/
- External Secrets Operator metrics documentation: https://external-secrets.io/v0.7.2/api/metrics/
- Secrets Store CSI Driver Kubernetes Secret sync documentation: https://secrets-store-csi-driver.sigs.k8s.io/topics/sync-as-kubernetes-secret
- Stakater Reloader annotation reference: https://docs.stakater.com/reloader/latest/reference/annotations.html

## Issues Found
- The AVP installation example used the older argocd-cm plugin registration pattern. Updated it to use a config management plugin sidecar, which is the supported pattern for current ArgoCD releases.
- The AVP Secret example used generic placeholders without the required `avp.kubernetes.io/path` annotation. Added the annotation so `<username>`, `<password>`, and `<host>` are resolved correctly.
- The ArgoCD Application example used unsupported AVP environment variables (`AVP_SECRET_NAME` and `AVP_PATH_PREFIX`). Removed those values and kept the plugin reference aligned with AVP configuration docs.
- The External Secrets Operator examples used the older `external-secrets.io/v1beta1` API. Updated `SecretStore` and `ExternalSecret` resources to `external-secrets.io/v1`.
- The External Secrets Operator Vault role reused the ArgoCD repo-server Vault role even though the SecretStore authenticates with its own service account. Added a matching `external-secrets` service account and Vault role, and updated the SecretStore role.
- The Vault Agent Injector and CSI examples used the ArgoCD Vault role while the pods run as `app-sa`. Added an application Vault role and updated the examples to use it.
- The CSI installation example implied a standalone `hashicorp/vault-csi-provider` chart. Replaced it with the documented installation path using the Secrets Store CSI driver and the HashiCorp Vault Helm chart with `csi.enabled=true`.
- The CSI example referenced a Kubernetes Secret in `secretKeyRef` without configuring `secretObjects`. Added `secretObjects` so the mounted values are also synced to a Kubernetes Secret for environment variable use.
- The Prometheus alert used the wrong ESO metric name (`external_secrets_sync_calls_error`). Corrected it to `externalsecret_sync_calls_error`.
- The CSI install command block was marked as YAML even though it contained shell commands. Changed the fence to `bash`.

## Review Notes
The examples are technically aligned with current documentation, but a production deployment should still pin chart versions, use TLS for Vault URLs, avoid example secrets that resemble real tokens, and account for Vault Kubernetes auth audience requirements in newer Vault versions.
